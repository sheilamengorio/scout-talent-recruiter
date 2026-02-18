/**
 * Intent Scoring Service
 * Tracks user behavior and text signals to determine if user needs expert help
 * Score range: 0-100
 * Levels: Low (0-39), Medium (40-59), High (60-100)
 */

/**
 * Calculate intent score based on behavior and text signals
 * @param {Object} sessionData - Session tracking data
 * @param {Array} conversation - Full conversation history
 * @returns {Object} Intent score, reasons, and level
 */
function calculateIntentScore(sessionData, conversation) {
  let score = 0;
  const reasons = [];

  // ========================================
  // BEHAVIORAL SIGNALS
  // ========================================

  // Regenerates landing page 2+ times → +25
  if (sessionData.tlpRegenerations >= 2) {
    score += 25;
    reasons.push(`Regenerated TLP ${sessionData.tlpRegenerations} times`);
  }

  // Uses improvement actions 2+ times → +15
  if (sessionData.improvementActionsUsed >= 2) {
    score += 15;
    reasons.push(`Used improvement actions ${sessionData.improvementActionsUsed} times`);
  }

  // Active session time >90 seconds → +10
  if (sessionData.activeTimeSeconds > 90) {
    score += 10;
    reasons.push(`Active for ${sessionData.activeTimeSeconds} seconds`);
  }

  // ========================================
  // TEXT SIGNALS (from conversation)
  // ========================================

  const allUserMessages = conversation
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  // Mentions "not getting applicants / no candidates / hard to hire" → +25
  const applicantIssues = [
    'not getting applicants', 'no applicants', 'few applicants',
    'no candidates', 'not getting candidates', 'hard to hire',
    'struggling to hire', 'can\'t find candidates', 'difficult to hire'
  ];
  if (applicantIssues.some(phrase => allUserMessages.includes(phrase))) {
    score += 25;
    reasons.push('Mentioned difficulty getting applicants');
  }

  // Mentions "urgent / ASAP / immediately" → +20
  const urgencyTerms = ['urgent', 'asap', 'immediately', 'as soon as possible', 'right away', 'quickly'];
  if (urgencyTerms.some(term => allUserMessages.includes(term))) {
    score += 20;
    reasons.push('Expressed urgency');
  }

  // Asks "best platform / where should I post" → +15
  const platformQuestions = [
    'best platform', 'which platform', 'where should i post',
    'where to post', 'where can i post', 'best place to post'
  ];
  if (platformQuestions.some(phrase => allUserMessages.includes(phrase))) {
    score += 15;
    reasons.push('Asked about posting platforms');
  }

  // Asks for help → +40
  const helpRequests = [
    'need help', 'can you help', 'need strategy', 'can someone review',
    'we need help', 'need assistance', 'help me', 'help us'
  ];
  if (helpRequests.some(phrase => allUserMessages.includes(phrase))) {
    score += 40;
    reasons.push('Explicitly asked for help');
  }

  // Mentions senior or niche roles → +15
  const seniorRoles = [
    'executive', 'head of', 'director', 'senior', 'specialist',
    'chief', 'vp ', 'vice president', 'manager', 'lead',
    'rare skill', 'niche', 'hard to find'
  ];
  if (seniorRoles.some(term => allUserMessages.includes(term))) {
    score += 15;
    reasons.push('Mentioned senior or niche role');
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine intent level
  let level = 'low';
  if (score >= 60) {
    level = 'high';
  } else if (score >= 40) {
    level = 'medium';
  }

  return {
    intent_score: score,
    intent_reasons: reasons,
    intent_level: level
  };
}

/**
 * Initialize session data for tracking
 * @returns {Object} Empty session data
 */
function initializeSessionData() {
  return {
    tlpRegenerations: 0,
    improvementActionsUsed: 0,
    activeTimeSeconds: 0,
    sessionStartTime: Date.now()
  };
}

/**
 * Update session data with new activity
 * @param {Object} sessionData - Current session data
 * @param {string} activityType - Type of activity ('tlp_regeneration', 'improvement_action')
 * @returns {Object} Updated session data
 */
function updateSessionData(sessionData, activityType) {
  const updated = { ...sessionData };

  // Update active time
  const currentTime = Date.now();
  updated.activeTimeSeconds = Math.floor((currentTime - updated.sessionStartTime) / 1000);

  // Track specific activities
  switch (activityType) {
    case 'tlp_regeneration':
      updated.tlpRegenerations += 1;
      break;
    case 'improvement_action':
      updated.improvementActionsUsed += 1;
      break;
  }

  return updated;
}

/**
 * Check if intent score meets threshold for lead creation
 * @param {number} intentScore - Intent score (0-100)
 * @returns {boolean} True if score >= 60
 */
function shouldCreateLead(intentScore) {
  return intentScore >= 60;
}

/**
 * Get readable summary of intent data
 * @param {Object} intentData - Intent score data
 * @returns {string} Summary string
 */
function getIntentSummary(intentData) {
  return `Score: ${intentData.intent_score}/100 (${intentData.intent_level}) | Reasons: ${intentData.intent_reasons.join(', ') || 'None'}`;
}

module.exports = {
  calculateIntentScore,
  initializeSessionData,
  updateSessionData,
  shouldCreateLead,
  getIntentSummary
};
