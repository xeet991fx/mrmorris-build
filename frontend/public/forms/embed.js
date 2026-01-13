/**
 * MorrisB Form Embed Script
 * Embeds MorrisB forms on any website via iframe
 * Automatically links form submissions to visitor tracking
 *
 * Usage:
 * <script src="https://app.morrisb.com/forms/embed.js"></script>
 * <div data-morrisb-form="FORM_ID"></div>
 */

(function () {
  'use strict';

  const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://clianta.online';

  const BACKEND_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : 'https://api.clianta.online';

  /**
   * MorrisB Form Embed Class
   */
  class MorrisBFormEmbed {
    constructor(container, formId) {
      this.container = container;
      this.formId = formId;
      this.visitorId = this.getVisitorId();

      this.render();
    }

    /**
     * Get visitor ID from tracking cookie/localStorage
     */
    getVisitorId() {
      try {
        // Try to get visitor ID from localStorage (set by tracking script)
        return localStorage.getItem('mb_visitor_id') || null;
      } catch (e) {
        // Cross-domain - can't access localStorage
        return null;
      }
    }

    /**
     * Render form (iframe method for cross-domain safety)
     */
    render() {
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.id = `morrisb-form-${this.formId}`;
      iframe.src = `${API_BASE_URL}/forms/${this.formId}`;
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.minHeight = '500px';
      iframe.scrolling = 'no';

      // Allow iframe to access localStorage (same-origin only)
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');

      // Add to container
      this.container.innerHTML = '';
      this.container.appendChild(iframe);

      // Listen for messages from iframe (for height adjustment and success events)
      window.addEventListener('message', (event) => {
        // Verify origin
        if (event.origin !== API_BASE_URL) return;

        const data = event.data;

        // Handle height adjustment
        if (data.type === 'morrisb-form-height' && data.formId === this.formId) {
          iframe.style.height = data.height + 'px';
        }

        // Handle form submission success
        if (data.type === 'morrisb-form-submit' && data.formId === this.formId) {
          // Pass visitor ID to iframe
          iframe.contentWindow.postMessage({
            type: 'morrisb-visitor-id',
            visitorId: this.visitorId,
            formId: this.formId
          }, API_BASE_URL);

          // Trigger custom event on parent page
          const submitEvent = new CustomEvent('morrisb-form-submitted', {
            detail: {
              formId: this.formId,
              data: data.data
            }
          });
          window.dispatchEvent(submitEvent);
        }
      });

      // Send visitor ID to iframe once it loads
      iframe.onload = () => {
        if (this.visitorId) {
          iframe.contentWindow.postMessage({
            type: 'morrisb-visitor-id',
            visitorId: this.visitorId,
            formId: this.formId
          }, API_BASE_URL);
        }
      };
    }
  }

  /**
   * Alternative: Direct DOM rendering (for same-domain embedding)
   */
  class MorrisBFormDirect {
    constructor(container, formId, workspaceId) {
      this.container = container;
      this.formId = formId;
      this.workspaceId = workspaceId;
      this.visitorId = this.getVisitorId();
      this.form = null;

      this.loadAndRender();
    }

    getVisitorId() {
      try {
        return localStorage.getItem('mb_visitor_id') || this.generateVisitorId();
      } catch (e) {
        return this.generateVisitorId();
      }
    }

    generateVisitorId() {
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      try {
        localStorage.setItem('mb_visitor_id', id);
      } catch (e) {
        // Can't set localStorage
      }

      return id;
    }

    async loadAndRender() {
      try {
        // Fetch form definition
        const response = await fetch(`${BACKEND_URL}/api/public/forms/${this.formId}`);
        const result = await response.json();

        if (!result.success) {
          this.showError('Form not found');
          return;
        }

        this.form = result.data;
        this.renderForm();
      } catch (error) {
        console.error('Error loading form:', error);
        this.showError('Failed to load form');
      }
    }

    renderForm() {
      const form = this.form;

      // Build form HTML
      const formHTML = `
        <div class="morrisb-form-wrapper" style="max-width: 600px; margin: 0 auto;">
          <form id="morrisb-form-${this.formId}" class="morrisb-form">
            <style>
              .morrisb-form-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              }
              .morrisb-form-field {
                margin-bottom: 20px;
              }
              .morrisb-form-label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: ${form.settings?.textColor || '#333'};
              }
              .morrisb-form-required {
                color: #e53e3e;
                margin-left: 4px;
              }
              .morrisb-form-input,
              .morrisb-form-textarea,
              .morrisb-form-select {
                width: 100%;
                padding: 12px;
                border: 1px solid ${form.settings?.borderColor || '#d1d5db'};
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.2s;
              }
              .morrisb-form-input:focus,
              .morrisb-form-textarea:focus,
              .morrisb-form-select:focus {
                outline: none;
                border-color: ${form.settings?.primaryColor || '#3b82f6'};
                box-shadow: 0 0 0 3px ${form.settings?.primaryColor || '#3b82f6'}22;
              }
              .morrisb-form-error {
                color: #e53e3e;
                font-size: 12px;
                margin-top: 4px;
              }
              .morrisb-form-submit {
                width: 100%;
                padding: 14px 24px;
                background-color: ${form.settings?.primaryColor || '#3b82f6'};
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
              }
              .morrisb-form-submit:hover {
                opacity: 0.9;
              }
              .morrisb-form-submit:disabled {
                opacity: 0.6;
                cursor: not-allowed;
              }
              .morrisb-form-success {
                text-align: center;
                padding: 40px 20px;
              }
              .morrisb-form-success-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 16px;
                fill: #10b981;
              }
            </style>

            ${form.name ? `<h2 style="margin-bottom: 8px; color: ${form.settings?.textColor || '#111'};">${form.name}</h2>` : ''}
            ${form.description ? `<p style="margin-bottom: 24px; color: #6b7280;">${form.description}</p>` : ''}

            <div id="morrisb-form-fields-${this.formId}">
              ${this.renderFields(form.fields)}
            </div>

            <button type="submit" class="morrisb-form-submit">
              ${form.settings?.submitButtonText || 'Submit'}
            </button>
          </form>
        </div>
      `;

      this.container.innerHTML = formHTML;
      this.attachEventListeners();
    }

    renderFields(fields) {
      return fields.map(field => {
        const fieldId = `morrisb-field-${this.formId}-${field.id}`;

        let inputHTML = '';

        switch (field.type) {
          case 'textarea':
            inputHTML = `<textarea
              id="${fieldId}"
              name="${field.id}"
              class="morrisb-form-textarea"
              placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''}
              rows="4"
            ></textarea>`;
            break;

          case 'select':
            inputHTML = `<select
              id="${fieldId}"
              name="${field.id}"
              class="morrisb-form-select"
              ${field.required ? 'required' : ''}
            >
              <option value="">${field.placeholder || 'Select an option'}</option>
              ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>`;
            break;

          case 'checkbox':
            inputHTML = `<div class="morrisb-form-checkbox-group">
              ${(field.options || []).map((opt, i) => `
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <input
                    type="checkbox"
                    name="${field.id}"
                    value="${opt}"
                    id="${fieldId}-${i}"
                  />
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>`;
            break;

          case 'radio':
            inputHTML = `<div class="morrisb-form-radio-group">
              ${(field.options || []).map((opt, i) => `
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <input
                    type="radio"
                    name="${field.id}"
                    value="${opt}"
                    id="${fieldId}-${i}"
                    ${field.required && i === 0 ? 'required' : ''}
                  />
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>`;
            break;

          default:
            inputHTML = `<input
              type="${field.type}"
              id="${fieldId}"
              name="${field.id}"
              class="morrisb-form-input"
              placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''}
            />`;
        }

        return `
          <div class="morrisb-form-field">
            <label for="${fieldId}" class="morrisb-form-label">
              ${field.label}
              ${field.required ? '<span class="morrisb-form-required">*</span>' : ''}
            </label>
            ${inputHTML}
            <div id="${fieldId}-error" class="morrisb-form-error"></div>
          </div>
        `;
      }).join('');
    }

    attachEventListeners() {
      const formElement = document.getElementById(`morrisb-form-${this.formId}`);

      formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmit(formElement);
      });
    }

    async handleSubmit(formElement) {
      const submitButton = formElement.querySelector('.morrisb-form-submit');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      try {
        // Collect form data
        const formData = new FormData(formElement);
        const data = {};

        for (const [key, value] of formData.entries()) {
          if (data[key]) {
            // Multiple values (checkboxes)
            if (!Array.isArray(data[key])) {
              data[key] = [data[key]];
            }
            data[key].push(value);
          } else {
            data[key] = value;
          }
        }

        // Submit to API
        const response = await fetch(`${BACKEND_URL}/api/public/forms/${this.formId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data,
            source: {
              url: window.location.href,
              referrer: document.referrer,
              userAgent: navigator.userAgent,
              utmSource: new URLSearchParams(window.location.search).get('utm_source'),
              utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
              utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
            }
          })
        });

        const result = await response.json();

        if (result.success) {
          // Identify visitor (if tracking script is loaded)
          if (window.morrisb && this.workspaceId) {
            const emailField = this.form.fields.find(f => f.type === 'email');
            const email = emailField ? data[emailField.id] : null;

            if (email) {
              window.morrisb(this.workspaceId).identify(email, data);
            }
          }

          // Show success message
          this.showSuccess();

          // Redirect if specified
          if (result.redirectUrl) {
            setTimeout(() => {
              window.location.href = result.redirectUrl;
            }, 1500);
          }

          // Trigger custom event
          const event = new CustomEvent('morrisb-form-submitted', {
            detail: { formId: this.formId, data }
          });
          window.dispatchEvent(event);
        } else {
          throw new Error(result.message || 'Submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        alert('Failed to submit form. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = this.form.settings?.submitButtonText || 'Submit';
      }
    }

    showSuccess() {
      const fieldsContainer = document.getElementById(`morrisb-form-fields-${this.formId}`);
      const submitButton = document.querySelector('.morrisb-form-submit');

      fieldsContainer.innerHTML = `
        <div class="morrisb-form-success">
          <svg class="morrisb-form-success-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 style="margin-bottom: 8px; color: #111;">Thank You!</h3>
          <p style="color: #6b7280;">${this.form.settings?.successMessage || 'Your submission has been received.'}</p>
        </div>
      `;

      submitButton.style.display = 'none';
    }

    showError(message) {
      this.container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #e53e3e;">
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Auto-initialize forms on page load
   */
  function initializeForms() {
    const containers = document.querySelectorAll('[data-morrisb-form]');

    containers.forEach(container => {
      const formId = container.getAttribute('data-morrisb-form');
      const mode = container.getAttribute('data-morrisb-mode') || 'iframe'; // 'iframe' or 'direct'
      const workspaceId = container.getAttribute('data-morrisb-workspace');

      if (!formId) {
        console.error('MorrisB Form: Missing form ID');
        return;
      }

      if (mode === 'direct' && workspaceId) {
        new MorrisBFormDirect(container, formId, workspaceId);
      } else {
        new MorrisBFormEmbed(container, formId);
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForms);
  } else {
    initializeForms();
  }

  // Expose global API
  window.MorrisBForm = {
    embed: (container, formId) => new MorrisBFormEmbed(container, formId),
    direct: (container, formId, workspaceId) => new MorrisBFormDirect(container, formId, workspaceId),
  };
})();
