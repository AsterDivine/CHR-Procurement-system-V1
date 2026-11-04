/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/services/api.js
 * =============================================================================
 * 
 * Reusable API Service Layer.
 * - Handles all HTTP requests to the PHP/Apache backend using fetch().
 * - Automatically attaches credentials: 'include' so PHP session cookies
 *   (PHPSESSID) are sent across origins (e.g. localhost:5173 to localhost:80).
 * - Standardizes error handling and JSON parsing.
 */

// Base URL for the PHP API on Apache/XAMPP.
// Can be customized via VITE_API_URL in .env if running on a different port/folder.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/chr-procurement-system/api';

/**
 * Generic request wrapper using fetch()
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Default configuration
  const config = {
    // CRITICAL: Always include cookies for session-based authentication
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data.data || null;
      throw error;
    }

    return data;
  } catch (err) {
    // If server is unreachable (e.g. XAMPP is not running)
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const connErr = new Error(
        'Unable to connect to backend. Please ensure Apache and MySQL are running in XAMPP at ' + API_BASE_URL
      );
      connErr.status = 0;
      throw connErr;
    }
    throw err;
  }
}

export const api = {
  // --- HTTP Helpers ---
  get: (endpoint) => request(endpoint, { method: 'GET' }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // Handles multipart/form-data for file uploads (browser sets boundary automatically)
  postFormData: (endpoint, formData) =>
    request(endpoint, {
      method: 'POST',
      body: formData,
    }),

  // --- Authentication Endpoints ---
  login: (email, password) => api.post('/auth/login.php', { email, password }),
  registerBidder: (data) => api.post('/auth/register_bidder.php', data),
  logout: () => api.post('/auth/logout.php', {}),
  getMe: () => api.get('/auth/me.php'),

  // --- Opportunity Endpoints ---
  getOpenOpportunities: () => api.get('/opportunities/list_open.php'),
  getOpportunity: (id) => api.get(`/opportunities/get.php?id=${id}`),

  // --- Bidder Endpoints ---
  submitBid: (formData) => api.postFormData('/bids/submit.php', formData),
  getMyBids: () => api.get('/bids/my_bids.php'),
  getMyBid: (id) => api.get(`/bids/get_my_bid.php?id=${id}`),
  getDownloadDocumentUrl: (id) => `${API_BASE_URL}/bids/download_document.php?id=${id}`,

  // --- CHR Endpoints ---
  getCHROpportunities: (status = '') =>
    api.get(`/opportunities/list_chr.php${status ? `?status=${status}` : ''}`),
  createOpportunity: (data) => api.post('/opportunities/create.php', data),
  updateOpportunity: (data) => api.post('/opportunities/update.php', data),
  changeOpportunityStatus: (id, targetStatus) =>
    api.post('/opportunities/change_status.php', { id, target_status: targetStatus }),

  getOpportunityBids: (opportunityId) =>
    api.get(`/bids/list_for_opportunity.php?opportunity_id=${opportunityId}`),
  updateBidStatus: (bidId, status, remarks = '') =>
    api.post('/bids/update_status.php', { bid_id: bidId, status, remarks }),

  getTransactions: (stage = '') =>
    api.get(`/transactions/list.php${stage ? `?stage=${stage}` : ''}`),
  getTransaction: (id) => api.get(`/transactions/get.php?id=${id}`),
  createTransactionFromOpportunity: (data) =>
    api.post('/transactions/create_from_opportunity.php', data),
  updateTransactionStage: (id, stage, remarks = '') =>
    api.post('/transactions/update_stage.php', { id, stage, remarks }),
  updateTransactionFinancials: (data) =>
    api.post('/transactions/update_financials.php', data),
  uploadTransactionDocument: (formData) =>
    api.postFormData('/transactions/upload_document.php', formData),
  getTransactionHistory: (id) => api.get(`/transactions/history.php?id=${id}`),

  // --- Budgets & Reports ---
  getBudgetList: () => api.get('/budgets/list.php'),
  getBudgetSummary: () => api.get('/budgets/summary.php'),
  getDashboardSummary: () => api.get('/reports/dashboard_summary.php'),
  getProcurementReport: (params = '') =>
    api.get(`/reports/procurement_report.php${params ? `?${params}` : ''}`),
  getExportCsvUrl: (params = '') =>
    `${API_BASE_URL}/reports/export_csv.php${params ? `?${params}` : ''}`,
  getAuditLogs: (params = '') =>
    api.get(`/reports/audit_logs.php${params ? `?${params}` : ''}`),
  search: (query) => api.get(`/search/global_search.php?q=${encodeURIComponent(query)}`),
};

