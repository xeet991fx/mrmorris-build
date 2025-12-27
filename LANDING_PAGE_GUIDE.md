# 📄 Landing Page Creation Guide

**Complete step-by-step guide to creating beautiful landing pages in MorrisB**

---

## 🚀 Quick Start

### Step 1: Navigate to Landing Pages
1. Go to your workspace/project
2. Click **"Pages"** in the sidebar
3. Click the **"Create Page"** button

### Step 2: Choose a Template
Select from 4 pre-built templates:

| Template | Best For | Includes |
|----------|----------|----------|
| **Blank** | Custom designs | Empty canvas |
| **SaaS** | Software products | Hero, Features, Pricing, CTA |
| **Agency** | Service businesses | Hero, Services, Testimonials, Contact |
| **E-Commerce** | Product sales | Hero, Products, Features, Testimonials |

### Step 3: Configure Page Details
- **Name**: Your page title (e.g., "Product Launch 2025")
- **URL Slug**: URL path (e.g., `product-launch` → `/p/product-launch`)
- **Description**: Internal notes about this page

### Step 4: Click "Create Page"
You'll be redirected to the page editor!

---

## 🎨 Page Editor Overview

The editor has **3 tabs**:

### 📦 Builder Tab
Where you add and customize sections

### ⚙️ Settings Tab
- **Design Settings**: Theme (light/dark/custom), colors, font
- **Tracking**: Google Analytics ID, Facebook Pixel ID

### 🔍 SEO Tab
- Page title (60 char limit)
- Meta description (160 char limit)
- Keywords (comma-separated)
- OG image URL
- Favicon URL

---

## 🧩 Available Section Types

### 1. Hero Section 🎯
**Purpose**: Main banner with headline and call-to-action

**Settings**:
- Heading (large title)
- Subheading (supporting text)
- Button Text (e.g., "Get Started")
- Button Link (URL)
- Background Image (optional)
- Alignment (left/center/right)

**Example**: "Transform Your Business with AI"

---

### 2. Features Section ✨
**Purpose**: Showcase product/service features

**Settings**:
- Heading
- Features array (icon, title, description)

**Default**: 3-column grid with icons

**How to Edit**:
1. Click gear icon on Features section
2. Currently uses default features
3. To customize: Edit the settings JSON (advanced)

**Tip**: Features appear as cards with icons (⚡, 🔒, 📱)

---

### 3. Testimonials Section 💬
**Purpose**: Display customer reviews

**Settings**:
- Heading
- Testimonials array (name, role, company, quote, rating, avatar)

**Default**: Shows John Doe example

**How to Edit**:
1. Click gear icon
2. Currently uses defaults
3. Customize via settings JSON (advanced)

---

### 4. Pricing Section 💰
**Purpose**: Show pricing plans

**Settings**:
- Heading
- Pricing Plans array:
  - Name (e.g., "Starter")
  - Price (e.g., "$29")
  - Period (e.g., "/month")
  - Features (array of strings)
  - Button Text
  - Button Link
  - Highlighted (boolean - shows "Popular" badge)

**Layout**: 3-column grid

**Tip**: Set `highlighted: true` on one plan to make it stand out

---

### 5. Call to Action (CTA) Section 📣
**Purpose**: Conversion-focused section with prominent button

**Settings**:
- Heading
- Content (supporting text)
- Button Text
- Button Link
- Alignment

**Styling**: Full-width with primary color background

---

### 6. Form Section 📝
**Purpose**: Embed lead capture forms

**Settings**:
- Heading
- **Form ID** (select from dropdown)

**How It Works**:
1. Add Form section
2. Click gear icon to edit
3. Select a published form from dropdown
4. Form appears embedded in an iframe
5. Submissions go to selected form

**Requirements**: You must have at least one published form

**Create a form first**: Go to Forms → Create Form → Design → Publish

---

### 7. Content Section 📄
**Purpose**: Rich text/paragraph content

**Settings**:
- Heading
- Content (text)
- Alignment

**Use For**: About sections, explanations, blog content

---

### 8. Image Section 🖼️
**Purpose**: Full-width image display

**Settings**:
- Image URL (direct link to image file)

**Tip**: Use high-quality images (recommended: 1920x1080px)

**Supports**: JPG, PNG, GIF, WebP

---

### 9. Video Section 🎥
**Purpose**: Embed YouTube or Vimeo videos

**Settings**:
- Video URL

**Supported Formats**:
- YouTube: `https://youtube.com/watch?v=VIDEO_ID`
- YouTube Embed: `https://youtube.com/embed/VIDEO_ID`
- Vimeo: `https://vimeo.com/VIDEO_ID`

**Rendering**: 16:9 responsive iframe

---

## 🔧 Editing Sections

### To Add a Section:
1. Click section type button (e.g., "Hero", "Features")
2. Section appears at bottom of page

### To Edit a Section:
1. Click **gear icon** ⚙️ on the section
2. Modal opens with editable fields
3. Make changes
4. Click **"Save Changes"**

### To Reorder Sections:
1. Click **up arrow** ↑ to move section up
2. Click **down arrow** ↓ to move section down

### To Delete a Section:
1. Click **trash icon** 🗑️
2. Confirm deletion

---

## 💾 Saving & Publishing

