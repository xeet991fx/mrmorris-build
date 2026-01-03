/**
 * MorrisB Lead Tracking Script
 * Focused on lead generation and visitor intelligence
 * Version: 2.1.0
 */
(function() {
  'use strict';

  // Default API endpoint (can be overridden via config)
  const DEFAULT_API_ENDPOINT = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : 'https://api.clianta.online'; // Production API

  const BATCH_SIZE = 10;
  const FLUSH_INTERVAL = 5000; // 5 seconds
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 100];

  // Default configuration (focused on lead generation)
  const DEFAULT_CONFIG = {
    // Core lead generation features (always enabled)
    autoFormTracking: true,        // Auto-detect and track forms
    autoIdentification: true,       // Auto-identify leads on form submit
    scrollDepth: true,              // Track scroll depth milestones
    timeOnPage: true,               // Track time spent on page
    engagement: true,               // Track active engagement
    downloads: true,                // Track file downloads
    exitIntent: true,               // Track exit intent
    ctaClicks: true,                // Track button/CTA clicks
    utmTracking: true,              // Track UTM parameters

    // Optional advanced features (disabled by default)
    outboundLinks: false,           // Track external link clicks
    elementVisibility: false,       // Track when elements come into view
    copyTracking: false,            // Track content copying
    rageClicks: false,              // Track rage clicks (frustration)
    deadClicks: false,              // Track dead clicks
    errorTracking: false,           // Track JavaScript errors
    performanceTracking: false,     // Track page performance metrics
  };

  /**
   * Main MorrisB Tracker Class
   */
  class MorrisBTracker {
    constructor(workspaceId, userConfig = {}) {
      if (!workspaceId) {
        console.warn('[MorrisB] No workspace ID provided');
        return;
      }

      this.workspaceId = workspaceId;
      this.config = { ...DEFAULT_CONFIG, ...userConfig };
      this.apiEndpoint = userConfig.apiEndpoint || DEFAULT_API_ENDPOINT; // Allow custom API endpoint
      this.visitorId = this.getOrCreateVisitorId();
      this.sessionId = this.getOrCreateSessionId();
      this.eventQueue = [];
      this.flushTimer = null;

      // Tracking state
      this.scrollDepthReached = new Set();
      this.pageLoadTime = Date.now();
      this.clickHistory = [];
      this.trackedElements = new Set();
      this.maxScrollDepth = 0;
      this.engagementStartTime = Date.now();
      this.isEngaged = false;
      this.formInteractions = new Map();
      this.trackedDownloads = new Set();
      this.exitIntentShown = false;

      // Initialize tracking
      this.init();
    }

    /**
     * Initialize tracking based on configuration
     */
    init() {
      // Always track page view
      this.trackPageView();

      // Setup auto-flush timer
      this.startFlushTimer();

      // Setup core event listeners
      this.setupCoreListeners();

      // Setup optional features
      if (this.config.scrollDepth) this.setupScrollTracking();
      if (this.config.engagement) this.trackEngagement();
      if (this.config.autoFormTracking) this.setupFormTracking();
      if (this.config.exitIntent && !this.isMobile()) this.setupExitIntent();
      if (this.config.downloads || this.config.outboundLinks) this.setupLinkTracking();
      if (this.config.elementVisibility) this.setupVisibilityTracking();
      if (this.config.copyTracking) this.setupCopyTracking();
      if (this.config.errorTracking) this.setupErrorTracking();
      if (this.config.performanceTracking) this.trackPerformance();
    }

    /**
     * Setup core event listeners (always enabled)
     */
    setupCoreListeners() {
      if (typeof window === 'undefined') return;

      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        if (this.config.timeOnPage) this.trackTimeOnPage();
        this.flush(true);
      });

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          if (this.config.timeOnPage) this.trackTimeOnPage();
          this.flush(true);
        } else {
          this.engagementStartTime = Date.now();
        }
      });

      // Click tracking for CTAs/buttons
      if (this.config.ctaClicks) {
        document.addEventListener('click', (e) => this.handleClick(e), true);
      }
    }

    /**
     * Track page view with metadata
     */
    trackPageView() {
      const metadata = {
        title: document.title,
        path: window.location.pathname,
        referrer: document.referrer || 'direct',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screenResolution: `${screen.width}x${screen.height}`,
      };

      this.track('page_view', 'Page Viewed', metadata);
    }

    /**
     * Setup scroll depth tracking
     */
    setupScrollTracking() {
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => this.trackScrollDepth(), 150);
      }, { passive: true });
    }

    /**
     * Track scroll depth milestones
     */
    trackScrollDepth() {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercent = Math.floor((scrollTop / (documentHeight - windowHeight)) * 100);

      // Update max scroll depth
      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;
      }

      // Track milestones
      SCROLL_DEPTH_MILESTONES.forEach(milestone => {
        if (scrollPercent >= milestone && !this.scrollDepthReached.has(milestone)) {
          this.scrollDepthReached.add(milestone);
          this.track('scroll_depth', `Scrolled ${milestone}%`, {
            depth: milestone,
            timeToReach: Date.now() - this.pageLoadTime,
          });
        }
      });
    }

    /**
     * Track time on page
     */
    trackTimeOnPage() {
      const timeSpent = Math.floor((Date.now() - this.engagementStartTime) / 1000);

      if (timeSpent > 0) {
        this.track('time_on_page', 'Time Spent', {
          seconds: timeSpent,
          maxScrollDepth: this.maxScrollDepth,
          engaged: this.isEngaged,
        });
      }
    }

    /**
     * Track engagement (mouse movement, keyboard, touch)
     */
    trackEngagement() {
      let engagementTimeout;
      const markEngaged = () => {
        if (!this.isEngaged) {
          this.isEngaged = true;
          this.track('engagement', 'User Engaged', {
            timeToEngage: Date.now() - this.pageLoadTime,
          });
        }
        clearTimeout(engagementTimeout);
        engagementTimeout = setTimeout(() => {
          this.isEngaged = false;
        }, 30000); // 30 seconds of inactivity
      };

      ['mousemove', 'keydown', 'touchstart', 'scroll'].forEach(event => {
        document.addEventListener(event, markEngaged, { passive: true, once: false });
      });
    }

    /**
     * Handle clicks (CTAs, buttons, rage clicks, dead clicks)
     */
    handleClick(e) {
      const target = e.target;
      const timestamp = Date.now();

      // Track rage/dead clicks if enabled
      if (this.config.rageClicks || this.config.deadClicks) {
        const clickData = {
          x: e.clientX,
          y: e.clientY,
          timestamp,
          target: this.getElementInfo(target),
        };

        this.clickHistory.push(clickData);
        if (this.clickHistory.length > 10) this.clickHistory.shift();

        if (this.config.rageClicks) this.detectRageClick(clickData);
        if (this.config.deadClicks) this.detectDeadClick(target);
      }

      // Track important button/link clicks
      if (this.isTrackableElement(target)) {
        this.trackClick(this.getElementText(target), {
          elementType: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          href: target.href,
        });
      }
    }

    /**
     * Detect rage clicks (frustration indicator)
     */
    detectRageClick(currentClick) {
      const recentClicks = this.clickHistory.filter(click =>
        currentClick.timestamp - click.timestamp < 1000
      );

      if (recentClicks.length >= 3) {
        const inSameArea = recentClicks.every(click => {
          const distance = Math.sqrt(
            Math.pow(click.x - currentClick.x, 2) +
            Math.pow(click.y - currentClick.y, 2)
          );
          return distance < 50;
        });

        if (inSameArea) {
          this.track('rage_click', 'Rage Click Detected', {
            clicks: recentClicks.length,
            element: currentClick.target,
          });
        }
      }
    }

    /**
     * Detect dead clicks
     */
    detectDeadClick(target) {
      const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
      const hasClickHandler = target.onclick || target.getAttribute('onclick') || target.style.cursor === 'pointer';

      if (!interactiveTags.includes(target.tagName) && !hasClickHandler) {
        this.track('dead_click', 'Dead Click', {
          element: this.getElementInfo(target),
        });
      }
    }

    /**
     * Setup automatic form tracking
     */
    setupFormTracking() {
      const trackForms = () => {
        document.querySelectorAll('form').forEach(form => {
          if (form.dataset.mbTracked) return;
          form.dataset.mbTracked = 'true';

          const formId = form.id || form.name || `form-${Math.random().toString(36).substr(2, 9)}`;

          // Track form view
          this.trackFormView(formId, {
            action: form.action,
            method: form.method,
            fieldCount: form.elements.length,
          });

          // Track field interactions
          Array.from(form.elements).forEach(field => {
            if (!field.name || field.type === 'submit' || field.type === 'button') return;

            ['focus', 'blur', 'change'].forEach(eventType => {
              field.addEventListener(eventType, () => {
                const interactionKey = `${formId}-${field.name}-${eventType}`;
                if (!this.formInteractions.has(interactionKey)) {
                  this.formInteractions.set(interactionKey, true);

                  this.track('form_interaction', 'Form Field Interaction', {
                    formId,
                    fieldName: field.name,
                    fieldType: field.type,
                    interactionType: eventType,
                  });
                }
              });
            });
          });

          // Track form submission and auto-identify
          form.addEventListener('submit', (e) => {
            this.trackFormSubmit(formId, {
              action: form.action,
              method: form.method,
            });

            // Auto-identify if enabled
            if (this.config.autoIdentification) {
              const emailField = form.querySelector('input[type="email"], input[name*="email"]');
              if (emailField && emailField.value) {
                const userData = { email: emailField.value };

                // Capture common fields
                const firstNameField = form.querySelector('[name*="first"], [name*="fname"]');
                const lastNameField = form.querySelector('[name*="last"], [name*="lname"]');
                const companyField = form.querySelector('[name*="company"], [name*="organization"]');
                const phoneField = form.querySelector('[type="tel"], [name*="phone"]');

                if (firstNameField) userData.firstName = firstNameField.value;
                if (lastNameField) userData.lastName = lastNameField.value;
                if (companyField) userData.company = companyField.value;
                if (phoneField) userData.phone = phoneField.value;

                this.identify(userData.email, userData);
              }
            }
          });
        });
      };

      // Track forms immediately
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackForms);
      } else {
        trackForms();
      }

      // Watch for dynamically added forms
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => trackForms());
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }

    /**
     * Setup visibility tracking for important elements
     */
    setupVisibilityTracking() {
      if (typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.trackedElements.has(entry.target)) {
            this.trackedElements.add(entry.target);

            this.track('element_visible', 'Element Viewed', {
              element: this.getElementInfo(entry.target),
              timeToView: Date.now() - this.pageLoadTime,
            });
          }
        });
      }, { threshold: 0.5 });

      // Track CTAs and important elements
      const selectors = [
        'button',
        'a[href*="contact"]', 'a[href*="signup"]', 'a[href*="demo"]', 'a[href*="trial"]',
        '[data-track-view]', '.cta', '.call-to-action',
      ];

      document.querySelectorAll(selectors.join(', ')).forEach(el => observer.observe(el));
    }

    /**
     * Setup download and outbound link tracking
     */
    setupLinkTracking() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link || !link.href) return;

        const url = link.href;
        const currentDomain = window.location.hostname;

        // Track downloads
        if (this.config.downloads && this.isDownloadLink(url)) {
          const trackingId = `download-${url}`;
          if (!this.trackedDownloads.has(trackingId)) {
            this.trackedDownloads.add(trackingId);
            this.track('download', 'File Download', {
              url,
              filename: this.getFilename(url),
              fileType: this.getFileExtension(url),
              linkText: this.getElementText(link),
            });
          }
        }

        // Track outbound links
        if (this.config.outboundLinks) {
          try {
            const linkDomain = new URL(url).hostname;
            if (linkDomain && linkDomain !== currentDomain && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
              this.track('outbound_click', 'External Link Click', {
                url,
                domain: linkDomain,
                linkText: this.getElementText(link),
              });
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      }, true);
    }

    /**
     * Setup exit intent tracking
     */
    setupExitIntent() {
      document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && !this.exitIntentShown) {
          this.exitIntentShown = true;
          this.track('exit_intent', 'Exit Intent Detected', {
            timeOnPage: Date.now() - this.pageLoadTime,
            scrollDepth: this.maxScrollDepth,
            engaged: this.isEngaged,
          });
        }
      });
    }

    /**
     * Setup copy tracking
     */
    setupCopyTracking() {
      document.addEventListener('copy', () => {
        const selection = window.getSelection().toString();
        if (selection && selection.length > 10) {
          this.track('copy', 'Content Copied', {
            length: selection.length,
            preview: selection.substring(0, 100),
          });
        }
      });
    }

    /**
     * Setup error tracking
     */
    setupErrorTracking() {
      window.addEventListener('error', (e) => {
        this.track('error', 'JavaScript Error', {
          message: e.message,
          filename: e.filename,
          line: e.lineno,
          column: e.colno,
        });
      });

      window.addEventListener('unhandledrejection', (e) => {
        this.track('error', 'Unhandled Promise Rejection', {
          reason: e.reason?.toString()?.substring(0, 200),
        });
      });
    }

    /**
     * Track page performance metrics
     */
    trackPerformance() {
      if (typeof performance === 'undefined' || !performance.timing) return;

      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

          this.track('performance', 'Page Performance', {
            loadTime,
            domReady,
          });
        }, 0);
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
        };

        // Add UTM parameters if enabled
        if (this.config.utmTracking) {
          Object.assign(event, this.getUTMParams());
        }

        this.eventQueue.push(event);

        // Flush if batch size reached
        if (this.eventQueue.length >= BATCH_SIZE) {
          this.flush();
        }
      } catch (error) {
        console.warn('[MorrisB] Track error:', error);
      }
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
        const response = await fetch(`${this.apiEndpoint}/api/public/track/identify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      if (this.eventQueue.length === 0) return;

      try {
        const events = this.eventQueue.splice(0);
        const payload = JSON.stringify({ events });

        if (sync && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(`${this.apiEndpoint}/api/public/track/event`, blob);
        } else {
          fetch(`${this.apiEndpoint}/api/public/track/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch((error) => {
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
      if (this.flushTimer) clearInterval(this.flushTimer);
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    }

    // ========== HELPER METHODS ==========

    getOrCreateVisitorId() {
      try {
        let vid = localStorage.getItem('mb_visitor_id');
        if (!vid) {
          vid = this.generateUUID();
          localStorage.setItem('mb_visitor_id', vid);
        }
        return vid;
      } catch (e) {
        return this.generateUUID();
      }
    }

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
        return this.generateUUID();
      }
    }

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

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

    getElementInfo(element) {
      return {
        tag: element.tagName?.toLowerCase(),
        id: element.id,
        class: element.className,
        text: this.getElementText(element).substring(0, 100),
      };
    }

    getElementText(element) {
      return (element.innerText || element.textContent || element.value || '').trim();
    }

    isTrackableElement(element) {
      const trackableTags = ['BUTTON', 'A', 'INPUT'];
      return trackableTags.includes(element.tagName) ||
             element.getAttribute('data-track-click') !== null ||
             element.classList.contains('track-click');
    }

    isDownloadLink(url) {
      const downloadExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.rar', '.tar', '.gz', '.7z',
        '.csv', '.txt',
      ];
      return downloadExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    getFilename(url) {
      try {
        return url.split('/').pop().split('?')[0];
      } catch (e) {
        return 'unknown';
      }
    }

    getFileExtension(url) {
      try {
        const filename = this.getFilename(url);
        return filename.includes('.') ? filename.split('.').pop() : 'unknown';
      } catch (e) {
        return 'unknown';
      }
    }

    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    getVisitorId() {
      return this.visitorId;
    }

    getSessionId() {
      return this.sessionId;
    }
  }

  /**
   * Global API
   * Usage:
   * - Simple: morrisb('workspace-123')
   * - With config: morrisb('workspace-123', { rageClicks: true, errorTracking: true })
   */
  window.morrisb = function(workspaceId, config) {
    if (!window._morrisb_instance || window._morrisb_instance.workspaceId !== workspaceId) {
      window._morrisb_instance = new MorrisBTracker(workspaceId, config);
    }
    return window._morrisb_instance;
  };

  // Auto-initialize if workspace ID is provided via data attribute
  if (typeof document !== 'undefined') {
    const script = document.currentScript;
    if (script && script.dataset && script.dataset.workspace) {
      const config = script.dataset.config ? JSON.parse(script.dataset.config) : {};
      window.morrisb(script.dataset.workspace, config);
    }
  }
})();
