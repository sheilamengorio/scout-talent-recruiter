# Complete Testing Guide - Scout Talent TLP App

## 🎯 What's Been Built

Your application now fully aligns with the product goals:

✅ **Step 1: Job Intake** - Lightweight conversational information gathering
✅ **Step 2: Insights Generation** - Role-specific actionable recruitment advice
✅ **Step 3: TLP Generation** - Professional Talent Landing Pages
✅ **Step 4: Intent Scoring** - Automatic high-intent detection (0-100 score)
✅ **Step 5: Salesforce Lead Creation** - Automatic at score >= 60

---

## 🧪 Complete Test Scenarios

### Test 1: Full Happy Path (Job Intake → Insights → TLP → Lead Creation)

**User Journey:**
```
User: "I need help hiring a senior developer ASAP. We're not getting enough applicants."

Bot: [Asks about location and gathers job details]

User: "It's for Melbourne, hybrid role. Need someone with React experience."

Bot: [Generates role-specific insights]
     [Shows benefits to emphasize, platforms, 5 quick actions, 2 experiments]
     "Would you like me to generate a professional Talent Landing Page for this role?"

User: "Yes please"

Bot: [Generates TLP using template]
     [Shows formatted job ad]
```

**Expected Backend:**
- ✓ `extract_job_information` called with role data
- ✓ Intent score: ~80-100
  - "need help" → +40
  - "senior" → +15
  - "ASAP" → +20
  - "not getting applicants" → +25
- ✓ **Salesforce lead created automatically** (score >= 60)
- ✓ User sees: "Based on what you've shared, our team can help. Someone may reach out shortly."

**Salesforce Lead Data:**
```
FirstName: "Unknown"
LastName: "Unknown"
Email: null
Phone: null
Company: "Unknown"
LeadSource: "Free Talent Landing Page App"
Description:
  Intent Score: 100/100 (high)
  Intent Signals: Explicitly asked for help, Expressed urgency, Mentioned difficulty getting applicants, Mentioned senior or niche role
  Role: Senior Developer
  Location: Melbourne
```

---

### Test 2: Medium Intent (No Lead Creation)

**User Journey:**
```
User: "Can you help me write a job ad for a retail assistant?"

Bot: [Asks about location]

User: "Sydney CBD, full-time"

Bot: [Generates insights for retail role]
     [Offers to create TLP]

User: "Yes, generate it"

Bot: [Creates TLP]
```

**Expected Backend:**
- ✓ `extract_job_information` called
- ✓ Intent score: ~10-20 (too low for lead)
- ✓ **NO lead created** (score < 60)
- ✓ No transparent message shown
- ✓ Normal conversation continues

---

### Test 3: High Intent with Contact Info Provided

**User Journey:**
```
User: "I'm struggling to hire a Head of Marketing urgently. I'm John from ABC Corp."

Bot: [Acknowledges and asks about location]

User: "It's in Brisbane. My email is john@abccorp.com if you need it."

Bot: [Generates insights]
```

**Expected Backend:**
- ✓ Intent score: ~80+
  - "struggling" → +25
  - "Head of" (senior) → +15
  - "urgently" → +20
- ✓ `extract_lead_information` AND `extract_job_information` called
- ✓ **Salesforce lead created** with actual contact data:

```
FirstName: "John"
LastName: "Unknown"
Email: "john@abccorp.com"
Company: "ABC Corp"
LeadSource: "Free Talent Landing Page App"
Description:
  Intent Score: 80/100 (high)
  Intent Signals: [list]
  Role: Head of Marketing
  Location: Brisbane
```

---

### Test 4: TLP Regeneration (Triggers Intent Scoring)

**User Journey:**
```
User: "Create a job ad for a truck driver"

Bot: [Collects info and generates TLP]

User: "Can you regenerate that with more focus on benefits?"

Bot: [Regenerates TLP]

User: "Actually, regenerate it again..."

Bot: [Regenerates TLP - 2nd time]
```

**Expected Backend:**
- ✓ Session tracks: `tlpRegenerations = 2`
- ✓ Intent score increases: +25 for 2+ regenerations
- ✓ If score >= 60, lead created

**Note:** Currently regeneration tracking needs to be implemented. This is a TODO item.

---

### Test 5: Platform Question (Intent Signal)

**User Journey:**
```
User: "Where should I post a job ad for a software engineer?"

Bot: [Asks about role details]

User: "Senior role in Sydney"

Bot: [Generates insights with platform recommendations]
```

**Expected Backend:**
- ✓ Intent score includes: +15 for "where should I post"
- ✓ Platform question detected in text analysis
- ✓ May or may not create lead depending on total score

---

### Test 6: Minimal Information (Proceed Anyway)

**User Journey:**
```
User: "I need a job ad for an accountant"

Bot: "Where is this role based?"

User: "Melbourne"

Bot: [Generates insights immediately - doesn't ask for all optional fields]
```

**Expected:**
- ✓ Bot proceeds with just role + location
- ✓ Doesn't ask for all optional fields if not provided
- ✓ Generates insights anyway

---

## 🔍 How to Monitor Intent Scoring

### Server Logs to Watch:

```bash
node server.js
```

**Good Test Output:**
```
=== New Chat Request (3 messages) ===
User message: I need help hiring a senior developer ASAP
✓ Function called by AI: extract_job_information
✓ Arguments: {
  "role_title": "Senior Developer",
  "hiring_urgency": "ASAP"
}
Job data: {...}
Intent: Score: 80/100 (high) | Reasons: Explicitly asked for help, Expressed urgency, Mentioned senior or niche role

🎯 High intent detected - Creating Salesforce lead automatically...
Creating Salesforce lead...
✓ Lead created: 00Q...
```

