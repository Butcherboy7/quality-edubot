document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsDropdownBtn = document.getElementById('suggestions-dropdown-btn');
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    const suggestionsList = document.getElementById('suggestions');
    const personaSelector = document.getElementById('persona-selector');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    
    // API Status Elements
    const geminiStatusIndicator = document.getElementById('gemini-status');
    const whisperStatusIndicator = document.getElementById('whisper-status');
    
    // Function buttons
    const summarizeBtn = document.getElementById('summarize-btn');
    const simplifyBtn = document.getElementById('simplify-btn');
    const elaborateBtn = document.getElementById('elaborate-btn');
    const examplesBtn = document.getElementById('examples-btn');
    
    // Templates
    const userMessageTemplate = document.getElementById('user-message-template');
    const botMessageTemplate = document.getElementById('bot-message-template');
    const typingIndicatorTemplate = document.getElementById('typing-indicator-template');
    
    // Initial suggestions
    const initialSuggestions = document.querySelectorAll('.suggestion-btn');
    
    // Chat state
    let conversationHistory = [];
    let lastMessageText = '';
    let isWaitingForResponse = false;
    
    // API key state
    let hasGeminiKey = false;
    let hasWhisperKey = false;
    
    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
    
    // Handle Enter key press to send message
    userInput.addEventListener('keydown', (e) => {
        // Check if Enter key is pressed without Shift key
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default behavior (new line)
            chatForm.dispatchEvent(new Event('submit')); // Trigger form submission
        }
    });
    
    // Load conversation from localStorage
    function loadConversation() {
        const savedConversation = localStorage.getItem('EduBuddyConversation');
        if (savedConversation) {
            conversationHistory = JSON.parse(savedConversation);
            
            // Render saved messages
            conversationHistory.forEach(message => {
                if (message.sender === 'user') {
                    appendUserMessage(message.text);
                } else {
                    appendBotMessage(message.text, message.suggestions || []);
                }
            });
            
            // Show suggestions if there are bot messages
            const botMessages = conversationHistory.filter(msg => msg.sender === 'bot');
            if (botMessages.length > 0) {
                const lastBotMessage = botMessages[botMessages.length - 1];
                updateSuggestions(lastBotMessage.suggestions || []);
            }
        }
    }
    
    // Save conversation to localStorage
    function saveConversation() {
        localStorage.setItem('EduBuddyConversation', JSON.stringify(conversationHistory));
    }
    
    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message || isWaitingForResponse) return;
        
        // Clear input and reset height
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Send message
        await sendMessage(message);
    });
    
    // Handle suggestion clicks
    function setupSuggestionListeners() {
        initialSuggestions.forEach(btn => {
            btn.addEventListener('click', async () => {
                const message = btn.textContent.trim();
                await sendMessage(message);
            });
        });
    }
    
    // Update suggestions with new ones - using dropdown menu
    function updateSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            suggestionsContainer.classList.add('hidden');
            return;
        }
        
        // Clear previous suggestions
        suggestionsList.innerHTML = '';
        
        // Add new suggestions to the dropdown menu
        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
            btn.setAttribute('role', 'menuitem');
            btn.textContent = suggestion;
            
            btn.addEventListener('click', async () => {
                await sendMessage(suggestion);
                // Close dropdown after selecting an item
                suggestionsDropdown.classList.add('hidden');
                suggestionsDropdownBtn.setAttribute('aria-expanded', 'false');
            });
            
            suggestionsList.appendChild(btn);
        });
        
        // Update the dropdown button text to show number of suggestions
        suggestionsDropdownBtn.querySelector('span').textContent = `Follow-up Questions (${suggestions.length})`;
        
        // Show suggestions container
        suggestionsContainer.classList.remove('hidden');
    }
    
    // Send message to API and handle response
    async function sendMessage(message) {
        // Don't send if already waiting for a response
        if (isWaitingForResponse) return;
        
        isWaitingForResponse = true;
        lastMessageText = message;
        
        // Append user message to chat
        appendUserMessage(message);
        
        // Add to conversation history
        conversationHistory.push({
            sender: 'user',
            text: message
        });
        
        // Save conversation
        saveConversation();
        
        // Hide suggestions and welcome container
        suggestionsContainer.classList.add('hidden');
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.display = 'none';
        }
        
        // Show typing indicator
        const typingIndicator = appendTypingIndicator();
        
        try {
            // Get selected persona
            const persona = personaSelector.value;
            
            // Send request to backend
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    persona,
                    history: conversationHistory
                })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            if (response.ok) {
                // Append bot message
                appendBotMessage(data.message, data.suggestions);
                
                // Add to conversation history
                conversationHistory.push({
                    sender: 'bot',
                    text: data.message,
                    suggestions: data.suggestions
                });
                
                // Save conversation
                saveConversation();
                
                // Update suggestions
                updateSuggestions(data.suggestions);
            } else {
                // Handle error response
                appendBotMessage(data.message || 'Oops! Something went wrong. Please try again.', []);
            }
        } catch (error) {
            console.error('Error:', error);
            
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Show error message
            appendBotMessage('Oops! Something went wrong. Please check your connection and try again.', []);
        } finally {
            isWaitingForResponse = false;
        }
    }
    
    // Append user message to chat
    function appendUserMessage(message) {
        const messageEl = userMessageTemplate.content.cloneNode(true);
        messageEl.querySelector('.message-text').textContent = message;
        
        messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }
    
    // Append bot message to chat with Markdown and code syntax highlighting
    function appendBotMessage(message, suggestions) {
        const messageEl = botMessageTemplate.content.cloneNode(true);
        const messageTextEl = messageEl.querySelector('.message-text');
        
        // Configure Marked.js with highlight.js for syntax highlighting
        marked.setOptions({
            highlight: function(code, lang) {
                return hljs.highlightAuto(code, [lang]).value;
            },
            breaks: true,           // Enable line breaks
            gfm: true,              // Enable GitHub Flavored Markdown
            headerIds: false,       // Disable header IDs
            mangle: false,          // Disable mangling of email links
            sanitize: false,        // Allow raw HTML
            smartLists: true,       // Enable smarter list behavior
            smartypants: true,      // Enable smart punctuation
            xhtml: false            // Disable XHTML compliance
        });
        
        // Render Markdown content
        messageTextEl.innerHTML = marked.parse(message);
        
        // Add copy functionality
        const copyBtn = messageEl.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(message).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
        
        // Add retry functionality
        const retryBtn = messageEl.querySelector('.retry-btn');
        retryBtn.addEventListener('click', async () => {
            // Remove this bot message and the user message before it
            const allMessages = document.querySelectorAll('.message');
            const lastBotMessageEl = allMessages[allMessages.length - 1];
            const lastUserMessageEl = allMessages[allMessages.length - 2];
            
            if (lastBotMessageEl && lastUserMessageEl) {
                lastBotMessageEl.remove();
                
                // Remove the last items from conversation history
                if (conversationHistory.length >= 2) {
                    conversationHistory.pop(); // Remove bot message
                    // Don't remove user message, we're going to resend it
                }
                
                // Save conversation
                saveConversation();
                
                // Resend the last user message
                await sendMessage(lastMessageText);
            }
        });
        
        messagesContainer.appendChild(messageEl);
        
        // Apply syntax highlighting to code blocks
        messageEl.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        scrollToBottom();
        
        return messageEl;
    }
    
    // Append typing indicator
    function appendTypingIndicator() {
        const indicatorEl = typingIndicatorTemplate.content.cloneNode(true);
        messagesContainer.appendChild(indicatorEl);
        scrollToBottom();
        
        return messagesContainer.lastElementChild;
    }
    
    // Scroll to bottom of chat
    function scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Function buttons handlers
    function getLastBotMessage() {
        const botMessages = conversationHistory.filter(msg => msg.sender === 'bot');
        if (botMessages.length === 0) return null;
        return botMessages[botMessages.length - 1].text;
    }
    
    // Summarize button
    summarizeBtn.addEventListener('click', async () => {
        const lastBotMessage = getLastBotMessage();
        if (!lastBotMessage) return;
        
        const message = `Please summarize this concisely: "${lastBotMessage}"`;
        await sendMessage(message);
    });
    
    // Simplify button
    simplifyBtn.addEventListener('click', async () => {
        const lastBotMessage = getLastBotMessage();
        if (!lastBotMessage) return;
        
        const message = `Please explain this in simpler terms for a beginner: "${lastBotMessage}"`;
        await sendMessage(message);
    });
    
    // Elaborate button
    elaborateBtn.addEventListener('click', async () => {
        const lastBotMessage = getLastBotMessage();
        if (!lastBotMessage) return;
        
        const message = `Please elaborate more on this topic: "${lastBotMessage}"`;
        await sendMessage(message);
    });
    
    // Examples button
    examplesBtn.addEventListener('click', async () => {
        const lastBotMessage = getLastBotMessage();
        if (!lastBotMessage) return;
        
        const message = `Please provide practical examples related to: "${lastBotMessage}"`;
        await sendMessage(message);
    });
    
    // Suggestions dropdown toggle
    suggestionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = suggestionsDropdownBtn.getAttribute('aria-expanded') === 'true';
        suggestionsDropdownBtn.setAttribute('aria-expanded', !isExpanded);
        suggestionsDropdown.classList.toggle('hidden');
    });
    
    // Close suggestions dropdown when clicking elsewhere
    document.addEventListener('click', () => {
        if (suggestionsDropdownBtn) {
            suggestionsDropdownBtn.setAttribute('aria-expanded', 'false');
            suggestionsDropdown.classList.add('hidden');
        }
    });
    
    // Prevent click on suggestions dropdown from closing it
    suggestionsDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // API status handling
    async function checkApiKeys() {
        try {
            // Check API status from server
            const response = await fetch('/api_status');
            const data = await response.json();
            
            // Update status indicators
            hasGeminiKey = data.gemini_configured;
            hasWhisperKey = data.whisper_configured;
            
            updateApiStatusIndicators();
        } catch (error) {
            console.error('Error checking API status:', error);
            hasGeminiKey = false;
            hasWhisperKey = false;
            updateApiStatusIndicators();
        }
    }
    
    function updateApiStatusIndicators() {
        // If both APIs are configured, hide the indicators entirely
        if (hasGeminiKey && hasWhisperKey) {
            geminiStatusIndicator.classList.add('hidden');
            whisperStatusIndicator.classList.add('hidden');
            return;
        }
        
        // Otherwise, show indicators for APIs that aren't configured
        
        // Update Gemini API status
        if (hasGeminiKey) {
            geminiStatusIndicator.classList.add('hidden');
        } else {
            geminiStatusIndicator.classList.remove('hidden');
            geminiStatusIndicator.classList.remove('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
            geminiStatusIndicator.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
            geminiStatusIndicator.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i> Gemini API not configured';
        }
        
        // Update Whisper API status
        if (hasWhisperKey) {
            whisperStatusIndicator.classList.add('hidden');
        } else {
            whisperStatusIndicator.classList.remove('hidden');
            whisperStatusIndicator.classList.remove('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
            whisperStatusIndicator.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
            whisperStatusIndicator.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i> Whisper API not configured';
        }
    }
    
    // Status indicators are now just informational, no click actions
    
    // Handle subject-specific suggestion changes
    personaSelector.addEventListener('change', () => {
        const selectedSubject = personaSelector.value;
        
        // Hide all subject suggestions
        document.querySelectorAll('.subject-suggestions').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show the selected subject's suggestions
        const selectedSuggestions = document.getElementById(`${selectedSubject}-suggestions`);
        if (selectedSuggestions) {
            selectedSuggestions.classList.remove('hidden');
        }
    });
    
    // Clear Chat functionality
    clearChatBtn.addEventListener('click', () => {
        // Show confirmation dialog
        if (confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
            // Clear conversation history
            conversationHistory = [];
            localStorage.removeItem('EduBuddyConversation');
            
            // Clear messages from UI
            messagesContainer.innerHTML = '';
            
            // Hide suggestions
            suggestionsContainer.classList.add('hidden');
            
            // Show welcome message
            const welcomeContainer = document.querySelector('.welcome-container');
            if (welcomeContainer) {
                welcomeContainer.style.display = 'block';
            }
            
            // Focus input field
            userInput.focus();
        }
    });
    
    // Initialize
    setupSuggestionListeners();
    loadConversation();
    checkApiKeys();
    
    // Focus input field
    userInput.focus();
});
