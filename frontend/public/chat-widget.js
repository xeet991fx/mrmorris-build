/**
 * MorrisB Live Chat Widget
 * Embeddable chat widget for any website
 *
 * Usage:
 * <script src="https://yourapp.com/chat-widget.js" data-workspace="WORKSPACE_ID"></script>
 */

(function() {
  'use strict';

  const SOCKET_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : 'https://api.morrisb.com';

  class MorrisBChat {
    constructor(workspaceId) {
      if (!workspaceId) {
        console.error('[MorrisB Chat] Workspace ID is required');
        return;
      }

      this.workspaceId = workspaceId;
      this.visitorId = this.getVisitorId();
      this.socket = null;
      this.conversationId = null;
      this.isOpen = false;
      this.unreadCount = 0;

      this.messages = [];
      this.visitorName = null;
      this.visitorEmail = null;

      this.init();
    }

    getVisitorId() {
      try {
        let vid = localStorage.getItem('mb_visitor_id');
        if (!vid) {
          vid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          localStorage.setItem('mb_visitor_id', vid);
        }
        return vid;
      } catch (e) {
        return 'visitor-' + Date.now();
      }
    }

    init() {
      this.loadSocketIO();
      this.createWidget();
      this.attachEventListeners();
    }

    loadSocketIO() {
      if (window.io) {
        this.connectSocket();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
      script.onload = () => this.connectSocket();
      document.head.appendChild(script);
    }

    connectSocket() {
      this.socket = io(`${SOCKET_URL}/chat/visitor`, {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('[MorrisB Chat] Connected');
        this.joinConversation();
      });

      this.socket.on('conversation:joined', (data) => {
        this.conversationId = data.conversationId;
        this.messages = data.messages || [];
        this.renderMessages();
      });

      this.socket.on('message:new', (message) => {
        this.messages.push(message);
        this.renderMessages();

        if (!this.isOpen && message.senderType === 'agent') {
          this.unreadCount++;
          this.updateBadge();
          this.showNotification(message);
        }

        this.scrollToBottom();
      });

      this.socket.on('message:sent', (message) => {
        // Message successfully sent, already in messages array
      });

      this.socket.on('error', (error) => {
        console.error('[MorrisB Chat] Error:', error);
      });
    }

    joinConversation() {
      if (!this.socket) return;

      this.socket.emit('join', {
        workspaceId: this.workspaceId,
        visitorId: this.visitorId,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        utmSource: new URLSearchParams(window.location.search).get('utm_source'),
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      });
    }

    createWidget() {
      const widget = document.createElement('div');
      widget.id = 'morrisb-chat-widget';
      widget.innerHTML = `
        <style>
          #morrisb-chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }

          #morrisb-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-center;
            transition: transform 0.2s;
            position: relative;
          }

          #morrisb-chat-button:hover {
            transform: scale(1.1);
          }

          #morrisb-chat-button svg {
            width: 32px;
            height: 32px;
            fill: white;
          }

          #morrisb-chat-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: bold;
            display: none;
          }

          #morrisb-chat-window {
            display: none;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 120px);
            background: white;
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.25);
            flex-direction: column;
            overflow: hidden;
          }

          #morrisb-chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          #morrisb-chat-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          #morrisb-chat-header p {
            margin: 4px 0 0 0;
            font-size: 13px;
            opacity: 0.9;
          }

          #morrisb-chat-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
          }

          #morrisb-chat-close:hover {
            background: rgba(255,255,255,0.2);
          }

          #morrisb-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9fafb;
          }

          .morrisb-message {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
          }

          .morrisb-message.visitor {
            align-items: flex-end;
          }

          .morrisb-message.agent {
            align-items: flex-start;
          }

          .morrisb-message-bubble {
            max-width: 75%;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
          }

          .morrisb-message.visitor .morrisb-message-bubble {
            background: #667eea;
            color: white;
            border-bottom-right-radius: 4px;
          }

          .morrisb-message.agent .morrisb-message-bubble {
            background: white;
            color: #1f2937;
            border-bottom-left-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }

          .morrisb-message-time {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 4px;
            padding: 0 4px;
          }

          #morrisb-chat-form {
            padding: 16px;
            background: white;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 8px;
          }

          #morrisb-chat-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            padding: 10px 16px;
            font-size: 14px;
            outline: none;
          }

          #morrisb-chat-input:focus {
            border-color: #667eea;
          }

          #morrisb-chat-send {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }

          #morrisb-chat-send:hover {
            background: #5568d3;
          }

          #morrisb-chat-send:disabled {
            background: #d1d5db;
            cursor: not-allowed;
          }

          @media (max-width: 480px) {
            #morrisb-chat-window {
              width: calc(100vw - 40px);
              height: calc(100vh - 140px);
              bottom: 100px;
              right: 20px;
            }
          }
        </style>

        <button id="morrisb-chat-button" aria-label="Open chat">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <span id="morrisb-chat-badge"></span>
        </button>

        <div id="morrisb-chat-window">
          <div id="morrisb-chat-header">
            <div>
              <h3>Chat with us</h3>
              <p>We typically reply in a few minutes</p>
            </div>
            <button id="morrisb-chat-close" aria-label="Close chat">&times;</button>
          </div>

          <div id="morrisb-chat-messages"></div>

          <form id="morrisb-chat-form">
            <input
              type="text"
              id="morrisb-chat-input"
              placeholder="Type your message..."
              autocomplete="off"
            />
            <button type="submit" id="morrisb-chat-send">Send</button>
          </form>
        </div>
      `;

      document.body.appendChild(widget);
    }

    attachEventListeners() {
      const button = document.getElementById('morrisb-chat-button');
      const closeBtn = document.getElementById('morrisb-chat-close');
      const form = document.getElementById('morrisb-chat-form');

      button.addEventListener('click', () => this.toggleChat());
      closeBtn.addEventListener('click', () => this.closeChat());
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    openChat() {
      const window = document.getElementById('morrisb-chat-window');
      window.style.display = 'flex';
      this.isOpen = true;
      this.unreadCount = 0;
      this.updateBadge();

      this.scrollToBottom();

      if (this.socket && this.conversationId) {
        this.socket.emit('messages:read');
      }
    }

    closeChat() {
      const window = document.getElementById('morrisb-chat-window');
      window.style.display = 'none';
      this.isOpen = false;
    }

    handleSubmit(e) {
      e.preventDefault();

      const input = document.getElementById('morrisb-chat-input');
      const message = input.value.trim();

      if (!message || !this.socket) return;

      // Add message optimistically
      const tempMessage = {
        message,
        senderType: 'visitor',
        senderName: this.visitorName || 'You',
        createdAt: new Date().toISOString(),
      };

      this.messages.push(tempMessage);
      this.renderMessages();
      this.scrollToBottom();

      // Send via socket
      this.socket.emit('message:send', {
        message,
        senderName: this.visitorName,
      });

      input.value = '';
    }

    renderMessages() {
      const container = document.getElementById('morrisb-chat-messages');

      container.innerHTML = this.messages.map(msg => {
        const time = new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        const className = msg.senderType === 'visitor' ? 'visitor' : 'agent';
        const senderName = msg.senderType === 'agent' ? (msg.senderName || 'Support') : '';

        return `
          <div class="morrisb-message ${className}">
            ${msg.senderType === 'agent' ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${senderName}</div>` : ''}
            <div class="morrisb-message-bubble">${this.escapeHtml(msg.message)}</div>
            <div class="morrisb-message-time">${time}</div>
          </div>
        `;
      }).join('');
    }

    scrollToBottom() {
      const container = document.getElementById('morrisb-chat-messages');
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 100);
      }
    }

    updateBadge() {
      const badge = document.getElementById('morrisb-chat-badge');
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }

    showNotification(message) {
      // Browser notification (if permitted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New message', {
          body: message.message.substring(0, 50),
          icon: '/favicon.ico',
        });
      }
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Public API
    open() {
      this.openChat();
    }

    close() {
      this.closeChat();
    }

    identify(name, email) {
      this.visitorName = name;
      this.visitorEmail = email;

      if (this.socket) {
        this.socket.emit('visitor:identify', { name, email });
      }
    }
  }

  // Auto-initialize
  if (typeof document !== 'undefined') {
    const script = document.currentScript;
    if (script && script.dataset && script.dataset.workspace) {
      window.addEventListener('load', function() {
        window.morrisBChat = new MorrisBChat(script.dataset.workspace);
      });
    }
  }

  // Global API
  window.MorrisBChat = MorrisBChat;
})();
