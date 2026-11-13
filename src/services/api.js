/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/services/api.js
 * =============================================================================
 * 
 * Central API Service Layer for the 50% Working-System Prototype.
 * - Handles all HTTP requests between the React frontend and pure PHP backend.
 * - Uses the native browser fetch() API with standard JSON encoding.
 * - Connects directly to PHP PDO endpoints (no fake offline mock data).
 * 
 * NOTE FOR CAPSTONE DEFENSE:
 * In this 50% prototype, authentication (login/registration/sessions) is temporarily
 * out of scope. Requests do not require bearer tokens or session cookies.
 */

// Base URL for the pure PHP backend.
// As instructed: "Keep the API URLs flexible so the frontend can connect to:
// • http://localhost:8000/api (built-in PHP development server: php -S localhost:8000)
// • or http://localhost/chr-procurement-system/api (XAMPP / Apache)"
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Generic fetch wrapper for HTTP requests with automatic JSON parsing and error handling.
 * Used by: All export functions in api.js.
 * Connects to: PHP backend endpoints under /api/procurements/.
 * Database table affected: None (generic network transport layer).
 *
 * @param {string} endpoint - The relative API path (e.g., '/procurements/get_procurements.php').
 * @param {object} options  - Standard fetch options (method, headers, body).
 * @returns {Promise<any>} Parsed response data payload from PHP.
 * @throws {Error} Descriptive error on network failure or HTTP non-2xx status.
 */
