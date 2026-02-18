const jsforce = require('jsforce');
require('dotenv').config();

// Initialize Salesforce connection
let conn = null;

/**
 * Authenticate to Salesforce
 * @returns {Promise<Object>} Salesforce connection object
 */
async function authenticateToSalesforce() {
  try {
    if (conn && conn.accessToken) {
      // Reuse existing connection if still valid
      return conn;
    }

    conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    const securityToken = process.env.SALESFORCE_SECURITY_TOKEN;

    if (!username || !password || !securityToken) {
      throw new Error('Missing Salesforce credentials in environment variables');
    }

    // Login to Salesforce (password + security token)
    await conn.login(username, password + securityToken);

    console.log('✓ Successfully authenticated to Salesforce');
    return conn;
  } catch (error) {
    console.error('✗ Salesforce authentication failed:', error.message);
    throw new Error(`Salesforce authentication failed: ${error.message}`);
  }
}

/**
 * Parse full name into first and last name
 * @param {string} fullName - Full name to parse
 * @returns {Object} Object with firstName and lastName
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: 'Unknown' };
  }

  const nameParts = fullName.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: 'Unknown' };
  }

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return { firstName, lastName };
}

/**
 * Format conversation transcript for Salesforce
 * @param {Array} conversation - Array of conversation messages
 * @returns {string} Formatted transcript
 */
function formatConversationTranscript(conversation) {
  if (!conversation || !Array.isArray(conversation)) {
    return 'No conversation transcript available';
  }

  const timestamp = new Date().toISOString();
  let transcript = `=== Chat Transcript (${timestamp}) ===\n\n`;

  conversation.forEach((message, index) => {
    if (message.role === 'user' || message.role === 'assistant') {
      const role = message.role === 'user' ? 'User' : 'Scout Talent AI';
      transcript += `${role}: ${message.content}\n\n`;
    }
  });

  transcript += '=== End of Transcript ===';
  return transcript;
}

/**
 * Search for existing lead by email
 * @param {Object} connection - Salesforce connection
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} Existing lead or null
 */
async function findExistingLeadByEmail(connection, email) {
  if (!email) return null;

  try {
    const result = await connection.query(
      `SELECT Id, Description FROM Lead WHERE Email = '${email}' LIMIT 1`
    );

    if (result.records && result.records.length > 0) {
      return result.records[0];
    }

    return null;
  } catch (error) {
    console.error('Error searching for existing lead:', error.message);
    return null;
  }
}

/**
 * Create a lead in Salesforce based on intent scoring
 * @param {Object} intentData - Intent scoring data
 * @param {Object} jobData - Job intake data (optional)
 * @param {string} userNeeds - User's "what's not working" text (optional)
 * @param {Object} contactData - Contact information (may be partial or empty)
 * @param {Array} conversation - Full conversation history
 * @returns {Promise<Object>} Created/updated lead with ID
 */
