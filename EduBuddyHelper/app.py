import os
import json
import logging
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import requests
from io import BytesIO
import base64

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

# Configure Google Gemini API
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
if GOOGLE_API_KEY:
    logger.info("Google API Key found and configured")
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("No Google API Key found. Gemini functionality will not work.")

# Configure OpenAI API (for Whisper)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if OPENAI_API_KEY:
    logger.info("OpenAI API Key found and configured")
else:
    logger.warning("No OpenAI API Key found. Voice-to-text functionality will not work.")

# Use environment variables for API keys
# These keys are now managed by the application owner, not individual users

# Subject-specific persona prompts
PERSONAS = {
    "stem": "You are an expert in Science, Technology, Engineering, and Mathematics (STEM). You have deep knowledge in physics, chemistry, biology, mathematics, and related fields. Explain complex concepts with clarity, using analogies and examples that make scientific and mathematical ideas accessible. Include relevant formulas and theories when helpful, and don't shy away from technical details when appropriate.",
    
    "coding": "You are a software development expert with experience in multiple programming languages and paradigms. You understand best practices in coding, algorithms, data structures, and software architecture. Provide code examples when appropriate, explain programming concepts clearly, and offer troubleshooting advice for coding challenges. Focus on practical, implementable solutions alongside theoretical explanations.",
    
    "business": "You are a business education specialist with expertise in management, marketing, finance, entrepreneurship, and economics. Explain business concepts with relevant real-world examples and case studies. Your advice is practical and applicable, balancing theory with actionable strategies. Help users understand business principles, analyze cases, and develop business thinking skills.",
    
    "general": "You are a learning coach focusing on general education, study skills, and learning strategies. You help students develop effective learning habits, understand diverse subjects, and connect ideas across disciplines. Your approach emphasizes critical thinking, information literacy, and metacognition. Provide guidance on how to learn effectively alongside subject-specific explanations.",
    
    "language": "You are a language arts and humanities specialist with expertise in literature, writing, communication, and the arts. Help users improve their writing skills, analyze texts, understand literary concepts, and develop communication abilities. Provide examples from literature and culture when relevant, and offer constructive feedback on writing and language use."
}

# Home route
@app.route('/')
def home():
    return render_template('index.html')

# Ask route for chat interactions
@app.route('/ask', methods=['POST'])
def ask():
    try:
        # Get request data
        data = request.json
        user_message = data.get('message', '')
        persona = data.get('persona', 'teacher')
        conversation_history = data.get('history', [])
        
        logger.debug(f"Received message: {user_message}, persona: {persona}")
        
        if not user_message:
            return jsonify({
                "error": "No message provided",
                "message": "Please provide a message to continue the conversation."
            }), 400
            
        if not GOOGLE_API_KEY:
            return jsonify({
                "error": "API key not configured",
                "message": "The Google Gemini API key is not configured. Please contact the administrator."
            }), 500
        
        # Prepare conversation context
        prompt_prefix = PERSONAS.get(persona, PERSONAS['general'])
        
        # Configure the model - Using gemini-1.5-pro instead of gemini-pro
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Format conversation history for the API
        formatted_history = []
        
        # Add the conversation history (Gemini doesn't support system role)
        # First add a user message with the persona instruction
        formatted_history.append({"role": "user", "parts": ["I want you to act as: " + prompt_prefix]})
        formatted_history.append({"role": "model", "parts": ["I understand. I'll act as described. How can I help you?"]})
        
        # Then add the rest of the conversation history
        for msg in conversation_history:
            role = "user" if msg.get('sender') == 'user' else "model"
            formatted_history.append({"role": role, "parts": [msg.get('text', '')]})
        
        # Add the current message
        formatted_history.append({"role": "user", "parts": [user_message]})
        
        # Generate response
        response = model.generate_content(formatted_history)
        bot_response = response.text
        
        # Generate follow-up suggestions (using a separate prompt)
        follow_up_prompt = [
            {"role": "user", "parts": [f"Based on this conversation where the last response was: '{bot_response}', suggest 3 brief follow-up questions that would naturally continue the discussion. Format them as a JSON array of strings. Just return the JSON array, nothing else."]}
        ]
        
        try:
            # Use the same model instance for follow-up questions
            follow_up_response = model.generate_content(follow_up_prompt)
            # Extract JSON array from response
            suggestions_text = follow_up_response.text
            # Clean up the response to extract just the JSON part
            suggestions_text = suggestions_text.strip()
            if suggestions_text.startswith("```json"):
                suggestions_text = suggestions_text[7:]
            if suggestions_text.endswith("```"):
                suggestions_text = suggestions_text[:-3]
            suggestions_text = suggestions_text.strip()
            
            suggestions = json.loads(suggestions_text)
        except Exception as e:
            logger.error(f"Error generating follow-up suggestions: {e}")
            suggestions = [
                "Can you explain that in more detail?",
                "What's an example of this concept?",
                "How does this relate to other topics?"
            ]
        
        return jsonify({
            "message": bot_response,
            "suggestions": suggestions
        })
        
    except Exception as e:
        logger.error(f"Error in /ask endpoint: {e}")
        return jsonify({
            "error": "Something went wrong",
            "message": "Oops! Something went wrong. Please try again."
        }), 500

# Whisper route for voice-to-text
@app.route('/whisper', methods=['POST'])
def whisper():
    try:
        if not OPENAI_API_KEY:
            return jsonify({
                "error": "API key not configured",
                "message": "The OpenAI API key for voice-to-text is not configured. Please contact the administrator."
            }), 500
            
        # Get audio data from request
        audio_data = request.json.get('audio')
        
        if not audio_data:
            return jsonify({
                "error": "No audio data",
                "message": "No audio data received. Please try again."
            }), 400
            
        # Convert base64 to binary
        audio_binary = base64.b64decode(audio_data.split(',')[1])
        
        # Prepare the API request to OpenAI Whisper
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        files = {
            "file": ("audio.webm", BytesIO(audio_binary), "audio/webm"),
            "model": (None, "whisper-1")
        }
        
        # Send request to OpenAI
        response = requests.post(url, headers=headers, files=files)
        
        if response.status_code == 200:
            result = response.json()
            transcription = result.get("text", "")
            return jsonify({"transcription": transcription})
        else:
            logger.error(f"Error from Whisper API: {response.text}")
            return jsonify({
                "error": "Transcription failed",
                "message": "Failed to transcribe audio. Please try again."
            }), 500
            
    except Exception as e:
        logger.error(f"Error in /whisper endpoint: {e}")
        return jsonify({
            "error": "Something went wrong",
            "message": "Oops! Something went wrong with voice transcription. Please try again."
        }), 500

# API status route - to check if APIs are configured
@app.route('/api_status', methods=['GET'])
def api_status():
    return jsonify({
        "gemini_configured": bool(GOOGLE_API_KEY),
        "whisper_configured": bool(OPENAI_API_KEY)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
