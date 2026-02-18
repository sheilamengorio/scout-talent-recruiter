# Scout Talent Chatbot - Testing Guide

## Testing Lead Collection Flow

### Expected Behavior

The chatbot should ask for contact details (name, email, mobile, company) when:

1. User explicitly says "yes" to speaking with a specialist
2. User asks to be connected with someone
3. User shows interest in Scout Talent services
4. User says phrases like:
   - "I'd like help"
   - "Connect me with someone"
   - "I'm interested"
   - "Tell me more"
   - "I want to learn more about your services"

### Test Scenarios

#### Scenario 1: Direct Request for Help
```
User: "I need help hiring truck drivers in Adelaide"
AI: Should provide advice AND ask "Would you like to speak with a specialist?"
User: "Yes"
AI: "Great! I'll have a specialist reach out. What's your name, email, mobile number, and company?"
```

#### Scenario 2: Interest in Services
```
User: "Tell me about your recruitment services"
AI: Should explain services AND ask "Would you like to speak with a specialist?"
User: "Yes, I'm interested"
AI: "Great! I'll have a specialist reach out. What's your name, email, mobile number, and company?"
```

#### Scenario 3: Partial Information Provided
```
User: "I'd like to speak with someone. My name is John"
AI: Should ask for remaining details: "Thanks John! What's your email, mobile number, and company name?"
```

### Required Fields

The chatbot MUST collect all four fields before creating a lead:
1. ✓ Full name
2. ✓ Email address
3. ✓ Mobile number
4. ✓ Company name

### Debugging

Check server logs for:
- `✓ Function called by AI: extract_lead_information` - Lead extraction triggered
- `✓ Arguments: {...}` - Data being collected
- `ℹ No function call in this response` - AI didn't extract lead data
- `Lead ready: true` - All required fields collected
- `✓ Lead created successfully` - Salesforce lead created

### Common Issues

1. **AI not asking for details**: User didn't express clear interest
   - Solution: User should say "yes" or "I'm interested" when offered specialist connection

2. **Missing fields**: Partial information provided
   - Solution: AI should keep asking for missing fields

3. **Lead not created**: Validation failed
   - Check server logs for validation errors
   - Ensure all four fields are present

### Guardrails Testing

Test that chatbot refuses:
- ✗ Off-topic requests (jokes, general knowledge, politics)
- ✗ Profanity or inappropriate language
- ✗ Questions about competitors
- ✗ Requests for made-up statistics or case studies

Expected response: Professional redirect to recruitment topics
