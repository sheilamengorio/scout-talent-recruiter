# Scout Talent Recruitment ChatBot

An AI-powered recruitment assistant that answers questions about Scout Talent's services, automatically detects leads through conversation, and creates Salesforce leads with full conversation context.

## Features

- ✅ **AI-Powered Chat**: ChatGPT-like interface for natural conversations about recruitment services
- ✅ **Knowledge Base**: Answers questions about Scout Talent's offerings, industries, and process
- ✅ **Intelligent Lead Detection**: Automatically identifies when prospects share contact information or express interest
- ✅ **Salesforce Integration**: Creates leads in Salesforce with full conversation transcript
- ✅ **Modern UI**: Beautiful, responsive chat interface with typing indicators
- ✅ **Function Calling**: Uses OpenAI's function calling to extract structured lead data

## Architecture

```
scout-talent-recruiter/
├── server.js                    # Main Express server
├── services/
│   ├── openai.js               # OpenAI integration with function calling
│   ├── salesforce.js           # Salesforce lead creation
│   └── leadDetector.js         # Lead detection and validation logic
├── knowledge/
│   └── scout-talent-info.js    # Knowledge base content (customize this!)
├── public/
│   └── index.html              # Frontend chat interface
├── package.json                # Dependencies
└── .env                        # Environment configuration
```

## Prerequisites

- Node.js (v14 or higher)
- npm
- OpenAI API key
- Salesforce account with API access

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd scout-talent-recruiter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Edit `.env` file with your credentials:
   ```
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Server Configuration
   PORT=3000

   # Salesforce Configuration
   SALESFORCE_USERNAME=your_salesforce_username@company.com
   SALESFORCE_PASSWORD=your_salesforce_password
   SALESFORCE_SECURITY_TOKEN=your_security_token
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   ```

4. **Customize the knowledge base**

   Edit `knowledge/scout-talent-info.js` with your actual company information:
   - Company overview
   - Services offered
   - Industries served
   - Value proposition
   - FAQs
   - Process details

## Getting Salesforce Credentials

### 1. Username & Password
- Your Salesforce login email and password

### 2. Security Token
To get your Salesforce security token:
1. Log into Salesforce
2. Click on your profile picture → Settings
3. In the left sidebar: Personal → Reset My Security Token
4. Click "Reset Security Token"
5. Check your email for the new security token

### 3. Login URL
- Production: `https://login.salesforce.com`
- Sandbox: `https://test.salesforce.com`

## Running the Application

Start the server:
```bash
npm start
```

The application will be available at: `http://localhost:3000`

You should see:
```
🚀 Scout Talent Recruitment ChatBot Started
Server running on: http://localhost:3000
Health check: http://localhost:3000/api/health

Features enabled:
  ✓ AI-powered chat with Scout Talent knowledge
  ✓ Automatic lead detection
  ✓ Salesforce integration

Environment:
  OpenAI API: ✓ Configured
  Salesforce: ✓ Configured
```

## API Endpoints

### POST /api/agent
Main chat endpoint for conversations

**Request:**
```json
{
  "conversation": [
    { "role": "user", "content": "What services do you offer?" }
  ]
}
```

**Response:**
```json
{
  "reply": "Scout Talent offers comprehensive recruitment services including..."
}
```

