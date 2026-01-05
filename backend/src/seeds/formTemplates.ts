import mongoose from "mongoose";
import dotenv from "dotenv";
import FormTemplate from "../models/FormTemplate";

dotenv.config();

const TEMPLATES = [
  // ============================================
  // SAAS TEMPLATES
  // ============================================
  {
    name: "Enterprise SaaS Demo Request (High-Converting)",
    slug: "saas-enterprise-demo",
    description: "Conversion-optimized demo request form for enterprise SaaS. Pre-qualifies leads with company size, timeline, and budget signals. Used by top B2B SaaS companies achieving 35%+ conversion rates.",
    industry: "saas",
    useCase: "demo_request",
    averageConversionRate: 0.35,
    benchmark: "exceptional",
    complexity: "moderate",
    estimatedCompletionTime: 45,
    recommendedFor: ["Enterprise SaaS", "B2B software", "High-touch sales models"],

    strategy: {
      goal: "Qualify and convert high-value enterprise buyers while collecting intel for personalized demos",
      whenToUse: "When selling to enterprise buyers with >$10K ACV who need personalized demos",
      conversionTips: [
        "Ask for company size early - it's a strong qualification signal with minimal friction",
        "Timeline question is critical - 'Evaluating now' vs 'Just browsing' predicts close probability by 5x",
        "Keep phone optional - requiring it drops conversion 25-30%",
        "Use social proof in success message - '500+ companies trust us'",
      ],
      commonMistakes: [
        "Asking for phone number as required field (kills conversion)",
        "Not asking about timeline/urgency (wastes sales time on browsers)",
        "Too many fields about current tech stack (save for demo call)",
        "Generic CTA like 'Submit' instead of 'Get My Personalized Demo'",
      ],
    },

    fields: [
      {
        id: "work_email",
        type: "email",
        label: "Work Email",
        placeholder: "you@company.com",
        required: true,
        helpText: "We'll send your personalized demo details here",
        qualificationWeight: 10,
        example: "john@acmecorp.com",
        mapping: "email",
      },
      {
        id: "full_name",
        type: "text",
        label: "Full Name",
        placeholder: "John Smith",
        required: true,
        helpText: "So we can personalize your demo",
        qualificationWeight: 5,
        example: "Sarah Johnson",
        mapping: "firstName",
      },
      {
        id: "company",
        type: "text",
        label: "Company Name",
        placeholder: "Acme Inc.",
        required: true,
        helpText: "We'll research your company to customize the demo",
        qualificationWeight: 15,
        example: "Acme Corporation",
        mapping: "company",
      },
      {
        id: "company_size",
        type: "select",
        label: "Company Size",
        required: true,
        helpText: "Helps us show relevant features for your scale",
        qualificationWeight: 25,
        mapping: "employees",
        options: [
          { label: "1-10 employees", value: "1-10" },
          { label: "11-50 employees", value: "11-50" },
          { label: "51-200 employees", value: "51-200" },
          { label: "201-1,000 employees", value: "201-1000" },
          { label: "1,000+ employees", value: "1000+" },
        ],
      },
      {
        id: "job_title",
        type: "text",
        label: "Job Title",
        placeholder: "e.g., Director of Marketing",
        required: true,
        helpText: "Helps us prepare relevant use cases for your role",
        qualificationWeight: 15,
        example: "VP of Sales",
        mapping: "jobTitle",
      },
      {
        id: "timeline",
        type: "select",
        label: "When are you looking to implement?",
        required: true,
        helpText: "Helps us prioritize your demo appropriately",
        qualificationWeight: 35,
        options: [
          { label: "Evaluating now - need to decide within 30 days", value: "urgent" },
          { label: "Actively looking - within next quarter", value: "active" },
          { label: "Planning ahead - in 3-6 months", value: "planning" },
          { label: "Just researching options", value: "research" },
        ],
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number (Optional)",
        placeholder: "+1 (555) 000-0000",
        required: false,
        helpText: "Only if you prefer a call over email - we respect your preference",
        qualificationWeight: 5,
        mapping: "phone",
      },
      {
        id: "gdpr_consent",
        type: "gdpr_consent",
        label: "I agree to receive communications about products and services",
        required: true,
        helpText: "We respect your privacy. Unsubscribe anytime with one click.",
        qualificationWeight: 0,
      },
    ],

    isMultiStep: false,

    submitButtonText: "Get My Personalized Demo",
    successMessage: "Thanks! We'll send your personalized demo details within 2 hours. Check your email for next steps. 🎉",
    successStrategy: "Immediate auto-reply email with calendar link + value-based video. Sales team alerted with lead score and talking points.",

    recommendedFollowup: {
      suggestedSLA: 2,
      qualificationRules: [
        {
          condition: "company_size in ['201-1000', '1000+'] AND timeline = 'urgent'",
          action: "Immediate alert to enterprise sales team + same-day demo booking",
          reason: "Enterprise + urgent = highest close probability (>40%)",
        },
        {
          condition: "timeline = 'research'",
          action: "Add to nurture email sequence, deprioritize for sales calls",
          reason: "Early-stage researchers have <5% close rate within 90 days",
        },
        {
          condition: "company_size in ['1-10', '11-50'] AND timeline in ['urgent', 'active']",
          action: "Send self-serve demo video + calendar link for quick call",
          reason: "SMB buyers prefer faster, lighter-touch sales process",
        },
      ],
    },

    createdBy: "system",
    usageCount: 0,
    rating: 4.8,
    featured: true,
    tags: ["enterprise", "b2b", "saas", "demo", "high-converting", "best-practice"],
  },

  {
    name: "SaaS Free Trial Signup (Frictionless)",
    slug: "saas-trial-signup-frictionless",
    description: "Minimal-friction trial signup for self-serve SaaS. Collects only essential info to maximize signups while still enabling qualification. 42% average conversion rate.",
    industry: "saas",
    useCase: "trial_signup",
    averageConversionRate: 0.42,
    benchmark: "exceptional",
    complexity: "simple",
    estimatedCompletionTime: 25,
    recommendedFor: ["Self-serve SaaS", "Product-led growth", "PLG startups"],

    strategy: {
      goal: "Maximize trial signups while collecting minimum viable qualification data",
      whenToUse: "For PLG SaaS products with self-serve onboarding and <$500/mo pricing",
      conversionTips: [
        "Only ask for email + company - everything else can be collected in-app via progressive profiling",
        "Use social auth (Google/Microsoft) to reduce friction by 40%",
        "Make company name optional for solo users/freelancers",
        "Add trust signals: '14-day trial, no credit card required'",
      ],
      commonMistakes: [
        "Asking for too many fields upfront (each field drops conversion 5-10%)",
        "Requiring credit card for trial (reduces signups by 60%)",
        "Not mentioning trial length in CTA ('Start Free Trial' vs 'Start 14-Day Trial')",
        "Forgetting to explain what happens after trial expires",
      ],
    },

    fields: [
      {
        id: "email",
        type: "email",
        label: "Work Email",
        placeholder: "you@company.com",
        required: true,
        helpText: "14-day free trial, no credit card required",
        qualificationWeight: 10,
        example: "sarah@startup.com",
        mapping: "email",
      },
      {
        id: "company",
        type: "text",
        label: "Company Name (Optional)",
        placeholder: "Acme Inc.",
        required: false,
        helpText: "Leave blank if you're a freelancer or solo user",
        qualificationWeight: 10,
        example: "Startup Co",
        mapping: "company",
      },
      {
        id: "consent",
        type: "checkbox",
        label: "Send me product tips and updates (you can unsubscribe anytime)",
        required: false,
        helpText: "",
        qualificationWeight: 0,
      },
    ],

    isMultiStep: false,

    submitButtonText: "Start My 14-Day Free Trial",
    successMessage: "Welcome! Check your email to activate your account and start your 14-day trial. 🚀",
    successStrategy: "Immediate activation email + in-app onboarding with progressive profiling during first session.",

    recommendedFollowup: {
      suggestedSLA: 1,
      qualificationRules: [
        {
          condition: "Activates account within 24 hours",
          action: "Add to product engagement emails, monitor usage for PQL signals",
          reason: "Quick activators are 3x more likely to convert to paid",
        },
        {
          condition: "No activation after 48 hours",
          action: "Send activation reminder email with value prop",
          reason: "Non-activators need motivation to start trial",
        },
      ],
    },

    createdBy: "system",
    usageCount: 0,
    rating: 4.9,
    featured: true,
    tags: ["saas", "trial", "plg", "frictionless", "self-serve", "high-converting"],
  },

  // ============================================
  // B2B SERVICES TEMPLATES
  // ============================================
  {
    name: "B2B Consultation Booking (Agency/Consulting)",
    slug: "b2b-consultation-booking",
    description: "Optimized for agencies and consultants. Pre-qualifies prospects with budget and challenge questions. Reduces unqualified bookings by 60% while maintaining 28% conversion.",
    industry: "consulting",
    useCase: "consultation",
    averageConversionRate: 0.28,
    benchmark: "high",
    complexity: "moderate",
    estimatedCompletionTime: 60,
    recommendedFor: ["Marketing agencies", "Consulting firms", "Professional services", "Coaching"],

    strategy: {
      goal: "Book qualified consultations while filtering out tire-kickers and poor-fit prospects",
      whenToUse: "When your time is valuable and you need to pre-qualify before booking calendar",
      conversionTips: [
        "Ask about budget early - it filters 40% of unqualified leads immediately",
        "Challenge/pain question provides context for consultation prep",
        "Offering multiple consultation types (15min vs 45min) increases conversions",
        "Emphasize 'free' and 'no-obligation' to overcome booking hesitation",
      ],
      commonMistakes: [
        "Not asking about budget (wastes time on unqualified calls)",
        "Making consultation too long (45min+ reduces bookings)",
        "Not providing calendar link immediately after form",
        "Asking for too much detail in 'challenge' field (intimidates users)",
      ],
    },

    fields: [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        placeholder: "John Smith",
        required: true,
        helpText: "",
        qualificationWeight: 5,
        example: "Maria Garcia",
        mapping: "firstName",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        placeholder: "you@company.com",
        required: true,
        helpText: "We'll send your consultation confirmation here",
        qualificationWeight: 10,
        example: "maria@agency.com",
        mapping: "email",
      },
      {
        id: "company",
        type: "text",
        label: "Company Name",
        placeholder: "Acme Inc.",
        required: true,
        helpText: "",
        qualificationWeight: 10,
        example: "Growth Agency LLC",
        mapping: "company",
      },
      {
        id: "challenge",
        type: "textarea",
        label: "What's your biggest challenge right now?",
        placeholder: "e.g., We're not generating enough qualified leads from our website...",
        required: true,
        helpText: "2-3 sentences help us prepare a more valuable consultation for you",
        qualificationWeight: 25,
        example: "We're spending $20K/mo on ads but only getting 10 qualified leads. Need to improve our funnel.",
      },
      {
        id: "budget",
        type: "select",
        label: "What's your monthly budget for this type of service?",
        required: true,
        helpText: "Helps us recommend the right solution - we have options at every level",
        qualificationWeight: 35,
        options: [
          { label: "Less than $2,000/month", value: "under_2k" },
          { label: "$2,000 - $5,000/month", value: "2k-5k" },
          { label: "$5,000 - $10,000/month", value: "5k-10k" },
          { label: "$10,000 - $25,000/month", value: "10k-25k" },
          { label: "$25,000+/month", value: "25k+" },
          { label: "Not sure yet - want to learn more", value: "unsure" },
        ],
      },
      {
        id: "timeline",
        type: "select",
        label: "When would you like to start?",
        required: true,
        helpText: "",
        qualificationWeight: 20,
        options: [
          { label: "ASAP - within 2 weeks", value: "immediate" },
          { label: "Within next month", value: "soon" },
          { label: "In 1-3 months", value: "planning" },
          { label: "Just exploring options", value: "research" },
        ],
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number (Optional)",
        placeholder: "+1 (555) 000-0000",
        required: false,
        helpText: "In case we need to reach you about your consultation",
        qualificationWeight: 5,
        mapping: "phone",
      },
    ],

    isMultiStep: false,

    submitButtonText: "Book My Free Consultation",
    successMessage: "Perfect! Click below to choose your consultation time. We'll send a confirmation email right away. 📅",
    successStrategy: "Immediately redirect to calendar booking page (Calendly/Cal.com). Send confirmation email with prep questionnaire.",

    recommendedFollowup: {
      suggestedSLA: 24,
      qualificationRules: [
        {
          condition: "budget in ['10k-25k', '25k+'] AND timeline = 'immediate'",
          action: "Priority booking - offer same-day or next-day slots",
          reason: "High-value, urgent prospects have >50% close rate",
        },
        {
          condition: "budget = 'under_2k' OR timeline = 'research'",
          action: "Offer group consultation or self-serve resources instead of 1:1",
          reason: "Low-budget/early-stage rarely convert to profitable clients",
        },
        {
          condition: "budget = 'unsure'",
          action: "Send pricing guide before consultation to set expectations",
          reason: "Budget education prevents wasted consultation time",
        },
      ],
    },

    createdBy: "system",
    usageCount: 0,
    rating: 4.7,
    featured: true,
    tags: ["consulting", "agency", "consultation", "booking", "qualified-leads"],
  },

  // ============================================
  // LEAD MAGNET / CONTENT DOWNLOAD TEMPLATES
  // ============================================
  {
    name: "High-Value Content Download (eBook/Whitepaper)",
    slug: "content-download-ebook",
    description: "Gated content form optimized for lead magnets like ebooks, whitepapers, reports. Balances lead qualification with conversion (48% avg rate). Used by top content marketers.",
    industry: "general",
    useCase: "content_download",
    averageConversionRate: 0.48,
    benchmark: "high",
    complexity: "simple",
    estimatedCompletionTime: 30,
    recommendedFor: ["Content marketing", "Lead magnets", "Thought leadership", "B2B marketing"],

    strategy: {
      goal: "Capture qualified leads through valuable content while minimizing form friction",
      whenToUse: "For gated content like ebooks, whitepapers, industry reports, templates, checklists",
      conversionTips: [
        "Keep to 3-4 fields maximum - each additional field drops conversion 10-15%",
        "Company size is valuable for B2B without much friction",
        "Immediately deliver the content - don't make them wait for email",
        "Use specific CTA with content name: 'Download The Complete Guide' not 'Submit'",
      ],
      commonMistakes: [
        "Asking for phone number (reduces download rate by 40%)",
        "Too many fields for 'free' content (breaks value equation)",
        "Not delivering content immediately (forces email check, increases abandonment)",
        "Generic form for all content (should customize based on content type)",
      ],
    },

    fields: [
      {
        id: "email",
        type: "email",
        label: "Email Address",
        placeholder: "you@company.com",
        required: true,
        helpText: "We'll send you the download link instantly",
        qualificationWeight: 10,
        example: "alex@company.com",
        mapping: "email",
      },
      {
        id: "first_name",
        type: "text",
        label: "First Name",
        placeholder: "Alex",
        required: true,
        helpText: "",
        qualificationWeight: 5,
        example: "Alex",
        mapping: "firstName",
      },
      {
        id: "company",
        type: "text",
        label: "Company Name",
        placeholder: "Acme Inc.",
        required: true,
        helpText: "",
        qualificationWeight: 10,
        example: "TechCorp",
        mapping: "company",
      },
      {
        id: "company_size",
        type: "select",
        label: "Company Size",
        required: false,
        helpText: "Optional - helps us send you relevant follow-up content",
        qualificationWeight: 15,
        mapping: "employees",
        options: [
          { label: "Just me", value: "1" },
          { label: "2-10 employees", value: "2-10" },
          { label: "11-50 employees", value: "11-50" },
          { label: "51-200 employees", value: "51-200" },
          { label: "200+ employees", value: "200+" },
        ],
      },
    ],

    isMultiStep: false,

    submitButtonText: "Download Now - It's Free",
    successMessage: "Opening your download now! Also check your email - we sent you a backup link plus related resources. 📚",
    successStrategy: "Immediate download + confirmation email with related content recommendations. Add to nurture sequence.",

    recommendedFollowup: {
      suggestedSLA: 48,
      qualificationRules: [
        {
          condition: "company_size in ['51-200', '200+']",
          action: "Add to sales qualification sequence - send case study after 3 days",
          reason: "Larger companies downloading content show buying intent",
        },
        {
          condition: "Opened email within 1 hour",
          action: "Tag as 'engaged' - prioritize for follow-up nurture",
          reason: "Quick openers are 2x more likely to engage with follow-up",
        },
      ],
    },

    createdBy: "system",
    usageCount: 0,
    rating: 4.6,
    featured: true,
    tags: ["lead-magnet", "content-download", "ebook", "whitepaper", "gated-content"],
  },

  // ============================================
  // SIMPLE FORMS
  // ============================================
  {
    name: "Contact Sales (Quick Inquiry)",
    slug: "contact-sales-quick",
    description: "Fast, frictionless contact form for sales inquiries. Only essential fields. 38% conversion rate. Perfect for warm traffic already interested.",
    industry: "general",
    useCase: "contact_sales",
    averageConversionRate: 0.38,
    benchmark: "high",
    complexity: "simple",
    estimatedCompletionTime: 20,
    recommendedFor: ["Sales pages", "Pricing pages", "Warm traffic", "High-intent visitors"],

    strategy: {
      goal: "Capture high-intent leads with minimal friction",
      whenToUse: "On pricing pages, sales landing pages, or anywhere with warm, high-intent traffic",
      conversionTips: [
        "Ultra-short forms (3-4 fields) work best for warm traffic that's already interested",
        "Message field is important - lets prospects explain their needs",
        "Emphasize quick response time: 'Our team responds within 2 hours'",
        "Mobile-optimize - 60% of sales inquiries happen on mobile",
      ],
      commonMistakes: [
        "Adding unnecessary qualification fields (do this via email/call instead)",
        "Not responding fast enough (>4 hour response kills 50% of opportunities)",
        "Making message field required (intimidates some users)",
        "Generic auto-reply email (send personalized response with calendar link)",
      ],
    },

    fields: [
      {
        id: "name",
        type: "text",
        label: "Name",
        placeholder: "John Smith",
        required: true,
        helpText: "",
        qualificationWeight: 5,
        example: "Emma Wilson",
        mapping: "firstName",
      },
      {
        id: "email",
        type: "email",
        label: "Email",
        placeholder: "you@company.com",
        required: true,
        helpText: "We respond within 2 hours during business hours",
        qualificationWeight: 10,
        example: "emma@startup.io",
        mapping: "email",
      },
      {
        id: "company",
        type: "text",
        label: "Company",
        placeholder: "Acme Inc.",
        required: true,
        helpText: "",
        qualificationWeight: 10,
        example: "FastGrow Inc",
        mapping: "company",
      },
      {
        id: "message",
        type: "textarea",
        label: "How can we help?",
        placeholder: "Tell us a bit about what you're looking for...",
        required: false,
        helpText: "Optional - but helps us prepare for our conversation",
        qualificationWeight: 15,
        example: "Interested in enterprise plan for team of 50",
      },
    ],

    isMultiStep: false,

    submitButtonText: "Contact Sales Team",
    successMessage: "Thanks! Our sales team will respond within 2 hours during business hours. Check your email! 📧",
    successStrategy: "Immediate auto-reply with team intro video + calendar link. Slack alert to sales team with lead info.",

    recommendedFollowup: {
      suggestedSLA: 2,
      qualificationRules: [
        {
          condition: "Message mentions 'enterprise' OR 'team of 50+' OR 'urgent'",
          action: "Immediate phone call + email with calendar link",
          reason: "High-value signals require immediate response",
        },
        {
          condition: "No message provided",
          action: "Email asking qualifying questions before call",
          reason: "Need context to prepare valuable conversation",
        },
      ],
    },

    createdBy: "system",
    usageCount: 0,
    rating: 4.5,
    featured: true,
    tags: ["contact", "sales", "inquiry", "simple", "high-intent"],
  },
];

async function seedFormTemplates() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/lead-generation";
    await mongoose.connect(mongoURI);
    console.log("✓ Connected to MongoDB");

    // Clear existing templates
    await FormTemplate.deleteMany({ createdBy: "system" });
    console.log("✓ Cleared existing system templates");

    // Insert new templates
    const inserted = await FormTemplate.insertMany(TEMPLATES);
    console.log(`✓ Inserted ${inserted.length} form templates`);

    // Print summary
    console.log("\n📊 Template Summary:");
    for (const template of inserted) {
      console.log(`  - ${template.name} (${template.industry}/${template.useCase})`);
      console.log(`    Avg conversion: ${(template.averageConversionRate * 100).toFixed(1)}% | Benchmark: ${template.benchmark}`);
      console.log(`    ${template.fields.length} fields | ${template.estimatedCompletionTime}s to complete\n`);
    }

    console.log("✅ Form templates seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding form templates:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedFormTemplates();
}

export default seedFormTemplates;
