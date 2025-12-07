# MrMorris AI - Pipeline & Opportunity Management Guide

## Overview
MrMorris AI can now help you manage your entire sales pipeline through conversational commands. You can create pipelines, manage stages, and track opportunities/deals without clicking through multiple forms.

---

## What Can MrMorris AI Do?

### Pipeline Management
- ✅ Create new sales pipelines with custom stages
- ✅ Update pipeline names and descriptions
- ✅ Delete pipelines
- ✅ Add stages to existing pipelines
- ✅ Update stage names and colors
- ✅ Delete stages from pipelines
- ✅ Reorder stages in a pipeline
- ✅ Set default pipeline for workspace

### Opportunity/Deal Management
- ✅ Create new opportunities (deals)
- ✅ Update opportunity details (title, value, probability, dates)
- ✅ Move opportunities between stages
- ✅ Delete opportunities
- ✅ Bulk update multiple opportunities
- ✅ Bulk delete opportunities

### Contact & Company Management (Existing)
- ✅ Create, update, and delete contacts
- ✅ Create, update, and delete companies
- ✅ Link contacts to companies
- ✅ Bulk operations on contacts
- ✅ Export contacts and companies to CSV
- ✅ Analyze contact data and statistics

---

## How to Use the Chatbot

### Opening the Chatbot
1. Click the chat icon in the bottom-right corner of any page
2. The MrMorris AI sidebar will open
3. Start typing your request!

### Basic Interaction Flow
1. **You make a request** (e.g., "Create a new sales pipeline")
2. **AI asks for missing info** (if needed)
3. **You provide details**
4. **AI confirms and shows action card**
5. **You click "Execute" or "Confirm"**
6. **Action completes** and you see success message

---

## Pipeline Management Examples

### Example 1: Create a Basic Sales Pipeline

**You:**
```
Create a new sales pipeline for our B2B sales process
```

**AI Response:**
```
I'll help you create a new sales pipeline!

To create a pipeline, I need:
1. Pipeline Name: What should we call this pipeline?
2. Stages: What stages should this pipeline have?

For example, a typical B2B pipeline might have stages like:
- Lead (Cold Prospects)
- Qualified (Interested Prospects)
- Proposal (Quote Sent)
- Negotiation (Discussing Terms)
- Closed Won (Deal Completed)

What stages would you like in your pipeline?
```

**You:**
```
Call it "Enterprise Sales Pipeline" with these stages:
- Discovery (blue)
- Qualification (green)
- Proposal (yellow)
- Negotiation (orange)
- Closed Won (lime green)
- Closed Lost (red)
```

**AI Response:**
```
Perfect! I'll create an "Enterprise Sales Pipeline" with 6 stages.

[Action Card Appears]
Action: Create pipeline: Enterprise Sales Pipeline
Execute this action?
```

**You:** Click "Execute"

**Result:**
```
✅ Pipeline "Enterprise Sales Pipeline" created successfully with 6 stages
```

---

### Example 2: Create a Simple Pipeline (Quick Version)

**You:**
```
Make a pipeline called "Quick Sales" with stages: Lead, Demo, Proposal, Closed
```

**AI Response:**
```
Got it! I'll create a "Quick Sales" pipeline with 4 stages.

Note: I'll use default colors for the stages. You can customize them later if needed.

[Action Card]
Creating pipeline now...
```

**Result:**
```
✅ Pipeline "Quick Sales" created successfully with 4 stages
```

---

### Example 3: Add a Stage to Existing Pipeline

**You:**
```
Add a "Follow-up" stage to my Enterprise Sales Pipeline
```

**AI Response:**
```
I'll add a "Follow-up" stage to your Enterprise Sales Pipeline.

What color should this stage be? (e.g., blue, #3b82f6)
Where should it go in the order? (Leave blank to add at the end)
```

**You:**
```
Make it purple and put it after Discovery
```

**AI Response:**
```
[Action Card]
Add stage "Follow-up" to pipeline
```

**Result:**
```
✅ Stage "Follow-up" added to pipeline
```

---

## Opportunity Management Examples

### Example 4: Create a New Opportunity (Interactive)

**You:**
```
Add a new deal for Acme Corporation worth $50,000
```

**AI Response:**
```
I'll create a new opportunity for Acme Corporation worth $50,000.

To complete this, I need to know:
1. Deal Title: What should we call this opportunity? (e.g., "Acme Corp - Enterprise License")
2. Pipeline: Which sales pipeline should this be in?
3. Stage: What stage is this deal in? (e.g., "Qualified", "Proposal")

Optional: I can also add expected close date, probability, or link it to a contact if you'd like!
```