**Low Intent Output:**
```
=== New Chat Request (2 messages) ===
User message: Can you create a job ad?
✓ Function called by AI: extract_job_information
Intent: Score: 15/100 (low) | Reasons: Active for 45 seconds
ℹ No lead created (score below threshold)
```

---

## 📊 Intent Scoring Reference

### Behavioral Signals:
| Signal | Score | Trigger |
|--------|-------|---------|
| TLP regenerations (2+) | +25 | Track regeneration requests |
| Improvement actions used (2+) | +15 | NOT YET IMPLEMENTED |
| Active session >90s | +10 | Automatic time tracking |

### Text Signals:
| Signal | Score | Keywords |
|--------|-------|----------|
| Applicant issues | +25 | "not getting applicants", "no candidates", "hard to hire" |
| Urgency | +20 | "urgent", "ASAP", "immediately" |
| Platform questions | +15 | "best platform", "where should I post" |
| **Help requests** | **+40** | "need help", "can you help", "need strategy" |
| Senior/niche roles | +15 | "executive", "head of", "senior", "specialist" |

### Score Levels:
- **0-39:** Low (no lead)
- **40-59:** Medium (no lead)
- **60-100:** **High (CREATE LEAD)**

---

## ✅ Expected Salesforce Data

### Minimum Lead (No Contact Info):
```javascript
{
  FirstName: "Unknown",
  LastName: "Unknown",
  Email: null,
  Phone: null,
  Company: "Unknown",
  LeadSource: "Free Talent Landing Page App", // FIXED CONSTANT
  Status: "Open - Not Contacted",
  Description: "Intent Score: 85/100 (high)\nIntent Signals: ...\nRole: Senior Developer\nLocation: Sydney"
}
```

### Full Lead (With Contact Info):
```javascript
{
  FirstName: "John",
  LastName: "Smith",
  Email: "john@example.com",
  Phone: "0412345678",
  Company: "Example Corp",
  LeadSource: "Free Talent Landing Page App",
  Status: "Open - Not Contacted",
  Description: "User Needs: Not getting applicants\nIntent Score: 100/100 (high)\nIntent Signals: ...\nRole: Marketing Manager\nLocation: Brisbane"
}
```

### Duplicate Handling:
- If email exists → **Updates** existing lead (appends to Description)
- If no email → Always creates new lead

---

## �� Frontend Display

### TLP Format Test:
The TLP should display with:
- ✓ Proper line breaks preserved
- ✓ Section dividers (━━━) visible
- ✓ Bullet points displayed
- ✓ Monospace font for readability
- ✓ Copy-paste ready format

**If formatting looks bad:**
- Check `index.html` has `white-space: pre-wrap` (line 108)
- Check `font-family: 'Courier New', monospace` (line 109)

---

## 🚀 Quick Test Commands

### 1. Start Server:
```bash
cd /Users/sheilamariemengorio/Desktop/ALL/scout-talent-recruiter
node server.js
```

### 2. Open Browser:
```
http://localhost:3000
```

### 3. Quick High-Intent Test Message:
```
I need urgent help hiring a senior software engineer. We're not getting any applicants and need to fill this ASAP.
```

**Expected:** Intent score ~100, lead created immediately

### 4. Quick Low-Intent Test:
```
Can you create a job ad for a sales assistant?
```

**Expected:** Intent score ~10-20, no lead created

---

## 🐛 Troubleshooting

### Issue: No lead created even with high intent

**Check:**
1. Server logs show intent score
2. Score >= 60?
3. Salesforce credentials configured?
4. Check for errors in Salesforce connection

**Debug:**
```bash
# Check environment variables
echo $SALESFORCE_USERNAME
echo $SALESFORCE_PASSWORD
```

### Issue: TLP not formatted properly

**Fix:**
- Ensure `white-space: pre-wrap` in CSS
- Check browser console for errors
- Verify content is being passed correctly

### Issue: Job data not extracted

**Check server logs for:**
```
✓ Function called by AI: extract_job_information
```

If missing, AI didn't recognize the need to extract job data.

---

## 📝 TODO Items (Future Enhancements)

1. **TLP Regeneration Tracking** - Track when users regenerate TLPs for intent scoring
2. **Improvement Actions Tracking** - Track when users use suggested quick actions
3. **Session Persistence** - Use database instead of in-memory Map
4. **Admin Dashboard** - View intent scores and lead creation stats
5. **A/B Testing Framework** - Track which insights/TLPs perform best

---

## ✨ Success Criteria

Your implementation is successful if:

✅ Users can create job ads through conversational intake
✅ Insights are role-specific and actionable
✅ TLPs follow the Scout Talent template exactly
✅ High-intent users (score >= 60) create leads automatically
✅ Leads have LeadSource = "Free Talent Landing Page App"
✅ Users see transparent message after lead creation
✅ No manual lead form or consent required
✅ Duplicate emails update existing leads

---

## 🎯 Final Test Checklist

- [ ] Job intake works with just role + location
- [ ] Insights are generated and role-specific
- [ ] TLP follows template with proper formatting
- [ ] Intent scoring calculates correctly (check logs)
- [ ] Lead created automatically at score >= 60
- [ ] LeadSource is correct in Salesforce
- [ ] Transparent message shown to user
- [ ] Duplicate email updates existing lead
- [ ] No lead created for low intent (score < 60)
- [ ] Contact info captured if voluntarily shared

---

**Ready to Test!** 🚀

Start the server and try the test scenarios above. Check server logs for intent scoring and Salesforce for lead creation.
