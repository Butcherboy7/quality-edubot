document.addEventListener('DOMContentLoaded', () => {
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const userInput = document.getElementById('user-input');
    const recordingIndicator = document.getElementById('recording-indicator');
    
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    
    // Check if browser supports speech recognition
    const supportsRecording = !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
    
    if (!supportsRecording) {
        voiceInputBtn.disabled = true;
        voiceInputBtn.title = 'Voice recording not supported in your browser';
        voiceInputBtn.classList.add('opacity-50');
    }
    
    // Handle voice recording
    voiceInputBtn.addEventListener('click', async () => {
        if (!supportsRecording) return;
        
        if (!isRecording) {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                startRecording(stream);
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Could not access your microphone. Please check your permissions and try again.');
            }
        } else {
            // Stop recording
            stopRecording();
        }
    });
    
    // Start voice recording
    function startRecording(stream) {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await transcribeAudio(audioBlob);
            
            // Stop all tracks to release the microphone
            stream.getTracks().forEach(track => track.stop());
        });
        
        // Start recording
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        voiceInputBtn.innerHTML = '<i class="fas fa-stop"></i>';
        voiceInputBtn.classList.add('text-red-500');
        recordingIndicator.classList.remove('hidden');
    }
    
    // Stop voice recording
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            
            // Update UI
            voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceInputBtn.classList.remove('text-red-500');
            recordingIndicator.classList.add('hidden');
        }
    }
    
    // Transcribe audio using the backend API
    async function transcribeAudio(audioBlob) {
        try {
            // Show loading state
            userInput.disabled = true;
            userInput.placeholder = 'Transcribing your voice...';
            
            // Convert audio blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
                try {
                    const base64Audio = reader.result;
                    
                    // Send to backend
                    const response = await fetch('/whisper', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ audio: base64Audio })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.transcription) {
                        // Set transcribed text to input
                        userInput.value = data.transcription;
                        
                        // Trigger input event to resize textarea
                        const inputEvent = new Event('input', { bubbles: true });
                        userInput.dispatchEvent(inputEvent);
                        
                        // Focus on input
                        userInput.focus();
                    } else {
                        console.error('Transcription error:', data.message);
                        
                        // Display error in the input field instead of an alert
                        userInput.value = "Failed to transcribe audio. Please type your message instead.";
                        
                        // Trigger input event to resize textarea
                        const inputEvent = new Event('input', { bubbles: true });
                        userInput.dispatchEvent(inputEvent);
                        
                        // Focus and select the input text for easy replacement
                        userInput.focus();
                        userInput.select();
                    }
                } catch (error) {
                    console.error('Error in transcription process:', error);
                    
                    // Display error in the input field
                    userInput.value = "Voice transcription failed. Please type your message instead.";
                    
                    // Trigger input event to resize textarea
                    const inputEvent = new Event('input', { bubbles: true });
                    userInput.dispatchEvent(inputEvent);
                    
                    // Focus and select the input text for easy replacement
                    userInput.focus();
                    userInput.select();
                } finally {
                    // Reset input state
                    userInput.disabled = false;
                    userInput.placeholder = 'Ask EduBuddy anything...';
                }
            };
        } catch (error) {
            console.error('Error starting transcription:', error);
            
            // Reset input state
            userInput.disabled = false;
            userInput.placeholder = 'Ask EduBuddy anything...';
            
            // Display error in the input field
            userInput.value = "Failed to process audio. Please type your message instead.";
            
            // Trigger input event to resize textarea
            const inputEvent = new Event('input', { bubbles: true });
            userInput.dispatchEvent(inputEvent);
            
            // Focus and select the input text for easy replacement
            userInput.focus();
            userInput.select();
        }
    }
});