**You:**
```
Title: "Acme Corp - Annual Software License"
Pipeline: Enterprise Sales Pipeline
Stage: Proposal
Probability: 75%
Expected close: End of this month
```

**AI Response:**
```
Perfect! Creating opportunity with:
- Title: Acme Corp - Annual Software License
- Value: $50,000
- Pipeline: Enterprise Sales Pipeline
- Stage: Proposal
- Probability: 75%
- Expected Close: 2024-01-31

[Action Card]
Create opportunity: Acme Corp - Annual Software License
```

**Result:**
```
✅ Opportunity "Acme Corp - Annual Software License" created worth $50,000
```

---

### Example 5: Create Opportunity (All Details at Once)

**You:**
```
Create opportunity:
- Title: TechStart Inc - Consulting Package
- Value: $25,000
- Pipeline: Enterprise Sales Pipeline
- Stage: Discovery
- Priority: High
- Expected close: Feb 15, 2024
- Probability: 40%
- Company: TechStart Inc
```

**AI Response:**
```
Got it! Creating opportunity now...

[Action Card]
Create opportunity: TechStart Inc - Consulting Package
```

**Result:**
```
✅ Opportunity "TechStart Inc - Consulting Package" created worth $25,000
```

---

### Example 6: Move Opportunity to Different Stage

**You:**
```
Move the Acme Corp deal to Negotiation stage
```

**AI Response:**
```
I'll move the Acme Corp opportunity to the Negotiation stage.

[Action Card]
Move opportunity to new stage
```

**Result:**
```
✅ Opportunity moved to new stage
```

---

### Example 7: Update Opportunity Details

**You:**
```
Update the Acme Corp deal - increase value to $60,000 and set probability to 85%
```

**AI Response:**
```
I'll update the Acme Corp opportunity with:
- New value: $60,000
- New probability: 85%

[Action Card]
Update opportunity
```

**Result:**
```
✅ Opportunity updated successfully
```

---

### Example 8: Bulk Update Opportunities

**You:**
```
Set all opportunities in Discovery stage to priority "High"
```

**AI Response:**
```
I'll update all opportunities in the Discovery stage to High priority.

Found 5 opportunities to update. Proceed?

[Action Card - Requires Confirmation]
Update 5 opportunities
```

**You:** Click "Confirm"

**Result:**
```
✅ Updated 5 opportunities
```

---

## Advanced Examples

### Example 9: Create Pipeline with Complete Specification

**You:**
```
Create "Partner Sales Pipeline" with these exact stages:
1. Partner Referral (#3b82f6 - blue)
2. Initial Contact (#10b981 - green)
3. Needs Assessment (#f59e0b - amber)
4. Solution Design (#8b5cf6 - purple)
5. Proposal Sent (#ec4899 - pink)
6. Contract Review (#06b6d4 - cyan)
7. Won (#84cc16 - lime)
8. Lost (#ef4444 - red)
```

**AI Response:**
```
Excellent! Creating "Partner Sales Pipeline" with 8 precisely defined stages.

[Action Card]
Create pipeline: Partner Sales Pipeline
```

**Result:**
```
✅ Pipeline "Partner Sales Pipeline" created successfully with 8 stages
```

---

### Example 10: Complex Opportunity with All Fields

**You:**
```
Create a comprehensive opportunity:
- Title: "Global Enterprises - 3-Year Platform License"
- Value: $500,000
- Currency: USD
- Pipeline: Enterprise Sales Pipeline
- Stage: Negotiation
- Contact: [existing contact ID or name]
- Company: Global Enterprises
- Expected Close Date: March 31, 2024
- Probability: 65%
- Priority: High
- Status: Open
- Source: Referral
- Tags: enterprise, multi-year, strategic
- Description: Large enterprise deal for 3-year platform license with 500 users
```

**AI Response:**
```
Creating comprehensive opportunity with all details...

[Action Card]
Create opportunity: Global Enterprises - 3-Year Platform License
```

**Result:**
```
✅ Opportunity "Global Enterprises - 3-Year Platform License" created worth $500,000
```

---

## Smart Features

### 1. **Context-Aware Assistance**
MrMorris AI knows what page you're on and can make intelligent suggestions:

**On Contacts Page:**
```
You: "Create a deal for this contact"
AI: "I see you're viewing John Smith. I'll create an opportunity linked to John Smith..."
```

**On Pipelines Page:**
```
You: "Add an opportunity here"
AI: "I see you're on the Enterprise Sales Pipeline. Which stage should this go in?"
```

---

### 2. **Natural Language Understanding**

You can be casual or formal:

