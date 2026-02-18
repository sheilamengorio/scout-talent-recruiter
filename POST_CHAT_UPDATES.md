# Post-Chat Update Feature Documentation

## Overview

The system now supports **post-lead-creation updates** to capture additional information that users provide after a Salesforce lead has been created.

---

## How It Works

### **Initial Lead Creation (Score >= 60)**
1. User shows high intent (score >= 60)
2. Lead created in Salesforce automatically
3. System tracks: `leadId` and whether contact data was provided
4. Conversation transcript attached as Task in Salesforce

### **Post-Creation Updates**
If the user continues chatting after lead creation and provides:
- Contact details (name, email, phone, company)
- Availability information
- Additional notes

The system will **automatically update the existing lead** instead of creating a new one.

---

## Features

### 1. **Transcript Attachment**

Every lead gets a conversation transcript attached as a Salesforce Task:

**Initial Lead Creation:**
- Subject: "Initial Chat Transcript"
- Full conversation up to lead creation point
- Attached as completed Task

**Post-Creation Update:**
- Subject: "Updated Chat Transcript"
- Full conversation including post-lead messages
- New Task created with updated transcript

### 2. **Contact Detail Updates**

If user provides contact info AFTER lead creation:

**Example:**
```
User: "I need urgent help hiring"
→ Lead created (score 60+) with Unknown/Unknown

User: "By the way, I'm John Smith from ABC Corp, john@abc.com"
→ Lead UPDATED with actual contact details
```

**Salesforce Updates:**
- FirstName: "Unknown" → "John"
- LastName: "Unknown" → "Smith"
- Email: null → "john@abc.com"
- Company: "Unknown" → "ABC Corp"

### 3. **Availability/Notes Appended**

Additional information gets appended to Description:

```
--- Post-Lead Update ---
Availability: ASAP
Additional Notes: [any extra info]
```

---

## Technical Implementation

### **Tracking Map** (`conversationLeads`)

```javascript
{
  conversationId: {
    leadId: "00Q...",
    contactDataProvided: false  // true once contact details are added
  }
}
```

### **Update Logic**

```javascript
// Only update if:
1. Lead was already created (alreadyCreated = true)
2. New contact data is provided
3. Contact data wasn't previously provided (!contactDataProvided)
```

This prevents redundant updates if user mentions contact details multiple times.

---

## Salesforce Structure

### **Lead Fields Updated:**
- `FirstName` - Parsed from contact_name
- `LastName` - Parsed from contact_name
- `Email` - Direct from contact_email
- `Phone` - Direct from contact_phone
- `Company` - From company_name
- `Description` - Appended with post-update info

### **Tasks Created:**
1. **Initial Chat Transcript** - At lead creation
2. **Updated Chat Transcript** - When post-update occurs

---

## Test Scenarios

### **Scenario 1: Contact Info Provided After Lead Creation**

```
Conversation:
User: "I need urgent help hiring a senior developer. Not getting applicants."

Bot: [Intent score: 85 → Lead created]
     "Based on what you've shared, our team can help. Someone may reach out shortly."

User: "Great! I'm Sarah Johnson from TechCorp, sarah@techcorp.com, 0412345678"

Bot: [Detects new contact info → Updates lead]
```

**Salesforce Result:**
- Lead updated with actual contact details
- Description appended with "Post-Lead Update"
- New Task: "Updated Chat Transcript"

### **Scenario 2: Availability Mentioned After Lead**

```
User: "Need help urgently"
→ Lead created

User: "We need someone to start within 2 weeks"
→ Lead updated with availability in Description
```

### **Scenario 3: No New Info (No Update)**

```
User: "Need help"
→ Lead created

User: "Can you generate a TLP?"
→ Normal conversation, no update needed
```

---

## Code Flow

```
POST /api/agent
    ↓
Calculate Intent Score
    ↓
Extract Contact/Job Data
    ↓
┌─ Score >= 60 AND NOT alreadyCreated?
│   YES → Create Lead + Attach Transcript + Track leadId
│         Add to conversationLeads Map
│         Show transparent message
│   NO  → Check if lead exists
│         ↓
│         Lead exists AND new contact data?
│         YES → Update Lead + Attach Updated Transcript
│         NO  → Continue normally
└─
```

---

## Server Logs

### **Lead Creation:**
```
🎯 High intent detected - Creating Salesforce lead automatically...
Creating Salesforce lead...
✓ Lead created: 00Q5g000001XyZ
✓ Initial Chat Transcript attached to lead
```

### **Post-Creation Update:**
```
📝 Updating lead with new contact information...
✓ Lead updated with contact details
✓ Updated Chat Transcript attached to lead
```

---

## Benefits

✅ **Capture Complete Information** - Get contact details even if provided late in conversation

✅ **No Duplicate Leads** - Updates existing lead instead of creating new one

✅ **Full Transcript History** - Both initial and updated transcripts saved

✅ **Availability Tracking** - Captures hiring urgency/timeline

✅ **Seamless UX** - Happens automatically, no user friction

---

## Limitations

1. **In-Memory Tracking** - `conversationLeads` Map resets on server restart
   - Solution: Use database in production

2. **No Duplicate Detection** - If user mentions email twice, won't redundantly update
   - Already handled via `contactDataProvided` flag

3. **Task Limits** - Salesforce has limits on Tasks per object
   - Unlikely to hit with 2 tasks per lead (initial + updated)

---

## Future Enhancements

1. **Persistent Storage** - Store `conversationLeads` in database
2. **Multiple Updates** - Track multiple post-updates (currently only first)
3. **Availability Parsing** - Smart detection of "next week", "ASAP", etc.
4. **Email Notifications** - Alert sales team when contact info added post-creation

---

## API Reference

### **New Function: `updateLeadPostCreation`**

```javascript
salesforceService.updateLeadPostCreation(leadId, updates, conversation)
```

**Parameters:**
- `leadId` (string) - Salesforce lead ID
- `updates` (object):
  ```javascript
  {
    contact_name: string,      // Optional
    contact_email: string,     // Optional
    contact_phone: string,     // Optional
    company_name: string,      // Optional
    availability: string,      // Optional
    additional_notes: string   // Optional
  }
  ```
- `conversation` (array) - Full conversation history

**Returns:**
```javascript
{
  success: boolean,
  leadId: string,
  message: string
}
```

---

## Configuration

No configuration needed - feature works automatically.

**Environment Variables:** (unchanged)
```
SALESFORCE_USERNAME=...
SALESFORCE_PASSWORD=...
SALESFORCE_SECURITY_TOKEN=...
```

---

## Summary

The post-chat update feature ensures:
- ✅ No information is lost even if provided after lead creation
- ✅ Full conversation history is preserved
- ✅ Salesforce leads are kept up-to-date
- ✅ Seamless, automatic process

**Test it:** Create a high-intent conversation, let it create a lead, then provide contact details in a follow-up message.