async function sendRequest(endpoint, options = {}, returnFullEnvelope = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    // Network level error (e.g. backend server is not running or CORS blocked)
    const connError = new Error(
      `Cannot connect to PHP backend at ${url}. Please verify that the PHP development server is running (e.g. 'php -S localhost:8000' or XAMPP Apache) and MySQL is active.`
    );
    connError.original = netErr;
    throw connError;
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonErr) {
    throw new Error(`Invalid JSON response from ${url} (HTTP ${response.status}).`);
  }

  if (!response.ok || data.success === false) {
    const errorMsg = data.message || `HTTP error ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data.data || null;
    throw error;
  }

  if (returnFullEnvelope) {
    return data;
  }

  return data.data;
}

/**
 * Loads all procurement records from the PHP backend, with optional status filter.
 * Used by: ProcurementTable.jsx, CHRDashboard.jsx, and BidderOpportunities.jsx.
 * Connects to: Endpoint /api/procurements/get_procurements.php
 * Database tables affected: Reads from 'procurements' and 'bids'.
 *
 * @param {string} status - Optional status filter (e.g. 'Open', 'Awarded').
 * @returns {Promise<Array>} List of procurement objects from MySQL.
 */
export async function loadProcurements(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await sendRequest(`/procurements/get_procurements.php${query}`);
  return data.procurements || [];
}

/**
 * Loads a single procurement record, submitted bids, and audit trail.
 * Used by: ProcurementDetails.jsx and ProcurementForm.jsx (Edit Mode).
 * Connects to: Endpoint /api/procurements/get_procurement.php?id=X
 * Database tables affected: Reads from 'procurements', 'bids', and 'transaction_history'.
 *
 * @param {number|string} id - Procurement primary key ID in MySQL.
 * @returns {Promise<object>} Complete procurement detail object.
 */
export async function loadProcurementDetails(id) {
  const data = await sendRequest(`/procurements/get_procurement.php?id=${id}`);
  return data.procurement;
}

/**
 * Creates a new procurement record in the centralized MySQL database.
 * Used by: ProcurementForm.jsx (Create Mode).
 * Connects to: Endpoint /api/procurements/create_procurement.php
 * Database tables affected: Writes to 'procurements' and 'transaction_history'.
 *
 * @param {object} payload - Procurement fields (reference_no, title, abc, deadline, etc.).
 * @returns {Promise<object>} Result containing success, message, and procurement_id.
 */
export async function createProcurement(payload) {
  const envelope = await sendRequest(
    '/procurements/create_procurement.php',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    true
  );
  return {
    ...(envelope.data || {}),
    success: envelope.success,
    message: envelope.message,
  };
}

/**
 * Updates an existing procurement record in the centralized MySQL database.
 * Used by: ProcurementForm.jsx (Edit Mode).
 * Connects to: Endpoint /api/procurements/update_procurement.php
 * Database tables affected: Updates 'procurements' and inserts into 'transaction_history'.
 *
 * @param {object} payload - Updated procurement fields including id.
 * @returns {Promise<object>} Result containing success, message, procurement_id, and updated procurement.
 */
export async function updateProcurement(payload) {
  const envelope = await sendRequest(
    '/procurements/update_procurement.php',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    true
  );
  return {
    ...(envelope.data || {}),
    success: envelope.success,
    message: envelope.message,
  };
}

/**
 * Updates a procurement's workflow status and statutory stage under R.A. 9184.
 * Used by: ProcurementStatusTracker.jsx and ProcurementTable.jsx.
 * Connects to: Endpoint /api/procurements/update_status.php
 * Database tables affected: Updates 'procurements', writes to 'transaction_history'.
 *
 * @param {object} payload - Object containing id, status, current_stage, and remarks.
 * @returns {Promise<object>} Result confirmation.
 */
export async function updateProcurementStatus(payload) {
  const data = await sendRequest('/procurements/update_status.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

/**
 * Submits an official price quotation from a prospective supplier/bidder without login.
 * Used by: BidderQuotationForm.jsx.
 * Connects to: Endpoint /api/procurements/create_bid.php
 * Database tables affected: Writes to 'bids' and 'transaction_history'. Reads from 'procurements'.
 *
 * @param {object} payload - Bidder details (company name, contact, email) and bid_amount.
 * @returns {Promise<object>} Result containing the new bid_id.
 */
export async function submitBidQuotation(payload) {
  const data = await sendRequest('/procurements/create_bid.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

/**
 * Loads all submitted bidder quotations, optionally filtered by procurement project.
 * Used by: CHRBids.jsx, CHRBidTable.jsx, and BidderSubmittedQuotations.jsx.
 * Connects to: Endpoint /api/procurements/get_bids.php?procurement_id=X
 * Database tables affected: Reads from 'bids' joined with 'procurements'.
 *
 * @param {number|string} procurementId - Optional procurement ID filter.
 * @returns {Promise<Array>} List of submitted bids with calculated potential savings.
 */
export async function loadBids(procurementId = '') {
  const query = procurementId ? `?procurement_id=${procurementId}` : '';
  const data = await sendRequest(`/procurements/get_bids.php${query}`);
  return data.bids || [];
}

/**
 * Selects a winning bid quotation, automatically calculates savings (ABC - Awarded Price),
 * updates project stage to "Notice of Award", and logs the award event.
 * Used by: CHRBids.jsx and CHRBidTable.jsx.
 * Connects to: Endpoint /api/procurements/select_bid.php
 * Database tables affected: Updates 'bids' and 'procurements', writes to 'transaction_history'.
 *
 * @param {number|string} bidId   - Selected winning bid primary key ID.
 * @param {string}        remarks - Justification or BAC resolution notes.
 * @returns {Promise<object>} Updated financial details (awarded_amount, savings, status).
 */
export async function selectWinningBid(bidId, remarks = '') {
  const data = await sendRequest('/procurements/select_bid.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bid_id: bidId, remarks }),
  });
  return data;
}

/**
 * Loads aggregated regional procurement financial totals and individual project metrics.
 * Used by: SimpleFinancialMonitoring.jsx.
 * Connects to: Endpoint /api/procurements/get_financial_summary.php
 * Database tables affected: Reads from 'procurements' and 'bids'.
 *
 * @returns {Promise<object>} Totals (total ABC, awarded, savings) and project breakdown.
 */
export async function loadFinancialSummary() {
  const data = await sendRequest('/procurements/get_financial_summary.php');
  return data;
}

/**
 * Loads the chronological transaction audit history from the backend.
 * Used by: TransactionHistoryView.jsx and ProcurementDetails.jsx.
 * Connects to: Endpoint /api/procurements/get_history.php?procurement_id=X
 * Database tables affected: Reads from 'transaction_history' and 'procurements'.
 *
 * @param {number|string} procurementId - Optional procurement filter.
 * @returns {Promise<Array>} List of transaction history records.
 */
export async function loadTransactionHistory(procurementId = '') {
  const query = procurementId ? `?procurement_id=${procurementId}` : '';
  const data = await sendRequest(`/procurements/get_history.php${query}`);
  return data.logs || [];
}

/**
 * Loads KPI dashboard metrics, recent procurements, and recent history logs.
 * Used by: CHRDashboard.jsx.
 * Connects to: Endpoint /api/procurements/get_dashboard_summary.php
 * Database tables affected: Reads from 'procurements', 'bids', and 'transaction_history'.
 *
 * @returns {Promise<object>} Dashboard KPI counts, recent projects, and recent activity.
 */
export async function loadDashboardSummary() {
  const data = await sendRequest('/procurements/get_dashboard_summary.php');
  return data;
}
