# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies (Already Done ✅)
```bash
npm install
```

### Step 2: Configure Salesforce Credentials

Edit the `.env` file and replace these placeholders with your actual Salesforce credentials:

```bash
SALESFORCE_USERNAME=your_actual_email@company.com
SALESFORCE_PASSWORD=your_actual_password
SALESFORCE_SECURITY_TOKEN=your_actual_security_token
```

**How to get your Salesforce Security Token:**
1. Log into Salesforce
2. Click your profile picture → Settings
3. Personal → Reset My Security Token
4. Click "Reset Security Token"
5. Check your email for the token

### Step 3: Customize Knowledge Base (Optional but Recommended)

Edit `knowledge/scout-talent-info.js` and update:
- Company overview
- Services offered
- Industries served
- FAQs
- Value proposition

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
🚀 Scout Talent Recruitment ChatBot Started
Server running on: http://localhost:5000
```

(MongoDB is optional; if you see a message that it’s not running, the app still works.)

### Step 5: Open in Browser

Visit: **http://localhost:5000** (or the port in your `.env` if you set `PORT`)

### Step 6: Test the Chat

Try these sample conversations:

**Test 1: Knowledge Base**
```
You: "What services does Scout Talent offer?"
AI: [Responds with services from knowledge base]
```

**Test 2: Lead Detection**
```
You: "I need help hiring 5 software engineers"
AI: "I'd be happy to help! Could you tell me more about..."
You: "My name is John Smith, email john@test.com, I work at Acme Corp"
AI: [Extracts information and continues conversation]
```

Check your server logs - you should see:
```
Function called by AI: extract_lead_information
Accumulated lead data: Name: John Smith | Email: john@test.com | Company: Acme Corp
```

**Test 3: Salesforce Lead Creation**

Complete the conversation with all required info:
- ✅ Name
- ✅ Email
- ✅ Company name
- ✅ Some service interest or recruitment needs

When all requirements are met, check your Salesforce Leads - a new lead should be created!

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Chat interface loads at http://localhost:3000
- [ ] AI responds to questions about Scout Talent
- [ ] AI extracts contact information from conversation
- [ ] Salesforce lead created when threshold met
- [ ] Conversation transcript attached to Salesforce lead

## 🆘 Troubleshooting

**Server won't start:**
- Check that port 3000 is not in use
- Verify OpenAI API key is valid
- Check for syntax errors in modified files

**AI doesn't respond:**
- Verify OpenAI API key in `.env`
- Check server logs for errors
- Ensure you have OpenAI credits available

**Salesforce lead not created:**
- Verify Salesforce credentials in `.env`
- Check that security token is correct
- Ensure all required fields are provided in conversation
- Check server logs for Salesforce errors

**"Missing Salesforce credentials" error:**
- Make sure you updated the `.env` file
- Restart the server after changing `.env`
- Check that credentials don't have extra spaces

## 📊 Monitoring

Watch the server logs to see:
- Each chat request
- Function calls (lead extraction)
- Lead data accumulation
- Salesforce lead creation
- Any errors or warnings

## 🎯 Next Steps

1. **Customize the knowledge base** with real Scout Talent information
2. **Test thoroughly** with various conversation scenarios
3. **Check Salesforce** to verify leads are being created correctly
4. **Adjust lead threshold** if needed in `services/leadDetector.js`
5. **Deploy** to a production server when ready

## 📚 Full Documentation

See `README.md` for complete documentation including:
- Detailed architecture
- API endpoints
- Customization options
- Security considerations
- Deployment guidelines

---

**Need help?** Check the README.md file or review the server logs for detailed error messages.