### GET /api/health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "services": {
    "api": "ok",
    "openai": "unknown",
    "salesforce": "unknown"
  }
}
```

To check Salesforce connection:
```
GET /api/health?checkSalesforce=true
```

### GET /api/info
System information endpoint

## How It Works

### 1. Knowledge-Based Responses
The AI is trained on Scout Talent's:
- Services and offerings
- Industry expertise
- Value proposition
- Recruitment process
- FAQs

### 2. Lead Detection
The AI automatically detects when prospects:
- Share contact information (name, email, phone)
- Mention company details
- Express interest in services
- Describe recruitment needs

### 3. Salesforce Lead Creation
When the conversation contains:
- ✅ Email address (valid format)
- ✅ Contact name
- ✅ Company name
- ✅ Some indication of interest (services or needs)

The system automatically:
1. Validates the lead data
2. Creates a Lead record in Salesforce
3. Attaches the full conversation transcript as a Task
4. Logs the lead creation (prevents duplicates)

### Lead Object Mapping

| Conversation Data | Salesforce Field |
|------------------|------------------|
| Contact Name | FirstName / LastName |
| Email | Email |
| Phone | Phone |
| Company Name | Company |
| Company Size | NumberOfEmployees |
| Industry | Industry |
| Services + Needs | Description |
| - | LeadSource = "Website Chat" |
| - | Status = "Open - Not Contacted" |

## Customization

### Update Knowledge Base
Edit `knowledge/scout-talent-info.js` to customize:
- Company information
- Services descriptions
- Industry list
- Value propositions
- FAQs
- Process details

### Modify Lead Threshold
Edit `services/leadDetector.js` → `isLeadReady()` function to change when leads are created.

Current threshold:
```javascript
const isLeadReady = (leadData) => {
  return (
    leadData.contact_email &&
    leadData.contact_name &&
    leadData.company_name &&
    (leadData.services_interested?.length > 0 || leadData.recruitment_needs)
  );
};
```

### Change AI Model
Edit `services/openai.js` → `getChatCompletion()`:
```javascript
model: 'gpt-4'  // Upgrade to GPT-4 for better quality
```

### Customize UI
Edit `public/index.html` to:
- Change colors and branding
- Add company logo
- Modify welcome message
- Adjust styling

## Testing

### Test Chat Functionality
1. Open `http://localhost:3000`
2. Ask: "What services does Scout Talent offer?"
3. Verify AI responds with knowledge base information

### Test Lead Detection
Have a conversation like:
```
User: "I'm looking for help hiring software engineers"
AI: [asks clarifying questions]
User: "My name is John Smith, email is john@example.com, I work at Acme Corp"
AI: [extracts information]
```

Check server logs for:
```
Function called by AI: extract_lead_information
Accumulated lead data: Name: John Smith | Email: john@example.com | Company: Acme Corp
🎯 Creating Salesforce lead...
✓ Lead created successfully: 00Q...
```

### Test Salesforce Integration
1. Complete a conversation with all required fields
2. Check Salesforce for the new Lead record
3. Verify the conversation transcript is attached as a Task

## Troubleshooting

### OpenAI API Errors
- Check your API key is valid
- Ensure you have credits/quota available
- Check the error in server logs

### Salesforce Authentication Failed
- Verify username and password are correct
- Ensure security token is appended to password in the login flow
- Check if your IP is whitelisted in Salesforce (if required)
- Try using sandbox URL if testing

### Lead Not Created
- Check server logs for validation errors
- Ensure all required fields are present
- Verify Salesforce credentials are working
- Check if lead was already created (duplicate prevention)

### Frontend Not Loading
- Verify server is running on port 3000
- Check for JavaScript console errors
- Clear browser cache
- Try a different browser

## Security Considerations

- ✅ API keys stored in environment variables (not committed to git)
- ✅ Input validation before Salesforce submission
- ✅ Error handling prevents sensitive data exposure
- ⚠️ Add rate limiting for production use
- ⚠️ Consider adding authentication for production
- ⚠️ Review data retention and privacy policies

## Next Steps

1. **Customize Knowledge Base**: Update `knowledge/scout-talent-info.js` with real Scout Talent information
2. **Configure Salesforce**: Add your actual Salesforce credentials to `.env`
3. **Test Thoroughly**: Have sample conversations and verify Salesforce lead creation
4. **Deploy**: Consider hosting on AWS, Heroku, or your preferred platform
5. **Monitor**: Track lead creation, conversation quality, and API usage

## Future Enhancements

- [ ] Add conversation persistence (database)
- [ ] Email notifications when leads are created
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Voice input capability
- [ ] Integration with calendars for booking demos
- [ ] Advanced lead scoring
- [ ] CRM notifications (Slack, Teams)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure knowledge base is properly configured

## License

ISC