async function createLead(intentData, jobData = {}, userNeeds = '', contactData = {}, conversation = []) {
  try {
    // Ensure Salesforce connection is established
    const connection = await authenticateToSalesforce();

    // Parse name into first and last (use "Unknown" if not provided)
    const fullName = contactData.contact_name || 'Unknown';
    const { firstName, lastName } = parseFullName(fullName);

    // Build description with intent data and user needs
    let description = '';

    if (userNeeds) {
      description += `User Needs:\n${userNeeds}\n\n`;
    }

    description += `Intent Score: ${intentData.intent_score}/100 (${intentData.intent_level})\n\n`;

    if (intentData.intent_reasons && intentData.intent_reasons.length > 0) {
      description += `Intent Signals:\n${intentData.intent_reasons.join(', ')}\n\n`;
    }

    if (jobData.role_title) {
      description += `Role: ${jobData.role_title}\n`;
    }
    if (jobData.location) {
      description += `Location: ${jobData.location}\n`;
    }
    if (jobData.industry) {
      description += `Industry: ${jobData.industry}\n`;
    }

    // Check for existing lead by email
    let existingLead = null;
    if (contactData.contact_email) {
      existingLead = await findExistingLeadByEmail(connection, contactData.contact_email);
    }

    if (existingLead) {
      // Update existing lead - append to description
      const updatedDescription = `${existingLead.Description || ''}\n\n--- New Session ---\n${description}`.trim();

      await connection.sobject('Lead').update({
        Id: existingLead.Id,
        Description: updatedDescription
      });

      console.log('✓ Existing lead updated:', existingLead.Id);

      return {
        success: true,
        leadId: existingLead.Id,
        updated: true,
        message: 'Existing lead updated in Salesforce'
      };
    }

    // Prepare NEW lead object for Salesforce (minimal fields only)
    const lead = {
      FirstName: firstName,
      LastName: lastName,
      Email: contactData.contact_email || null,
      Phone: contactData.contact_phone || null,
      Company: contactData.company_name || 'Unknown',
      Description: description.trim(),
      LeadSource: 'Free Talent Landing Page App', // Fixed constant
      Status: 'Open - Not Contacted'
    };

    // Create the lead
    console.log('Creating Salesforce lead...', {
      email: lead.Email || 'Not provided',
      company: lead.Company,
      intentScore: intentData.intent_score
    });

    const result = await connection.sobject('Lead').create(lead);

    if (!result.success) {
      throw new Error(`Failed to create lead: ${JSON.stringify(result.errors)}`);
    }

    console.log('✓ Lead created successfully:', result.id);

    // Attach conversation transcript
    await attachConversationTranscript(connection, result.id, conversation);

    return {
      success: true,
      leadId: result.id,
      updated: false,
      message: 'Lead created successfully in Salesforce'
    };

  } catch (error) {
    console.error('✗ Error creating Salesforce lead:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update existing lead with new information (post-lead-creation updates)
 * @param {string} leadId - Salesforce lead ID
 * @param {Object} updates - Fields to update
 * @param {Array} conversation - Updated conversation history
 * @returns {Promise<Object>} Update result
 */
async function updateLeadPostCreation(leadId, updates = {}, conversation = []) {
  try {
    const connection = await authenticateToSalesforce();

    // Fetch existing lead
    const existingLead = await connection.sobject('Lead').retrieve(leadId);

    if (!existingLead) {
      throw new Error('Lead not found');
    }

    // Build update object with only provided fields
    const updateData = { Id: leadId };

    // Update contact details if provided
    if (updates.contact_name) {
      const { firstName, lastName } = parseFullName(updates.contact_name);
      if (firstName !== 'Unknown') updateData.FirstName = firstName;
      if (lastName !== 'Unknown') updateData.LastName = lastName;
    }
    if (updates.contact_email) updateData.Email = updates.contact_email;
    if (updates.contact_phone) updateData.Phone = updates.contact_phone;
    if (updates.company_name && updates.company_name !== 'Unknown') {
      updateData.Company = updates.company_name;
    }

    // Append availability or additional notes to description
    if (updates.availability || updates.additional_notes) {
      let appendDescription = '\n\n--- Post-Lead Update ---\n';

      if (updates.availability) {
        appendDescription += `Availability: ${updates.availability}\n`;
      }

      if (updates.additional_notes) {
        appendDescription += `Additional Notes: ${updates.additional_notes}\n`;
      }

      updateData.Description = `${existingLead.Description || ''}${appendDescription}`;
    }

    // Update the lead
    await connection.sobject('Lead').update(updateData);

    console.log('✓ Lead updated post-creation:', leadId);

    // Attach updated transcript if conversation provided
    if (conversation && conversation.length > 0) {
      await attachConversationTranscript(connection, leadId, conversation, true);
    }

    return {
      success: true,
      leadId: leadId,
      message: 'Lead updated successfully'
    };

  } catch (error) {
    console.error('✗ Error updating lead:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Attach conversation transcript to lead as a Task
 * @param {Object} connection - Salesforce connection
 * @param {string} leadId - Lead ID to attach transcript to
 * @param {Array} conversation - Conversation messages
 * @param {boolean} isUpdate - Whether this is an updated transcript
 */
async function attachConversationTranscript(connection, leadId, conversation, isUpdate = false) {
  try {
    const transcript = formatConversationTranscript(conversation);

    const subject = isUpdate
      ? 'Updated Chat Transcript'
      : 'Initial Chat Transcript';

    // Create a Task to attach transcript
    const task = {
      Subject: subject,
      Description: transcript,
      WhoId: leadId,
      Status: 'Completed',
      ActivityDate: new Date().toISOString().split('T')[0],
      Priority: 'Normal'
    };

    const result = await connection.sobject('Task').create(task);

    if (result.success) {
      console.log(`✓ ${subject} attached to lead`);
    } else {
      console.error('✗ Failed to attach transcript:', result.errors);
    }

  } catch (error) {
    // Non-critical error - lead was created/updated, just transcript attachment failed
    console.error('✗ Error attaching transcript (non-critical):', error.message);
  }
}

/**
 * Test Salesforce connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const connection = await authenticateToSalesforce();

    // Try a simple query to verify access
    const result = await connection.query('SELECT Id, Name FROM Lead LIMIT 1');

    console.log('✓ Salesforce connection test successful');
    return true;
  } catch (error) {
    console.error('✗ Salesforce connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  authenticateToSalesforce,
  createLead,
  updateLeadPostCreation,
  testConnection
};