### Save Draft:
- Click **"Save"** button (top right)
- Changes are saved but page remains draft

### Publish Page:
- Click **"Publish"** button (top right)
- Page becomes publicly accessible
- URL: `your-domain.com/p/your-slug`

### Unpublish:
- Click **"Unpublish"** button
- Page hidden from public, back to draft

### Preview:
- Click **"Preview"** button
- Opens page in new tab
- Shows exactly what visitors will see

---

## 🎨 Design Customization

### Theme Options:
- **Light**: White background, dark text
- **Dark**: Dark background, light text
- **Custom**: Set your own colors

### Colors:
- **Primary Color**: Buttons, CTAs, highlights (default: #3b82f6)
- **Secondary Color**: Accents, badges (default: #8b5cf6)

### Fonts:
- Inter (default)
- Roboto
- Open Sans
- Lato
- Poppins

### Advanced:
- Custom CSS: Add in Settings tab
- Custom JS: Add in Settings tab
- Header Code: Analytics, fonts, etc.
- Footer Code: Chat widgets, etc.

---

## 📊 Tracking & Analytics

### Google Analytics:
1. Go to Settings tab
2. Enter your GA4 Measurement ID (format: `G-XXXXXXXXXX`)
3. Save page
4. Tracking automatically enabled

### Facebook Pixel:
1. Go to Settings tab
2. Enter your Pixel ID (15-digit number)
3. Save page
4. Pixel fires on page load

### MorrisB Visitor Tracking:
- Automatically enabled
- Tracks page views, sessions, conversions
- View data in Analytics section

---

## 🔗 URL Structure

### Page URLs:
- Format: `your-domain.com/p/{slug}`
- Example: `morrisb.com/p/product-launch`

### Slug Rules:
- Lowercase only
- Hyphens for spaces
- No special characters
- Unique per workspace

---

## ✅ Pre-Launch Checklist

Before publishing your landing page:

- [ ] All sections have real content (not placeholders)
- [ ] All images load correctly
- [ ] All links work and go to correct destinations
- [ ] Form is connected (if using Form section)
- [ ] SEO title and description are set
- [ ] OG image is set for social sharing
- [ ] Google Analytics/Facebook Pixel configured
- [ ] Preview looks good on desktop and mobile
- [ ] Slug is short and memorable

---

## 🐛 Troubleshooting

### Form Section Shows "No form selected"
**Fix**: Click gear icon → Select a form from dropdown → Save

### Form Dropdown is Empty
**Fix**: Create and publish a form first: Forms → Create Form → Publish

### Images Don't Load
**Fix**: Use direct image URLs (ending in .jpg, .png, etc.)

### Video Doesn't Play
**Fix**: Use embed URLs:
- YouTube: `https://youtube.com/embed/VIDEO_ID`
- Vimeo: `https://player.vimeo.com/video/VIDEO_ID`

### Changes Don't Appear on Public Page
**Fix**: Click "Save" button, then refresh public page

### 404 Error When Visiting Page
**Fix**: Ensure page is published (not draft)

### Styling Looks Wrong
**Fix**: Check theme settings, ensure custom CSS is valid

---

## 💡 Best Practices

### ✅ DO:
- Use high-quality images (min 1200px wide)
- Write clear, benefit-focused headlines
- Keep paragraphs short (2-3 lines max)
- Use whitespace generously
- Test on mobile devices
- Include clear call-to-action buttons
- Use social proof (testimonials, logos)
- Optimize images (compress before uploading)

### ❌ DON'T:
- Use too many sections (5-8 is ideal)
- Write long paragraphs
- Use low-resolution images
- Forget mobile optimization
- Skip SEO settings
- Use generic stock photos
- Overwhelm with too many CTAs

---

## 🎯 Common Use Cases

### 1. Product Launch Page
**Sections**:
1. Hero (with product image background)
2. Features (3 key benefits)
3. Video (product demo)
4. Pricing
5. Testimonials
6. CTA

### 2. Lead Magnet Page
**Sections**:
1. Hero (headline + value prop)
2. Content (what they'll get)
3. Form (email capture)
4. Testimonials

### 3. Webinar Registration
**Sections**:
1. Hero (webinar title + date)
2. Content (what they'll learn)
3. Form (registration)
4. CTA (countdown timer in custom HTML)

### 4. Service Agency Page
**Sections**:
1. Hero
2. Features (services offered)
3. Content (about company)
4. Testimonials
5. Pricing
6. Form (contact)

---

## 📚 Additional Resources

### Need Help?
- Check the main [Documentation Index](./DOCUMENTATION_INDEX.md)
- See [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- Review [Email & Lead Generation Integration](./EMAIL_LEAD_GENERATION_INTEGRATION.md)

### Related Guides:
- **Forms**: How to create and customize forms
- **Analytics**: Tracking visitors and conversions
- **Email**: Connecting email services

---

## 🔄 What's Next?

After creating your landing page:

1. **Share the URL** with your audience
2. **Monitor analytics** to see visitor behavior
3. **A/B test** different headlines and CTAs
4. **Iterate** based on conversion data
5. **Connect email automation** for follow-ups

---

**Last Updated**: December 27, 2025
**Version**: 1.0

Made with ❤️ by MorrisB
