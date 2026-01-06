# AI Content Generation with Business Profile Context

## Overview
Your platform now has intelligent AI content generation that uses business profile data to create contextual, personalized forms, emails, and landing pages.

---

## 🎯 What's New

### 1. **AI Form Generator**
Generates forms tailored to your business
- Uses industry, sales model, target audience
- Smart field selection (B2B gets company/job title, B2C doesn't)
- Includes channels you actually use (phone field only if you use phone)

### 2. **AI Email Writer**
Writes emails that match your business context
- Adapts tone based on industry (financial = professional, SaaS = friendly)
- References your pain points and goals
- Fits your sales cycle (short = quick, long = nurturing)

### 3. **AI Landing Page Generator**
Creates landing page copy aligned with your business
- Headlines that resonate with your industry
- Benefits focused on your primary goal
- CTAs appropriate for your sales cycle

---

## 📡 Backend API Endpoints

### **Generate Form**
```typescript
POST /api/ai-content/generate-form

Request:
{
  "workspaceId": "workspace_id",
  "formGoal": "capture leads for webinar",
  "useProfileContext": true  // Toggle to use/ignore profile
}

Response:
{
  "success": true,
  "data": {
    "name": "Webinar Registration Form",
    "description": "Capture registrations for upcoming webinar",
    "fields": [
      { "id": "firstName", "type": "text", "label": "First Name", "required": true },
      { "id": "email", "type": "email", "label": "Work Email", "required": true },
      { "id": "company", "type": "text", "label": "Company Name", "required": true },
      { "id": "jobTitle", "type": "select", "label": "Job Title", "options": [...] }
    ],
    "successMessage": "Thanks! Check your email for webinar details.",
    "tags": ["webinar", "lead-gen"],
    "reasoning": "B2B SaaS needs company/title for qualification..."
  }
}
```

### **Generate Form Fields (Non-AI)**
```typescript
POST /api/ai-content/form-fields-from-profile

Request:
{
  "workspaceId": "workspace_id"
}

Response:
{
  "success": true,
  "data": {
    "fields": [/* optimized fields based on profile */]
  }
}
```

### **Generate Email**
```typescript
POST /api/ai-content/generate-email

Request:
{
  "workspaceId": "workspace_id",
  "emailRequest": {
    "purpose": "cold_outreach", // or: follow_up, demo_invite, proposal, nurture, etc.
    "recipientInfo": {
      "name": "John Doe",
      "company": "Acme Corp",
      "jobTitle": "CTO"
    },
    "additionalContext": "They visited our pricing page 3 times",
    "tone": "friendly", // optional: professional, friendly, casual, formal
    "length": "medium"  // optional: short, medium, long
  },
  "useProfileContext": true
}

Response:
{
  "success": true,
  "data": {
    "subject": "Quick question about {{company}}'s tech stack",
    "preheader": "Solving the challenges you're facing...",
    "body": "Hi {{firstName}},\n\nI noticed you're a CTO at {{company}}...",
    "cta": "Book a 15-min chat",
    "alternatives": {
      "subject": ["Alternative 1", "Alternative 2", "Alternative 3"],
      "cta": ["Schedule a demo", "See it in action"]
    },
    "reasoning": "Short cycle B2B SaaS needs quick value prop...",
    "tips": [
      "Personalize the first line",
      "Reference their pain points",
      "Keep it under 150 words"
    ]
  }
}
```

### **Generate Landing Page**
```typescript
POST /api/ai-content/generate-landing-page

Request:
{
  "workspaceId": "workspace_id",
  "pageGoal": "promote new product feature",
  "useProfileContext": true
}

Response:
{
  "success": true,
  "data": {
    "headline": "Stop Losing Leads to Manual Follow-ups",
    "subheadline": "Automate your entire sales process in minutes",
    "heroText": "Built for fast-growing SaaS companies...",
    "benefitsTitle": "Why Teams Love Us",
    "benefits": [
      { "title": "Save 10 Hours/Week", "description": "..." },
      { "title": "2x Conversion Rates", "description": "..." },
      { "title": "Zero Setup Time", "description": "..." }
    ],
    "cta": {
      "primary": "Start Free Trial",
      "secondary": "Watch Demo"
    },
    "socialProof": "Trusted by 500+ SaaS companies",
    "reasoning": "Addresses 'manual tasks' pain point..."
  }
}
```

### **Get Content Suggestions**
```typescript
GET /api/ai-content/content-suggestions/:workspaceId

Response:
{
  "success": true,
  "data": {
    "suggestions": {
      "formTypes": [
        "Lead Qualification Form",
        "Demo Request Form",
        "Content Download Form"
      ],
      "emailCampaigns": [
        "Cold Outreach Campaign",
        "Demo Follow-up Sequence"
      ],
      "landingPages": [
        "Lead Magnet Landing Page",
        "Product Landing Page"
      ]
    },
    "profile": {
      "industry": "saas",
      "salesModel": "b2b",
      "primaryGoal": "generate_leads"
    }
  }
}
```

---

## 💻 Frontend Integration Examples

### **1. Form Creator with Profile Context Toggle**

```typescript
import { useState } from 'react';
import axios from '@/lib/axios';

function FormCreator({ workspaceId }: { workspaceId: string }) {
  const [useProfile, setUseProfile] = useState(true);
  const [formGoal, setFormGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await axios.post('/ai-content/generate-form', {
        workspaceId,
        formGoal,
        useProfileContext: useProfile,
      });
      setGeneratedForm(response.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2>AI Form Generator</h2>

      {/* Profile Context Toggle */}
      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={useProfile}
          onChange={(e) => setUseProfile(e.target.checked)}
        />
        <span>Use my business profile for context</span>
      </label>

      {/* Form Goal Input */}
      <input
        type="text"
        placeholder="What's the form for? (e.g., 'capture demo requests')"
        value={formGoal}
        onChange={(e) => setFormGoal(e.target.value)}
        className="w-full p-3 border rounded mb-4"
      />

      <button
        onClick={handleGenerate}
        disabled={generating || !formGoal}
        className="px-6 py-3 bg-primary text-white rounded"
      >
        {generating ? 'Generating...' : 'Generate Form'}
      </button>

      {/* Show Generated Form */}
      {generatedForm && (
        <div className="mt-6">
          <h3>{generatedForm.name}</h3>
          <p>{generatedForm.description}</p>
          <div className="mt-4">
            {generatedForm.fields.map((field) => (
              <div key={field.id} className="mb-3">
                <label>{field.label}</label>
                {/* Render field based on type */}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            💡 <strong>Why these fields?</strong> {generatedForm.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}
```

### **2. Email Writer with Profile Context**

```typescript
import { useState } from 'react';
import axios from '@/lib/axios';

function EmailWriter({ workspaceId }: { workspaceId: string }) {
  const [useProfile, setUseProfile] = useState(true);
  const [emailRequest, setEmailRequest] = useState({
    purpose: 'cold_outreach',
    recipientInfo: {
      name: '',
      company: '',
      jobTitle: '',
    },
    additionalContext: '',
    tone: 'professional',
    length: 'medium',
  });
  const [generatedEmail, setGeneratedEmail] = useState(null);

  const handleGenerate = async () => {
    try {
      const response = await axios.post('/ai-content/generate-email', {
        workspaceId,
        emailRequest,
        useProfileContext: useProfile,
      });
      setGeneratedEmail(response.data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h2>AI Email Writer</h2>

      {/* Profile Context Toggle */}
      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={useProfile}
          onChange={(e) => setUseProfile(e.target.checked)}
        />
        <span>Use my business profile for context</span>
        {useProfile && (
          <span className="text-xs text-muted-foreground ml-2">
            (Will adapt to your industry, pain points, and goals)
          </span>
        )}
      </label>

      {/* Email Purpose */}
      <select
        value={emailRequest.purpose}
        onChange={(e) => setEmailRequest({ ...emailRequest, purpose: e.target.value })}
        className="w-full p-3 border rounded mb-4"
      >
        <option value="cold_outreach">Cold Outreach</option>
        <option value="follow_up">Follow-up</option>
        <option value="demo_invite">Demo Invitation</option>
        <option value="proposal">Proposal</option>
        <option value="nurture">Nurture</option>
      </select>

      {/* Recipient Info */}
      <input
        placeholder="Recipient Name"
        value={emailRequest.recipientInfo.name}
        onChange={(e) =>
          setEmailRequest({
            ...emailRequest,
            recipientInfo: { ...emailRequest.recipientInfo, name: e.target.value },
          })
        }
        className="w-full p-3 border rounded mb-2"
      />

      <button onClick={handleGenerate} className="px-6 py-3 bg-primary text-white rounded">
        Generate Email
      </button>

      {/* Show Generated Email */}
      {generatedEmail && (
        <div className="mt-6 space-y-4">
          <div>
            <strong>Subject:</strong> {generatedEmail.subject}
          </div>
          <div>
            <strong>Body:</strong>
            <pre className="whitespace-pre-wrap">{generatedEmail.body}</pre>
          </div>
          <div>
            <strong>CTA:</strong> {generatedEmail.cta}
          </div>

          {/* Show alternatives */}
          <div>
            <strong>Alternative Subject Lines:</strong>
            <ul>
              {generatedEmail.alternatives.subject.map((alt, i) => (
                <li key={i}>{alt}</li>
              ))}
            </ul>
          </div>

          {/* Show tips */}
          <div>
            <strong>💡 Tips:</strong>
            <ul>
              {generatedEmail.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

### **3. Smart Form Field Selector (Non-AI)**

```typescript
// Get optimized fields without using AI
const getSmartFields = async (workspaceId: string) => {
  const response = await axios.post('/ai-content/form-fields-from-profile', {
    workspaceId,
  });
  return response.data.data.fields;
  // Returns fields like:
  // - B2B: firstName, lastName, email, company, jobTitle, companySize
  // - B2C: name, email, message
  // - Plus industry-specific fields automatically
};
```

---

## 🎨 UI/UX Best Practices

### **Profile Context Toggle**
Always show a checkbox to let users choose whether to use their business profile:

```tsx
<div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-6">
  <input
    type="checkbox"
    id="useProfile"
    checked={useProfile}
    onChange={(e) => setUseProfile(e.target.checked)}
    className="w-5 h-5"
  />
  <label htmlFor="useProfile" className="flex-1">
    <div className="font-medium">Use my business profile</div>
    <div className="text-sm text-muted-foreground">
      Generate content tailored to your {profile?.industry} business
    </div>
  </label>
</div>
```

### **Show Why It Was Generated That Way**
Display the reasoning to build trust:

```tsx
{generatedContent && (
  <div className="mt-4 p-4 bg-muted rounded-lg">
    <div className="flex items-start gap-2">
      <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
      <div>
        <div className="font-medium text-sm">Why these choices?</div>
        <div className="text-sm text-muted-foreground mt-1">
          {generatedContent.reasoning}
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 🔄 How Profile Context Works

When `useProfileContext: true`:

### Forms
- **B2B** → includes company, job title, company size fields
- **B2C** → simpler fields without business qualifiers
- **Phone channel enabled** → adds phone field
- **SaaS industry** → adds "current tool" field
- **Real Estate** → adds property type field

### Emails
- **Financial/Healthcare** → Professional, compliant tone
- **SaaS** → Friendly, conversational tone
- **Short sales cycle** → Quick, to-the-point emails
- **Long sales cycle** → Nurturing, educational emails
- **References pain points** → "I know you're struggling with X..."

### Landing Pages
- **Headline** → Addresses main pain point
- **Benefits** → Focused on primary goal
- **CTAs** → Match sales cycle (trial vs demo vs contact)
- **Social proof** → Relevant to industry

---

## 🚀 Next Steps

1. **Add UI in Forms Page** → Add "Generate with AI" button
2. **Add UI in Email Templates** → Add "Write with AI" button
3. **Add UI in Landing Pages** → Add "Generate Copy" button
4. **Show Profile Status** → Indicate if profile is incomplete
5. **A/B Test** → Track performance of AI-generated vs manual content

---

## 📊 Benefits

- ✅ **Faster Content Creation** → Minutes instead of hours
- ✅ **Consistent Branding** → Always matches your business
- ✅ **Better Conversion** → Optimized for your audience
- ✅ **Less Training Needed** → AI knows your business context
- ✅ **Scalable** → Generate 10 forms or emails as easily as 1

The business profile becomes the **"brain"** that makes all AI generation smarter and more relevant!
