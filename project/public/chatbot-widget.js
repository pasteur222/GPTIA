/**
 * MTN GPT Chatbot Widget
 * Embeddable customer service chatbot for external websites
 * Version: 2.0.0 - Enhanced with proper session management and security
 */

(function() {
  'use strict';

  // Configuration from script tag data attributes
  const script = document.currentScript || document.querySelector('script[data-user-id]');
  const config = {
    userId: script?.dataset.userId || '',
    color: script?.dataset.color || '#ffcc00',
    title: script?.dataset.title || 'Service Client',
    position: script?.dataset.position || 'right',
    apiUrl: script?.dataset.apiUrl || 'https://tyeysspawsupdgaowrec.supabase.co/functions/v1/api-chatbot',
    apiKey: script?.dataset.apiKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZXlzc3Bhd3N1cGRnYW93cmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNjg4NDIsImV4cCI6MjA1OTk0NDg0Mn0.DcV5OORxfNrQ6EdyimMOyT_SyDH0gC1RcRWH2E-JqhA',
    maxRetries: 3,
    retryDelay: 1000
  };

  // Session management
  class ChatbotSession {
    constructor() {
      this.webUserId = this.getOrCreateWebUserId();
      this.sessionId = this.getOrCreateSessionId();
      this.conversationHistory = this.loadConversationHistory();
      this.messageQueue = [];
      this.isOnline = navigator.onLine;
      this.setupNetworkListeners();
    }

    getOrCreateWebUserId() {
      let webUserId = localStorage.getItem('mtn-gpt-web-user-id');
      if (!webUserId) {
        webUserId = 'web_' + this.generateUUID();
        localStorage.setItem('mtn-gpt-web-user-id', webUserId);
      }
      return webUserId;
    }

    getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem('mtn-gpt-session-id');
      if (!sessionId) {
        sessionId = 'session_' + this.generateUUID();
        sessionStorage.setItem('mtn-gpt-session-id', sessionId);
      }
      return sessionId;
    }

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    loadConversationHistory() {
      try {
        const history = localStorage.getItem(`mtn-gpt-history-${this.webUserId}`);
        const parsed = history ? JSON.parse(history) : [];
        // Limit history to last 50 messages to prevent storage bloat
        return parsed.slice(-50);
      } catch (error) {
        console.error('Error loading conversation history:', error);
        return [];
      }
    }

    saveConversationHistory() {
      try {
        // Keep only last 50 messages
        const limitedHistory = this.conversationHistory.slice(-50);
        localStorage.setItem(`mtn-gpt-history-${this.webUserId}`, JSON.stringify(limitedHistory));
      } catch (error) {
        console.error('Error saving conversation history:', error);
      }
    }

    addMessage(message, sender) {
      const messageObj = {
        id: Date.now() + Math.random(),
        message: this.sanitizeMessage(message),
        sender,
        timestamp: new Date().toISOString()
      };
      
      this.conversationHistory.push(messageObj);
      this.saveConversationHistory();
      return messageObj;
    }

    sanitizeMessage(message) {
      // Basic XSS prevention
      return String(message)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    setupNetworkListeners() {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processMessageQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }

    addToQueue(message) {
      this.messageQueue.push({
        message,
        timestamp: Date.now()
      });
    }

    async processMessageQueue() {
      if (!this.isOnline || this.messageQueue.length === 0) return;

      const queuedMessages = [...this.messageQueue];
      this.messageQueue = [];

      for (const item of queuedMessages) {
        try {
          // Only process messages that are less than 5 minutes old
          if (Date.now() - item.timestamp < 5 * 60 * 1000) {
            await this.sendMessage(item.message, true);
          }
        } catch (error) {
          console.error('Error processing queued message:', error);
        }
      }
    }
  }

  // Chatbot UI class
  class ChatbotWidget {
    constructor() {
      this.session = new ChatbotSession();
      this.isOpen = false;
      this.isLoading = false;
      this.retryCount = 0;
      this.init();
    }

    init() {
      this.createStyles();
      this.createWidget();
      this.attachEventListeners();
      this.loadConversationHistory();
      this.setupErrorHandling();
    }

    createStyles() {
      const styles = `
        .mtn-chatbot-widget {
          position: fixed;
          bottom: 20px;
          ${config.position}: 20px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .mtn-chatbot-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: ${config.color};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }

        .mtn-chatbot-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .mtn-chatbot-button.offline {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mtn-chatbot-button svg {
          width: 24px;
          height: 24px;
          fill: white;
        }

        .mtn-chatbot-notification {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background-color: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          animation: mtn-pulse 2s infinite;
        }

        @keyframes mtn-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .mtn-chatbot-window {
          position: absolute;
          bottom: 80px;
          ${config.position}: 0;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .mtn-chatbot-window.open {
          display: flex;
          animation: mtn-slideUp 0.3s ease-out;
        }

        @keyframes mtn-slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mtn-chatbot-header {
          background-color: ${config.color};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mtn-chatbot-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .mtn-chatbot-status {
          font-size: 12px;
          opacity: 0.9;
        }

        .mtn-chatbot-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .mtn-chatbot-close:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .mtn-chatbot-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f9fafb;
        }

        .mtn-chatbot-message {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
          animation: mtn-messageSlide 0.3s ease-out;
        }

        @keyframes mtn-messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mtn-chatbot-message.user {
          background-color: ${config.color};
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }

        .mtn-chatbot-message.bot {
          background-color: white;
          color: #333;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .mtn-chatbot-message.error {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .mtn-chatbot-message.system {
          background-color: #f3f4f6;
          color: #6b7280;
          align-self: center;
          font-style: italic;
          font-size: 12px;
        }

        .mtn-chatbot-input-container {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
          display: flex;
          gap: 8px;
        }

        .mtn-chatbot-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .mtn-chatbot-input:focus {
          border-color: ${config.color};
          box-shadow: 0 0 0 3px ${config.color}20;
        }

        .mtn-chatbot-input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .mtn-chatbot-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: ${config.color};
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .mtn-chatbot-send:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .mtn-chatbot-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .mtn-chatbot-send svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        .mtn-chatbot-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }

        .mtn-chatbot-typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #9ca3af;
          animation: mtn-typing 1.4s infinite ease-in-out;
        }

        .mtn-chatbot-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .mtn-chatbot-typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes mtn-typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        .mtn-chatbot-retry {
          background-color: #f59e0b;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          margin-top: 8px;
        }

        .mtn-chatbot-retry:hover {
          background-color: #d97706;
        }

        @media (max-width: 480px) {
          .mtn-chatbot-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
            bottom: 80px;
            ${config.position}: 20px;
          }
          
          .mtn-chatbot-button {
            width: 50px;
            height: 50px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mtn-chatbot-button,
          .mtn-chatbot-window,
          .mtn-chatbot-message {
            animation: none;
            transition: none;
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const widget = document.createElement('div');
      widget.className = 'mtn-chatbot-widget';
      widget.innerHTML = `
        <button class="mtn-chatbot-button" id="mtn-chatbot-toggle" aria-label="Ouvrir le chat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <div class="mtn-chatbot-notification" id="mtn-chatbot-notification" style="display: none;">!</div>
        </button>
        
        <div class="mtn-chatbot-window" id="mtn-chatbot-window" role="dialog" aria-labelledby="mtn-chatbot-title">
          <div class="mtn-chatbot-header">
            <div>
              <h3 id="mtn-chatbot-title">${this.escapeHtml(config.title)}</h3>
              <div class="mtn-chatbot-status" id="mtn-chatbot-status">En ligne</div>
            </div>
            <button class="mtn-chatbot-close" id="mtn-chatbot-close" aria-label="Fermer le chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="mtn-chatbot-messages" id="mtn-chatbot-messages" role="log" aria-live="polite">
            <div class="mtn-chatbot-message bot">
              Bonjour ! Comment puis-je vous aider aujourd'hui ?
            </div>
          </div>
          
          <div class="mtn-chatbot-input-container">
            <input 
              type="text" 
              class="mtn-chatbot-input" 
              id="mtn-chatbot-input" 
              placeholder="Tapez votre message..."
              maxlength="1000"
              aria-label="Message"
            />
            <button class="mtn-chatbot-send" id="mtn-chatbot-send" aria-label="Envoyer le message">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(widget);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    attachEventListeners() {
      const toggleButton = document.getElementById('mtn-chatbot-toggle');
      const closeButton = document.getElementById('mtn-chatbot-close');
      const sendButton = document.getElementById('mtn-chatbot-send');
      const input = document.getElementById('mtn-chatbot-input');

      toggleButton?.addEventListener('click', () => this.toggleWidget());
      closeButton?.addEventListener('click', () => this.closeWidget());
      sendButton?.addEventListener('click', () => this.handleSendMessage());
      
      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      // Auto-resize for mobile
      window.addEventListener('resize', () => this.handleResize());
      
      // Handle visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.session.messageQueue.length > 0) {
          this.session.processMessageQueue();
        }
      });
    }

    setupErrorHandling() {
      window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('chatbot-widget')) {
          console.error('Chatbot widget error:', event.error);
          this.showSystemMessage('Une erreur technique est survenue. Veuillez actualiser la page.');
        }
      });

      // Update online status
      this.updateConnectionStatus();
      setInterval(() => this.updateConnectionStatus(), 30000); // Check every 30 seconds
    }

    updateConnectionStatus() {
      const statusElement = document.getElementById('mtn-chatbot-status');
      const toggleButton = document.getElementById('mtn-chatbot-toggle');
      
      if (this.session.isOnline) {
        if (statusElement) statusElement.textContent = 'En ligne';
        if (toggleButton) toggleButton.classList.remove('offline');
      } else {
        if (statusElement) statusElement.textContent = 'Hors ligne';
        if (toggleButton) toggleButton.classList.add('offline');
        this.showSystemMessage('Connexion perdue. Vos messages seront envoyés dès le retour de la connexion.');
      }
    }

    toggleWidget() {
      if (this.isOpen) {
        this.closeWidget();
      } else {
        this.openWidget();
      }
    }

    openWidget() {
      const window = document.getElementById('mtn-chatbot-window');
      window?.classList.add('open');
      this.isOpen = true;
      
      // Hide notification
      const notification = document.getElementById('mtn-chatbot-notification');
      if (notification) notification.style.display = 'none';
      
      // Focus input
      const input = document.getElementById('mtn-chatbot-input');
      setTimeout(() => input?.focus(), 100);
      
      // Mark as read
      this.markMessagesAsRead();
    }

    closeWidget() {
      const window = document.getElementById('mtn-chatbot-window');
      window?.classList.remove('open');
      this.isOpen = false;
    }

    loadConversationHistory() {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (!messagesContainer) return;

      // Clear existing messages except welcome message
      const welcomeMessage = messagesContainer.querySelector('.mtn-chatbot-message.bot');
      messagesContainer.innerHTML = '';
      if (welcomeMessage) {
        messagesContainer.appendChild(welcomeMessage);
      }

      // Load history (last 10 messages only for UI)
      const recentHistory = this.session.conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        this.displayMessage(msg.message, msg.sender, false);
      });

      this.scrollToBottom();
    }

    async handleSendMessage() {
      const input = document.getElementById('mtn-chatbot-input');
      const message = input?.value.trim();
      
      if (!message || this.isLoading) return;

      // Validate message length
      if (message.length > 1000) {
        this.showSystemMessage('Message trop long. Veuillez limiter à 1000 caractères.');
        return;
      }

      // Clear input and disable send button
      input.value = '';
      this.setLoading(true);

      // Display user message
      this.displayMessage(message, 'user');
      this.session.addMessage(message, 'user');

      // Check if online
      if (!this.session.isOnline) {
        this.session.addToQueue(message);
        this.showSystemMessage('Message mis en file d\'attente. Il sera envoyé dès le retour de la connexion.');
        this.setLoading(false);
        return;
      }

      await this.sendMessage(message);
    }

    async sendMessage(message, isRetry = false) {
      if (!isRetry) {
        this.showTypingIndicator();
      }

      try {
        const response = await this.callChatbotAPI(message);
        
        this.hideTypingIndicator();
        this.displayMessage(response, 'bot');
        this.session.addMessage(response, 'bot');
        this.retryCount = 0; // Reset retry count on success

        // Show notification if widget is closed
        if (!this.isOpen) {
          this.showNotification();
        }

      } catch (error) {
        console.error('Chatbot API error:', error);
        this.hideTypingIndicator();
        
        if (this.retryCount < config.maxRetries) {
          this.retryCount++;
          this.showRetryMessage(message, error.message);
        } else {
          const errorMessage = this.getErrorMessage(error);
          this.displayMessage(errorMessage, 'bot', true);
          this.session.addMessage(errorMessage, 'bot');
          this.retryCount = 0;
        }
      } finally {
        this.setLoading(false);
      }
    }

    async callChatbotAPI(message) {
      const payload = {
        webUserId: this.session.webUserId,
        sessionId: this.session.sessionId,
        source: 'web',
        text: message,
        chatbotType: 'client',
        userAgent: navigator.userAgent
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'API returned unsuccessful response');
        }

        return data.response || 'Réponse non disponible';
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Délai d\'attente dépassé. Veuillez réessayer.');
        }
        
        throw error;
      }
    }

    getErrorMessage(error) {
      if (error.message.includes('429')) {
        return 'Service temporairement surchargé. Veuillez patienter quelques instants.';
      } else if (error.message.includes('timeout') || error.message.includes('Délai')) {
        return 'Délai d\'attente dépassé. Vérifiez votre connexion internet.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Problème de connexion. Vérifiez votre connexion internet.';
      } else {
        return 'Désolé, je rencontre des difficultés techniques. Un agent vous contactera bientôt.';
      }
    }

    displayMessage(message, sender, isError = false) {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (!messagesContainer) return;

      const messageElement = document.createElement('div');
      messageElement.className = `mtn-chatbot-message ${sender}`;
      
      if (isError) {
        messageElement.classList.add('error');
      }

      // Handle line breaks and basic formatting
      const formattedMessage = this.escapeHtml(message)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      messageElement.innerHTML = formattedMessage;
      messagesContainer.appendChild(messageElement);
      
      this.scrollToBottom();
    }

    showSystemMessage(message) {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (!messagesContainer) return;

      const messageElement = document.createElement('div');
      messageElement.className = 'mtn-chatbot-message system';
      messageElement.textContent = message;
      messagesContainer.appendChild(messageElement);
      
      this.scrollToBottom();
    }

    showRetryMessage(originalMessage, errorMessage) {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (!messagesContainer) return;

      const retryElement = document.createElement('div');
      retryElement.className = 'mtn-chatbot-message error';
      retryElement.innerHTML = `
        ${this.escapeHtml(errorMessage)}
        <button class="mtn-chatbot-retry" onclick="window.mtnChatbotRetry('${this.escapeHtml(originalMessage)}')">
          Réessayer (${this.retryCount}/${config.maxRetries})
        </button>
      `;
      messagesContainer.appendChild(retryElement);
      
      this.scrollToBottom();
    }

    showTypingIndicator() {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (!messagesContainer) return;

      const typingElement = document.createElement('div');
      typingElement.className = 'mtn-chatbot-typing';
      typingElement.id = 'mtn-chatbot-typing';
      typingElement.innerHTML = `
        <div class="mtn-chatbot-typing-dot"></div>
        <div class="mtn-chatbot-typing-dot"></div>
        <div class="mtn-chatbot-typing-dot"></div>
      `;

      messagesContainer.appendChild(typingElement);
      this.scrollToBottom();
    }

    hideTypingIndicator() {
      const typingElement = document.getElementById('mtn-chatbot-typing');
      typingElement?.remove();
    }

    showNotification() {
      const notification = document.getElementById('mtn-chatbot-notification');
      if (notification) {
        notification.style.display = 'flex';
      }
    }

    markMessagesAsRead() {
      // This could be extended to mark messages as read on the server
      console.log('Messages marked as read for session:', this.session.sessionId);
    }

    setLoading(loading) {
      this.isLoading = loading;
      const sendButton = document.getElementById('mtn-chatbot-send');
      const input = document.getElementById('mtn-chatbot-input');
      
      if (sendButton) sendButton.disabled = loading;
      if (input) input.disabled = loading;
    }

    scrollToBottom() {
      const messagesContainer = document.getElementById('mtn-chatbot-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }

    handleResize() {
      const window = document.getElementById('mtn-chatbot-window');
      if (!window) return;

      if (window.innerWidth <= 480) {
        window.style.width = 'calc(100vw - 40px)';
        window.style.height = 'calc(100vh - 100px)';
      } else {
        window.style.width = '350px';
        window.style.height = '500px';
      }
    }
  }

  // Global retry function
  window.mtnChatbotRetry = function(message) {
    if (window.mtnChatbotInstance) {
      window.mtnChatbotInstance.sendMessage(message, true);
    }
  };

  // Initialize widget when DOM is ready
  function initializeChatbot() {
    try {
      const widget = new ChatbotWidget();
      window.mtnChatbotInstance = widget;
      
      // Expose global API for advanced users
      window.MTNGPTChatbot = {
        open: () => widget.openWidget(),
        close: () => widget.closeWidget(),
        sendMessage: (message) => {
          const input = document.getElementById('mtn-chatbot-input');
          if (input) {
            input.value = message;
            widget.handleSendMessage();
          }
        },
        getSession: () => ({
          webUserId: widget.session.webUserId,
          sessionId: widget.session.sessionId,
          isOnline: widget.session.isOnline
        })
      };

      console.log('MTN GPT Chatbot Widget initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MTN GPT Chatbot Widget:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatbot);
  } else {
    initializeChatbot();
  }

})();