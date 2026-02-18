import axios from 'axios';

// Use environment variable for API URL (set during build), fallback to relative /api for local dev
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Create a new TLP
 */
export const createTLP = async () => {
  const response = await api.post('/create');
  return response.data;
};

/**
 * Send chat message
 */
export const sendChatMessage = async (message, conversation, tlpId) => {
  const response = await api.post('/chat', {
    message,
    conversation,
    tlp_id: tlpId
  });
  return response.data;
};

/**
 * Update TLP
 */
export const updateTLP = async (tlpId, updates) => {
  const response = await api.put(`/tlp/${tlpId}`, updates);
  return response.data;
};

/**
 * Get TLP data
 */
export const getTLPData = async (tlpId) => {
  const response = await api.get(`/tlp/${tlpId}/data`);
  return response.data;
};

/**
 * Upload logo
 */
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);

  const response = await api.post('/upload/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Export TLP as HTML
 */
export const exportTLP = async (tlpId) => {
  const response = await api.post(`/tlp/${tlpId}/export`, {}, {
    responseType: 'blob'
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'job-posting.html');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Get scraping status for polling
 */
export const getScrapingStatus = async (tlpId) => {
  const response = await api.get(`/tlp/${tlpId}/scraping-status`);
  return response.data;
};

/**
 * Manually trigger brand scraping
 */
export const scrapeBrand = async (tlpId, websiteUrl) => {
  const response = await api.post(`/tlp/${tlpId}/scrape-brand`, { website_url: websiteUrl });
  return response.data;
};

/**
 * Get market research data
 */
export const getMarketData = async (tlpId) => {
  const response = await api.get(`/tlp/${tlpId}/market-data`);
  return response.data;
};

/**
 * Get interview questions
 */
export const getInterviewQuestions = async (tlpId) => {
  const response = await api.get(`/tlp/${tlpId}/interview-questions`);
  return response.data;
};

/**
 * Get deployment recommendations
 */
export const getDeploymentRecommendations = async (tlpId) => {
  const response = await api.get(`/tlp/${tlpId}/deployment-recommendations`);
  return response.data;
};

export default api;
