# MrMorris AI Chatbot Guide

## Overview

The MrMorris AI chatbot is your intelligent CRM assistant that can help you manage contacts, companies, and perform various tasks through natural conversation.

## Important: How the Chatbot Works

The chatbot will **always collect all required information** before attempting to perform an action. If you don't provide all the necessary details, it will ask you for them.

---

## Available Actions

### 📇 Contact Management

#### 1. Create Contact
**Required Information:**
- First Name
- Last Name

**Optional Information:**
- Email
- Phone
- Company
- Job Title
- Status (lead, prospect, customer, inactive)
- Tags
- Source

**Example Conversations:**
```
You: "Add a new contact John Doe with email john@example.com"
AI: "Got it! I'll create a contact with:
     - First Name: John
     - Last Name: Doe
     - Email: john@example.com

     Creating the contact now..."
```

```
You: "Create contact Agsssk with email gaffarsk273@gmail.com"
AI: "I'll help you create a contact with email gaffarsk273@gmail.com.

     To complete this, I need to clarify: Is 'Agsssk' the first name, last name, or full name?

     If it's the full name, what should I use for the first and last name separately?"

You: "Agsssk is the first name, use 'Khan' as last name"
AI: "Perfect! Creating contact:
     - First Name: Agsssk
     - Last Name: Khan
     - Email: gaffarsk273@gmail.com

     Creating the contact now..."
```

#### 2. Update Contact
**Required:** Contact ID
**Optional:** Any contact fields to update

**Example:**
```
You: "Update John Doe's email to newemail@example.com"
AI: "I'll update the email for John Doe. Let me find that contact..."
```

#### 3. Delete Contact
**Required:** Contact ID or contact name

**Example:**
```
You: "Delete the contact John Doe"
AI: "⚠️ Are you sure you want to delete John Doe? This action cannot be undone."
```

---

### 🏢 Company Management

#### 1. Create Company
**Required:** Company Name
**Optional:** Industry, Website, Phone, Employee Count, Status

**Example:**
```
You: "Create a company called Acme Corp in the software industry"
AI: "Creating company:
     - Name: Acme Corp
     - Industry: Software

     Creating the company now..."
```

#### 2. Update Company
**Required:** Company ID
**Optional:** Any company fields to update

#### 3. Delete Company
**Required:** Company ID

---

### 📊 Analytics & Export

#### Get Contact Statistics
```
You: "Show me contact statistics"
AI: "Here are your contact statistics:
     - Total: 150
     - Leads: 45
     - Prospects: 30
     - Customers: 75
     - Inactive: 0"
```

#### Export Contacts
```
You: "Export all contacts to CSV"
AI: "Exporting 150 contacts to CSV format..."
```

#### Analyze Contacts
```
You: "Analyze my contact data"
AI: "Contact Analysis:
     - 80% have email addresses
     - 60% have phone numbers
     - Top sources: Website (40%), Referral (30%), Event (20%)
     - Status breakdown: ..."
```

---

## Tips for Best Results

### ✅ Do's:
1. **Provide complete names** - "John Doe" instead of just "John"
2. **Be specific** - "Update email to john@example.com for contact ID 123"
3. **Confirm destructive actions** - The AI will ask before deleting
4. **Use natural language** - The AI understands context

### ❌ Don'ts:
1. **Don't use single names** - "Add contact Mike" → AI will ask for last name
2. **Don't assume** - Be clear about what you want
3. **Don't rush** - Let the AI collect all needed info

---

## Common Scenarios

### Scenario 1: Quick Contact Creation
```
You: "Add Sarah Johnson, email sarah@gmail.com, works at Google"
AI: "Creating contact:
     ✓ First Name: Sarah
     ✓ Last Name: Johnson
     ✓ Email: sarah@gmail.com
     ✓ Company: Google

     Creating the contact now..."
```

### Scenario 2: Incomplete Information
```
You: "Add a contact named Alex"
AI: "I'll help you add a contact named Alex.

     Before I create this contact, I need:
     1. **First Name**: Is Alex the first name?
     2. **Last Name**: What is their last name?

     Optional: You can also provide their email, phone, or company if you'd like."
```

### Scenario 3: Bulk Operations
```
You: "Delete all contacts with status inactive"
AI: "⚠️ I found 5 contacts with status 'inactive'.

     Are you sure you want to delete these 5 contacts? This action cannot be undone.

     Type 'yes' to confirm or 'no' to cancel."
```

---

## Error Messages Explained

### "Missing required information"
**Meaning:** The action needs more data to proceed.
**Solution:** Provide the requested information (usually firstName and lastName for contacts).

### "Failed to create contact - Request failed with status code 400"
**Meaning:** The backend rejected the request due to validation errors.
**Common causes:**
- Missing firstName or lastName
- Invalid email format
- Missing required fields

**Solution:** The AI will inform you what's missing and ask for it.

### "Contact ID is required"
**Meaning:** You're trying to update/delete a contact but haven't specified which one.
**Solution:** Provide the contact's name or ID.

---

## Advanced Features

### Context Awareness
The chatbot knows:
- Which workspace you're in
- Which page you're on (contacts, companies, pipelines)
- Which items you have selected

```
[On Contacts page with 3 contacts selected]
You: "Export these"
AI: "I see you have 3 contacts selected. Exporting them to CSV now..."
```

### Smart Name Parsing
The AI can intelligently parse names:
```
"John Doe" → First: John, Last: Doe
"Dr. Sarah Smith" → First: Sarah, Last: Smith (Dr. can be added as title)
"Mike" → AI asks for clarification
```

---

## Feedback & Support

If the chatbot isn't working as expected:
1. Make sure you're providing all required information
2. Check that you have the necessary permissions
3. Try being more specific in your request
4. If the issue persists, contact support

---

**Last Updated:** 2025-12-06
**Version:** 1.0