❌ **Don't need to be precise:**
- "make a pipeline thing for sales"
- "add deal acme 50k"
- "move that deal to next stage"

✅ **AI understands context:**
- Creates pipeline with common sales stages
- Creates opportunity with inferred details
- Identifies which opportunity you mean

---

### 3. **Error Recovery**

**If you miss required info:**
```
You: "Create a pipeline"
AI: "I'd love to help! What should we call this pipeline? And what stages should it have?"
```

**If something goes wrong:**
```
AI: "❌ Failed to create pipeline. Error: Pipeline name must be unique."
AI: "Let's try a different name. What would you like to call it instead?"
```

---

## Best Practices

### ✅ DO:
1. **Be specific about values**
   - ✅ "Create deal worth $50,000"
   - ❌ "Create a big deal"

2. **Provide colors for stages**
   - ✅ "Add 'Negotiation' stage in orange"
   - ❌ "Add a stage" (AI will ask for color)

3. **Use clear deal titles**
   - ✅ "Acme Corp - Annual License Renewal"
   - ❌ "Deal 1"

4. **Specify pipelines and stages clearly**
   - ✅ "Move to Proposal stage in Enterprise Pipeline"
   - ❌ "Move it forward"

### ❌ AVOID:
1. **Vague requests without context**
   - ❌ "Update the deal" (Which deal?)
   - ✅ "Update Acme Corp deal value to $60k"

2. **Incomplete stage definitions**
   - ❌ "Create pipeline with 5 stages" (What are they called?)
   - ✅ "Create pipeline with Lead, Qualified, Proposal, Won, Lost"

3. **Ambiguous references**
   - ❌ "Delete that opportunity" (Which one?)
   - ✅ "Delete the TechStart Inc opportunity"

---

## Common Use Cases

### Use Case 1: Setting Up New Workspace
```
1. "Create a standard B2B sales pipeline"
2. "Add a 'Follow-up' stage after Qualified"
3. "Set this as the default pipeline"
4. "Create an opportunity for our biggest prospect worth $100k"
```

### Use Case 2: Managing Active Deals
```
1. "Show me all opportunities in Negotiation"
2. "Move Acme Corp deal to Closed Won"
3. "Update all Discovery stage deals to High priority"
4. "What's the total value in the pipeline?"
```

### Use Case 3: Pipeline Optimization
```
1. "Create a 'Fast Track' pipeline with 3 stages"
2. "Reorder stages: Demo, Proposal, Close"
3. "Delete the 'On Hold' stage"
4. "Add 'Contract Sent' between Proposal and Close"
```

---

## Troubleshooting

### Issue: "Pipeline ID is required"
**Solution:** When updating/deleting pipelines, be specific:
- ❌ "Delete the pipeline"
- ✅ "Delete Enterprise Sales Pipeline"

### Issue: "Stage ID is required"
**Solution:** Specify the pipeline when working with stages:
- ❌ "Delete Proposal stage"
- ✅ "Delete Proposal stage from Enterprise Pipeline"

### Issue: "Opportunity value is required"
**Solution:** Always include a value when creating deals:
- ❌ "Create deal for Acme Corp"
- ✅ "Create $50k deal for Acme Corp"

### Issue: Action card doesn't appear
**Solution:**
1. Check that you provided all required info
2. AI will ask questions if missing data
3. Answer the questions, then the action card will appear

---

## Tips for Power Users

### 1. **Batch Operations**
```
"Create 5 opportunities:
1. Acme - $50k - Discovery
2. TechCorp - $75k - Qualified
3. StartupXYZ - $25k - Proposal
4. Enterprise Co - $200k - Negotiation
5. SMB Inc - $15k - Discovery"
```

### 2. **Template Pipelines**
```
"Create 'SaaS Sales' pipeline with:
- Free Trial (blue)
- Demo Scheduled (green)
- Decision Maker Engaged (yellow)
- Pricing Discussed (orange)
- Contract Sent (purple)
- Active Customer (lime)
- Churned (red)"
```

### 3. **Quick Updates**
```
"Update all opportunities:
- In Discovery → set probability to 20%
- In Qualified → set probability to 40%
- In Proposal → set probability to 60%
- In Negotiation → set probability to 80%"
```

### 4. **Cleanup Operations**
```
"Delete all opportunities in Lost stage older than 90 days"
"Archive Closed Won deals from 2023"
"Merge duplicate opportunities for Acme Corp"
```

---

## Color Reference for Stages

