/**
 * Lead Detection and Validation Module
 * Handles accumulation of lead data from conversation and determines when to create Salesforce lead
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Accumulate lead data from all function calls in the conversation
 * @param {Array} toolCalls - Array of all tool calls from the conversation
 * @returns {Object} Accumulated lead data
 */
function accumulateLeadData(toolCalls) {
  if (!toolCalls || toolCalls.length === 0) {
    return {};
  }

  // Merge all lead information from tool calls
  const leadData = {
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    company_name: null,
    company_size: null,
    company_industry: null,
    services_interested: [],
    recruitment_needs: null
  };

  // Process each tool call and accumulate data
  toolCalls.forEach(call => {
    if (call.name === 'extract_lead_information' && call.arguments) {
      const args = call.arguments;

      // Update fields if they have values (don't overwrite with empty values)
      if (args.contact_name) leadData.contact_name = args.contact_name;
      if (args.contact_email) leadData.contact_email = args.contact_email;
      if (args.contact_phone) leadData.contact_phone = args.contact_phone;
      if (args.company_name) leadData.company_name = args.company_name;
      if (args.company_size) leadData.company_size = args.company_size;
      if (args.company_industry) leadData.company_industry = args.company_industry;
      if (args.recruitment_needs) leadData.recruitment_needs = args.recruitment_needs;

      // Accumulate services (merge arrays, avoid duplicates)
      if (args.services_interested && Array.isArray(args.services_interested)) {
        args.services_interested.forEach(service => {
          if (!leadData.services_interested.includes(service)) {
            leadData.services_interested.push(service);
          }
        });
      }
    }
  });

  return leadData;
}

/**
 * Check if lead data meets minimum threshold for Salesforce creation
 * @param {Object} leadData - Accumulated lead data
 * @returns {boolean} True if ready to create lead
 */
function isLeadReady(leadData) {
  if (!leadData) return false;

  // Required fields for lead creation
  const hasEmail = leadData.contact_email && isValidEmail(leadData.contact_email);
  const hasName = leadData.contact_name && leadData.contact_name.trim().length > 0;
  const hasPhone = leadData.contact_phone && leadData.contact_phone.trim().length > 0;
  const hasCompany = leadData.company_name && leadData.company_name.trim().length > 0;

  // Optional but at least one should be present to indicate interest
  const hasInterestSignal =
    (leadData.services_interested && leadData.services_interested.length > 0) ||
    (leadData.recruitment_needs && leadData.recruitment_needs.trim().length > 0);

  // All required fields plus at least one interest signal
  return hasEmail && hasName && hasPhone && hasCompany && hasInterestSignal;
}

/**
 * Get lead quality score (1-5)
 * @param {Object} leadData - Lead data
 * @returns {number} Score from 1-5
 */
function getLeadScore(leadData) {
  if (!leadData) return 1;

  let score = 1;

  // Email, name, company = baseline (3 points)
  if (leadData.contact_email && isValidEmail(leadData.contact_email)) score++;
  if (leadData.contact_name) score++;
  if (leadData.company_name) score++;

  // Additional information increases score
  if (leadData.contact_phone) score += 0.5;
  if (leadData.company_industry) score += 0.5;
  if (leadData.company_size) score += 0.5;
  if (leadData.services_interested && leadData.services_interested.length > 0) score += 0.5;
  if (leadData.recruitment_needs && leadData.recruitment_needs.length > 50) score += 1;

  return Math.min(5, Math.round(score));
}

/**
 * Extract all tool calls from conversation history
 * @param {Array} messages - Full conversation including assistant messages with tool_calls
 * @returns {Array} Array of all tool calls
 */
function extractToolCallsFromConversation(messages) {
  const toolCalls = [];

  if (!messages || !Array.isArray(messages)) {
    return toolCalls;
  }

  messages.forEach(message => {
    // Check if message has tool_calls (from assistant)
    if (message.role === 'assistant' && message.tool_calls) {
      message.tool_calls.forEach(tc => {
        try {
          const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;

          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: args
          });
        } catch (e) {
          console.error('Error parsing tool call arguments:', e);
        }
      });
    }
  });

  return toolCalls;
}

/**
 * Validate lead data before Salesforce submission
 * @param {Object} leadData - Lead data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateLeadData(leadData) {
  const errors = [];

  if (!leadData.contact_email || !isValidEmail(leadData.contact_email)) {
    errors.push('Valid email address is required');
  }

  if (!leadData.contact_name || leadData.contact_name.trim().length === 0) {
    errors.push('Contact name is required');
  }

  if (!leadData.contact_phone || leadData.contact_phone.trim().length === 0) {
    errors.push('Mobile number is required');
  }

  if (!leadData.company_name || leadData.company_name.trim().length === 0) {
    errors.push('Company name is required');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Get human-readable summary of lead data
 * @param {Object} leadData - Lead data
 * @returns {string} Summary string
 */
function getLeadSummary(leadData) {
  const parts = [];

  if (leadData.contact_name) parts.push(`Name: ${leadData.contact_name}`);
  if (leadData.contact_email) parts.push(`Email: ${leadData.contact_email}`);
  if (leadData.company_name) parts.push(`Company: ${leadData.company_name}`);
  if (leadData.company_industry) parts.push(`Industry: ${leadData.company_industry}`);
  if (leadData.services_interested && leadData.services_interested.length > 0) {
    parts.push(`Interested in: ${leadData.services_interested.join(', ')}`);
  }

  return parts.join(' | ');
}

module.exports = {
  accumulateLeadData,
  isLeadReady,
  getLeadScore,
  extractToolCallsFromConversation,
  validateLeadData,
  getLeadSummary,
  isValidEmail
};
