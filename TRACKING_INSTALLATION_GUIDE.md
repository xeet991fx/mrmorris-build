# Universal Website Tracking - Installation Guide

## 🎯 Overview

MorrisB provides a **universal tracking script** that works on ANY website platform - WordPress, Shopify, Webflow, React, Vue, plain HTML, and more.

## 📦 What You Need

Just **ONE snippet of code** that you copy-paste into your website's `<head>` section.

## 🚀 Quick Start (2 Minutes)

### Step 1: Get Your Tracking Code

Navigate to: **Your Workspace → Settings → Tracking → Universal Code**

You'll see code like this:

```html
<!-- MorrisB Lead Tracking - Copy & Paste Anywhere -->
<script src="https://yourdomain.com/track.min.js" async></script>
<script>
  window.addEventListener('load', function() {
    if (window.morrisb) {
      morrisb('YOUR-WORKSPACE-ID');
    }
  });
</script>
```

### Step 2: Install on Your Website

**Paste this code BEFORE the closing `</head>` tag** on your website.

#### Platform-Specific Instructions:

##### HTML / Static Websites
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>

    <!-- Paste MorrisB tracking code here -->

</head>
<body>
    ...
</body>
</html>
```

##### WordPress
1. Go to: **Appearance → Theme Editor**
2. Open: **header.php**
3. Find: `</head>`
4. Paste tracking code BEFORE `</head>`
5. Click **Update File**

Or use **Appearance → Customize → Additional CSS** (paste in `<head>` section if available)

##### Shopify
1. Go to: **Online Store → Themes**
2. Click: **Actions → Edit Code**
3. Open: **theme.liquid**
4. Find: `</head>`
5. Paste tracking code BEFORE `</head>`
6. Click **Save**

##### Webflow
1. Open your project
2. Go to: **Project Settings → Custom Code**
3. Paste code in: **Head Code** section
4. Click **Save**
5. Republish your site

##### Wix
1. Go to: **Settings → Custom Code**
2. Click: **Add Custom Code**
3. Paste code and select **Head**
4. Apply to **All Pages**
5. Click **Apply**

##### Squarespace
1. Go to: **Settings → Advanced → Code Injection**
2. Paste code in: **Header** section
3. Click **Save**

##### React / Next.js
```jsx
// In _document.tsx or _app.tsx
import Head from 'next/head';

<Head>
  <script src="https://yourdomain.com/track.min.js" async />
  <script
    dangerouslySetInnerHTML={{
      __html: `
        window.addEventListener('load', function() {
          if (window.morrisb) {
            morrisb('YOUR-WORKSPACE-ID');
          }
        });
      `,
    }}
  />
</Head>
```

##### Vue / Nuxt
```html
<!-- In index.html or nuxt.config.js -->
<head>
  <script src="https://yourdomain.com/track.min.js" async></script>
  <script>
    window.addEventListener('load', function() {
      if (window.morrisb) {
        morrisb('YOUR-WORKSPACE-ID');
      }
    });
  </script>
</head>
```

### Step 3: Verify It's Working

1. **Download Test Page**: From the tracking settings, click "Download Test Page"
2. **Open in Browser**: Open the downloaded HTML file
3. **Check Console**: Press F12 and look for: `✅ MorrisB tracking initialized!`
4. **Check Dashboard**: Visit your workspace → Visitors to see the tracked visitor

## 🎨 What Gets Tracked Automatically

Once installed, the script automatically tracks:

- ✅ **Page Views** - Every page a visitor views
- ✅ **Sessions** - Visitor sessions (30-minute timeout)
- ✅ **UTM Parameters** - Source, medium, campaign, term, content
- ✅ **Device Info** - Browser, screen size, language
- ✅ **Referrer** - Where visitors came from

## 🔥 Advanced: Custom Event Tracking

### Track Custom Button Clicks

```html
<button class="track-click">Download PDF</button>

<script>
  // Track clicks on elements with class "track-click"
  document.querySelectorAll('.track-click').forEach(function(el) {
    el.addEventListener('click', function() {
      morrisb('YOUR-WORKSPACE-ID').trackClick(this.innerText);
    });
  });
</script>
```

### Identify Visitors (Link Anonymous Visitors to Email)

```javascript
// When user submits a form
document.querySelector('form').addEventListener('submit', function(e) {
  var email = document.querySelector('input[type="email"]').value;

  morrisb('YOUR-WORKSPACE-ID').identify(email, {
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Inc',
    source: 'Contact Form'
  });
});
```

### Track Custom Events

```javascript
// Track any custom event
morrisb('YOUR-WORKSPACE-ID').track('custom', 'Video Played', {
  videoTitle: 'Product Demo',
  duration: 120
});
```

## 📊 Performance

- **File Size**: 4KB (minified)
- **Load Method**: Asynchronous (non-blocking)
- **Impact**: Zero impact on page load speed
- **Batch Processing**: Events sent in batches every 5 seconds
- **Reliable**: Uses `sendBeacon` for page unload events

## 🔒 Privacy & Compliance

- **No Third-Party Cookies**: Uses localStorage only
- **GDPR-Friendly**: First-party tracking
- **Anonymous by Default**: Visitors anonymous until identified
- **Data Ownership**: All data stored in your workspace

## 🧪 Testing Checklist

- [ ] Tracking code installed in `<head>` section
- [ ] Test page downloaded and verified
- [ ] Browser console shows: `✅ MorrisB tracking initialized!`
- [ ] Visitor appears in dashboard (Workspace → Visitors)
- [ ] Page view event logged
- [ ] UTM parameters captured (if used)
- [ ] Form submission creates/identifies contact

## ❓ Troubleshooting

### Tracking Not Working?

1. **Check browser console** (F12) for errors
2. **Verify workspace ID** is correct in the script
3. **Check script URL** - should point to your domain
4. **Disable ad blockers** - they may block tracking
5. **Clear cache** and hard refresh (Ctrl+Shift+R)

### No Visitors Showing in Dashboard?

1. **Wait 30 seconds** - events are batched
2. **Check correct workspace** - verify workspace ID
3. **Test with test page** - download and test locally
4. **Verify script loaded** - check Network tab in DevTools

### Events Not Identifying Visitors?

1. **Email is required** for identification
2. **Check identify() call** - must include valid email
3. **Verify backfill** - existing events should link to contact

## 🆘 Need Help?

- **Documentation**: Check your workspace → Settings → Tracking
- **Test Page**: Download pre-configured test page to verify setup
- **Support**: Contact support with your workspace ID

---

## 📝 Summary

**Universal tracking in 3 steps:**

1. Copy the tracking code from your workspace settings
2. Paste before `</head>` on your website
3. Publish and watch visitors appear in your dashboard

**Works on**: WordPress, Shopify, Webflow, Wix, Squarespace, React, Vue, Angular, HTML, and ANY platform that allows custom HTML.

No WordPress plugin needed. No platform-specific setup. Just one universal code that works everywhere.
