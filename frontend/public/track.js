/**
 * MorrisB Tracking Script
 * Lightweight visitor tracking and lead identification
 * Version: 1.0.0
 */
(function() {
  'use strict';

  // Configuration
  const API_ENDPOINT = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : 'https://api.morrisb.com'; // Replace with your production API URL

  const BATCH_SIZE = 10;
  const FLUSH_INTERVAL = 5000; // 5 seconds
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Main MorrisB Tracker Class
   */
  class MorrisBTracker {
    constructor(workspaceId) {
      if (!workspaceId) {
        console.warn('[MorrisB] No workspace ID provided');
        return;
      }

      this.workspaceId = workspaceId;
      this.visitorId = this.getOrCreateVisitorId();
      this.sessionId = this.getOrCreateSessionId();
      this.eventQueue = [];
      this.flushTimer = null;

      // Auto-track page view on initialization
      this.trackPageView();

      // Setup auto-flush timer
      this.startFlushTimer();

      // Flush on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.flush(true));
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            this.flush(true);
          }
        });
      }
    }

    /**
     * Get or create visitor ID (persistent via localStorage)
     */
    getOrCreateVisitorId() {
      try {
        let vid = localStorage.getItem('mb_visitor_id');
        if (!vid) {
          vid = this.generateUUID();
          localStorage.setItem('mb_visitor_id', vid);
        }
        return vid;
      } catch (e) {
        // Fallback if localStorage is not available
        return this.generateUUID();
      }
    }

    /**
     * Get or create session ID (expires after 30 minutes)
     */
    getOrCreateSessionId() {
      try {
        let sid = sessionStorage.getItem('mb_session_id');
        let lastActivity = parseInt(sessionStorage.getItem('mb_last_activity') || '0');

        if (!sid || (Date.now() - lastActivity > SESSION_TIMEOUT)) {
          sid = this.generateUUID();
          sessionStorage.setItem('mb_session_id', sid);
        }

        sessionStorage.setItem('mb_last_activity', Date.now().toString());
        return sid;
      } catch (e) {
        // Fallback if sessionStorage is not available
        return this.generateUUID();
      }
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    /**
     * Track custom event
     */
    track(eventType, eventName, properties = {}) {
      try {
        const event = {
          workspaceId: this.workspaceId,
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          eventType: eventType || 'custom',
          eventName: eventName || 'Event',
          url: window.location.href,
          referrer: document.referrer || undefined,
          properties: properties,
          device: {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
          },
          timestamp: new Date().toISOString(),
          ...this.getUTMParams(),
        };

        this.eventQueue.push(event);

        // Flush if batch size reached
        if (this.eventQueue.length >= BATCH_SIZE) {
          this.flush();
        }
      } catch (error) {
        // Fail silently
        console.warn('[MorrisB] Track error:', error);
      }
    }

    /**
     * Track page view
     */
    trackPageView() {
      this.track('page_view', 'Page Viewed', {
        title: document.title,
        path: window.location.pathname,
      });
    }

    /**
     * Track button click
     */
    trackClick(buttonText, properties = {}) {
      this.track('button_click', 'Button Clicked', {
        buttonText,
        ...properties,
      });
    }

    /**
     * Track form view
     */
    trackFormView(formId, properties = {}) {
      this.track('form_view', 'Form Viewed', {
        formId,
        ...properties,
      });
    }

    /**
     * Track form submission
     */
    trackFormSubmit(formId, properties = {}) {
      this.track('form_submit', 'Form Submitted', {
        formId,
        ...properties,
      });
    }

    /**
     * Identify visitor (link to contact)
     */
    identify(email, properties = {}) {
      if (!email) {
        console.warn('[MorrisB] Email required for identification');
        return;
      }

      try {
        const identifyData = {
          workspaceId: this.workspaceId,
          visitorId: this.visitorId,
          email: email,
          properties: properties,
        };

        // Send identify request immediately (don't queue)
        this.sendIdentify(identifyData);
      } catch (error) {
        console.warn('[MorrisB] Identify error:', error);
      }
    }

    /**
     * Send identify request
     */
    async sendIdentify(data) {
      try {
        const response = await fetch(`${API_ENDPOINT}/api/public/track/identify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          keepalive: true,
        });

        if (!response.ok) {
          throw new Error(`Identify failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[MorrisB] Visitor identified:', result);
      } catch (error) {
        console.warn('[MorrisB] Identify request failed:', error);
      }
    }

    /**
     * Flush event queue
     */
    flush(sync = false) {
      if (this.eventQueue.length === 0) {
        return;
      }

      try {
        const events = this.eventQueue.splice(0);
        const payload = JSON.stringify({ events });

        if (sync && navigator.sendBeacon) {
          // Use sendBeacon for page unload (more reliable)
          navigator.sendBeacon(`${API_ENDPOINT}/api/public/track/event`, payload);
        } else {
          // Use fetch for normal flush
          fetch(`${API_ENDPOINT}/api/public/track/event`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: payload,
            keepalive: true,
          }).catch((error) => {
            // Fail silently
            console.warn('[MorrisB] Flush error:', error);
          });
        }
      } catch (error) {
        console.warn('[MorrisB] Flush error:', error);
      }
    }

    /**
     * Start auto-flush timer
     */
    startFlushTimer() {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      this.flushTimer = setInterval(() => {
        this.flush();
      }, FLUSH_INTERVAL);
    }

    /**
     * Extract UTM parameters from URL
     */
    getUTMParams() {
      try {
        const params = new URLSearchParams(window.location.search);
        return {
          utmSource: params.get('utm_source') || undefined,
          utmMedium: params.get('utm_medium') || undefined,
          utmCampaign: params.get('utm_campaign') || undefined,
          utmTerm: params.get('utm_term') || undefined,
          utmContent: params.get('utm_content') || undefined,
        };
      } catch (error) {
        return {};
      }
    }

    /**
     * Get visitor ID (for debugging)
     */
    getVisitorId() {
      return this.visitorId;
    }

    /**
     * Get session ID (for debugging)
     */
    getSessionId() {
      return this.sessionId;
    }
  }

  /**
   * Global API
   * Usage: morrisb('workspace-123') or window.morrisb('workspace-123')
   */
  window.morrisb = function(workspaceId) {
    if (!window._morrisb_instance || window._morrisb_instance.workspaceId !== workspaceId) {
      window._morrisb_instance = new MorrisBTracker(workspaceId);
    }
    return window._morrisb_instance;
  };

  // Auto-initialize if workspace ID is provided via data attribute
  if (typeof document !== 'undefined') {
    const script = document.currentScript;
    if (script && script.dataset && script.dataset.workspace) {
      window.morrisb(script.dataset.workspace);
    }
  }
})();