Use these color codes when creating stages:

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Blue | #3b82f6 | Early stages (Lead, Discovery) |
| Green | #10b981 | Qualified, Active |
| Yellow | #eab308 | Proposal, Quote Sent |
| Orange | #f97316 | Negotiation, Final Steps |
| Lime | #84cc16 | Won, Success |
| Red | #ef4444 | Lost, Rejected |
| Purple | #8b5cf6 | Custom stages |
| Pink | #ec4899 | Partner/Referral |
| Cyan | #06b6d4 | Review, Approval |
| Gray | #6b7280 | On Hold, Paused |

---

## Integration with Existing Features

### Works Seamlessly With:
- **Contact Management**: Link opportunities to contacts
- **Company Management**: Associate deals with companies
- **Tags**: Organize opportunities with tags
- **Custom Fields**: Add custom data to opportunities (future)
- **Analytics**: Track pipeline metrics (future)
- **Email**: Auto-log communications (future AI feature)

---

## What Makes This Better Than Copper CRM?

### AI-Powered Advantages:
1. **Conversational Interface**: Talk to your CRM naturally
2. **Context Understanding**: AI knows what you mean
3. **Bulk Operations**: Update 100 deals with one command
4. **Smart Suggestions**: AI recommends next actions (coming soon)
5. **Auto-Logging**: AI logs emails as activities (coming soon)
6. **Predictive Analytics**: AI predicts close probability (coming soon)
7. **Data Enrichment**: AI fills missing fields (coming soon)

### Traditional CRM Limitations:
- ❌ Click through 5 forms to create a deal
- ❌ No natural language understanding
- ❌ Bulk operations require CSV import
- ❌ No intelligent suggestions

### MrMorris AI Benefits:
- ✅ Create deal in one sentence
- ✅ "Create 10 opportunities" - done instantly
- ✅ AI asks smart follow-up questions
- ✅ AI suggests next steps based on deal stage

---

## Future AI Capabilities (Coming Soon)

These features are in the blueprint and will be added:

### 1. **Auto-Log Emails**
```
AI: "I noticed you received an email from Acme Corp. Should I log this to their opportunity?"
```

### 2. **Close Probability Prediction**
```
AI: "Based on activity and engagement, this deal has a 78% close probability (AI-calculated)"
```

### 3. **Next Action Suggestions**
```
AI: "This deal has been in Proposal for 14 days with no activity. Suggested actions:
1. Send follow-up email
2. Schedule check-in call
3. Offer limited-time discount"
```

### 4. **Data Enrichment**
```
AI: "I found company information for Acme Corp. Should I auto-fill: Industry (Technology), Size (500 employees), Revenue ($50M)?"
```

### 5. **Deal Risk Detection**
```
AI: "⚠️ Risk Alert: TechStart deal shows warning signs:
- No activity in 21 days
- Email response time increased 3x
- Competitor mentioned in last email
Recommended: Schedule urgent call"
```

### 6. **Smart Notifications**
```
AI: "🔥 Hot Lead Alert: Acme Corp opened your proposal 3 times today. Perfect time for follow-up!"
```

---

## Getting Started Checklist

- [ ] Open MrMorris AI chatbot (click chat icon)
- [ ] Create your first pipeline: "Create a sales pipeline"
- [ ] Add custom stages to match your process
- [ ] Create a test opportunity to try it out
- [ ] Move the opportunity through stages
- [ ] Update opportunity value and probability
- [ ] Link opportunity to a contact/company
- [ ] Try bulk operations on multiple deals
- [ ] Export your pipeline data for analysis

---

## Need Help?

**Ask MrMorris AI directly:**
```
"How do I create a pipeline?"
"What fields can I set on an opportunity?"
"Show me examples of pipeline creation"
"What's the difference between a stage and a pipeline?"
```

**Common Questions:**

**Q: Can I have multiple pipelines?**
A: Yes! Create separate pipelines for different products, regions, or sales processes.

**Q: How many stages can a pipeline have?**
A: 1-20 stages per pipeline.

**Q: Can I delete a pipeline with opportunities in it?**
A: No, you must first move or delete all opportunities.

**Q: Can I reorder stages after creating them?**
A: Yes! Use: "Reorder Enterprise Pipeline stages: Lead, Demo, Proposal, Close"

**Q: How do I set a default pipeline?**
A: "Set Enterprise Sales Pipeline as default"

**Q: Can I link an opportunity to multiple contacts?**
A: Currently one primary contact, but you can add notes about other stakeholders.

---

## Summary

MrMorris AI makes pipeline management effortless through natural conversation. Instead of clicking through forms, just tell the AI what you want to do:

- **Create pipelines** in seconds with custom stages
- **Manage opportunities** conversationally
- **Bulk operations** without CSV imports
- **Smart assistance** that understands context

Start chatting with MrMorris AI today and experience the future of CRM management!
