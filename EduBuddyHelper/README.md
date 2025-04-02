# EduBuddy - AI Educational Assistant

EduBuddy is an interactive educational AI chatbot designed to provide engaging learning experiences through intelligent conversation and adaptive learning support.

## Features

- **Subject-Specific Expertise**: Get help with STEM, Coding, Business, General Learning, and Language Arts
- **Interactive Chat Interface**: Modern, ChatGPT-inspired UI with dark/light mode
- **Voice Input**: Record your questions for a more natural interaction experience
- **Follow-up Suggestions**: Smart follow-up questions to continue your learning journey
- **Functional Buttons**: Quick actions for summarizing, simplifying, elaborating, or requesting examples
- **Syntax Highlighting**: Beautiful code formatting for programming explanations
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **AI Integration**: Google's Gemini API for chat functionality, OpenAI Whisper for voice-to-text
- **Deployment**: Ready for Render, Heroku, or any platform supporting Python web applications

## Deployment on Render

1. Fork this repository to your GitHub account
2. Sign up for [Render](https://render.com/)
3. Create a new Web Service and connect your GitHub repo
4. Use the following settings:
   - Build Command: `pip install -r render-requirements.txt`
   - Start Command: `gunicorn main:app`
5. Add the required environment variables:
   - `GOOGLE_API_KEY` - Your Google API key for Gemini
   - `OPENAI_API_KEY` - Your OpenAI API key for Whisper voice processing
   - `SESSION_SECRET` - A random string for Flask session security

## Local Development

1. Clone the repository
2. Create a `.env` file with the required API keys (see above)
3. Install dependencies:
   ```
   pip install -r render-requirements.txt
   ```
4. Run the application:
   ```
   python main.py
   ```
5. Access at http://localhost:5000

## License

MIT License

## Credits

Created with ❤️ for educational purposes.