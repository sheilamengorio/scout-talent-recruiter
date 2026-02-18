# Refactor Summary - Intent-Based Lead Creation

## ✅ COMPLETED CHANGES

### 1. **New Intent Scoring System** (`services/intentScoring.js`)

**Purpose:** Automatically detect high-intent users without asking for contact details

**How it works:**
- Scores users 0-100 based on behavioral + text signals
- **Behavioral signals:**
  - TLP regenerations (2+) → +25
  - Improvement actions used (2+) → +15
  - Active session time (>90s) → +10

- **Text signals:**
  - "Not getting applicants" → +25
  - "Urgent/ASAP" → +20
  - "Best platform/where to post" → +15
  - **"Need help"** → +40
  - Senior/niche roles → +15

**Intent levels:**
- Low: 0-39
- Medium: 40-59
- **High: 60-100** ← Triggers automatic lead creation

---

### 2. **Updated Salesforce Integration** (`services/salesforce.js`)

**Key Changes:**

✅ **LeadSource = "Free Talent Landing Page App"** (fixed constant)

✅ **Minimal fields only:**
- FirstName (or "Unknown")
- LastName (or "Unknown")
- Email (if provided, can be null)
- Phone (if provided, can be null)
- Company (or "Unknown")
- Description (contains: user needs, intent score, intent reasons, job details)
- LeadSource
- Status

✅ **Duplicate handling:**
- Searches by email if provided
- Updates existing lead (appends to Description)
- Creates new lead if no email or not found

✅ **Removed:**
- Industry field
- NumberOfEmployees field
- Conversation transcript attachment
- Required contact validation

---

### 3. **Updated Lead Creation Logic** (`server.js`)

**OLD Behavior:**
- Wait for user to say "yes" to speaking with specialist
- Ask for: name, email, mobile, company
- Validate all 4 fields present
- Create lead when complete

**NEW Behavior:**
- Calculate intent score on every message
- **Automatically create lead when score >= 60**
- No consent required, no asking for details
- Creates lead with whatever contact info is available (can be empty)
- Shows transparent message: "Based on what you've shared, our team can help. Someone may reach out shortly."

**Flow:**
1. User chats → Intent score calculated
2. Score >= 60 → Lead created silently
3. User sees transparent message
4. Conversation continues normally

---

## 🔄 ALIGNMENT WITH PRODUCT GOALS

| Requirement | Status | Implementation |
|------------|--------|----------------|
| Intent scoring (0-100) | ✅ DONE | `intentScoring.js` with behavioral + text signals |
| Auto-create lead at score >= 60 | ✅ DONE | `server.js` triggers automatically |
| LeadSource = "Free Talent Landing Page App" | ✅ DONE | `salesforce.js` line 122 |
| Minimal Salesforce fields | ✅ DONE | Only required fields sent |
| Duplicate handling by email | ✅ DONE | Search + update existing |
| No manual lead form | ✅ DONE | Removed contact collection requirement |
| Transparent messaging | ✅ DONE | User sees message after lead creation |

---

## 🚧 STILL TO DO

### Step 1: Job Intake Flow
**Status:** NOT STARTED

**Needed:**
- Update AI prompt to collect:
  - Role title
  - Location / work type
  - Industry (optional)
  - Seniority (optional)
  - Salary range (optional)
  - Must-have skills (optional)
  - Hiring urgency (optional)
  - "What's not working" notes (optional)

### Step 2: Insights Generation
**Status:** NOT STARTED

**Needed:**
- Generate role-specific insights:
  - What benefits to emphasize
  - What content to post
  - Which platforms to use
  - 5 quick improvement actions
  - 2 experiments to test

### Step 3: TLP Iteration Support
**Status:** PARTIALLY DONE

**Current:** Can generate TLP once
**Needed:**
- Track regeneration count
- Update intent score when user regenerates
- Allow iteration/modification

---

## 🧪 TESTING

### Test Scenario 1: High Intent (Auto Lead Creation)

**User input:**
```
"I need help hiring a senior developer ASAP.
We're not getting applicants and I'm not sure where to post."
```

**Expected:**
- Intent score: ~60+ (need help +40, urgent +20, applicant issues +25, senior role +15 = 100)
- Lead created automatically
- User sees: "Based on what you've shared, our team can help. Someone may reach out shortly."
- Salesforce lead has:
  - LeadSource = "Free Talent Landing Page App"
  - Description contains intent score + reasons
  - FirstName/LastName = "Unknown"/"Unknown"
  - Email/Phone = null

### Test Scenario 2: Medium Intent (No Lead)

**User input:**
```
"Can you help me create a job ad for a truck driver?"
```

**Expected:**
- Intent score: ~15 (senior role check might trigger)
- NO lead created (score < 60)
- Normal conversation continues

### Test Scenario 3: Contact Info Provided

**User input:**
```
"I need urgent help hiring. I'm John Smith from ABC Corp, john@abc.com"
```

**Expected:**
- Intent score: ~60+ (need help +40, urgent +20)
- Lead created automatically
- Salesforce lead has:
  - FirstName = "John"
  - LastName = "Smith"
  - Email = "john@abc.com"
  - Company = "ABC Corp"
  - Intent data in Description

---

## 📊 How Intent Scoring Works (Examples)

### Example 1: Score = 100
**Conversation:**
- "I need help finding candidates for a Head of Engineering role"
- "We're not getting applicants"
- "It's urgent, need to fill ASAP"

**Scoring:**
- Need help → +40
- Senior role (Head of) → +15
- Not getting applicants → +25
- Urgent → +20
- **Total: 100**
- **Action: CREATE LEAD ✓**

### Example 2: Score = 35
**Conversation:**
- "Can you create a job ad for me?"
- "It's for a retail assistant in Sydney"

**Scoring:**
- Active time >90s → +10 (maybe)
- Platform question → +15 (maybe)
- **Total: ~25-35**
- **Action: NO LEAD ✗**

---

## 🔧 Configuration

### Environment Variables (unchanged)
```
OPENAI_API_KEY=...
SALESFORCE_USERNAME=...
SALESFORCE_PASSWORD=...
SALESFORCE_SECURITY_TOKEN=...
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

### Intent Score Thresholds (adjustable in code)
```javascript
// services/intentScoring.js
Low: 0-39
Medium: 40-59
High: 60-100  ← Lead creation threshold
```

---

## 💡 Next Steps

1. **Test the refactored system:**
   - Restart server: `node server.js`
   - Test high-intent scenarios
   - Verify Salesforce lead creation
   - Check lead data matches spec

2. **Add Job Intake Flow:**
   - Update AI prompt in `services/openai.js`
   - Add structured question sequence
   - Extract job data for Salesforce Description

3. **Add Insights Generation:**
   - Create insights module or add to knowledge base
   - Generate role-specific advice
   - Include in conversation flow

4. **Add Regeneration Tracking:**
   - Track TLP regenerations in session data
   - Update intent score on regeneration
   - Allow users to iterate on TLP

---

## 🎯 Summary

**What Changed:**
- ✅ Intent-based lead creation (automatic at score >= 60)
- ✅ Salesforce fields match product spec
- ✅ No manual contact collection required
- ✅ Transparent user messaging
- ✅ Duplicate handling by email

**What's Still Needed:**
- Job intake structured flow
- Insights generation
- TLP regeneration tracking

**Architecture:** Clean refactor of existing code, minimal breaking changes, modular design
