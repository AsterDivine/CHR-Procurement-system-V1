import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api.js';

/**
 * Currency Formatting Function
 * Formats a numeric amount into Philippine Peso currency using Intl.NumberFormat
 * (example output: ₱30,000.00).
 * Data source used: Numeric decimal values (`abc`, `awarded_amount`, `savings`)
 * returned from the MySQL `procurements` table via PHP JSON.
 *
 * @param {number|string|null} amount - Monetary value from MySQL.
 * @returns {string} Formatted Philippine Peso string or em-dash when null.
 */
function formatPhilippinePeso(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return '—';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Formats a MySQL DATETIME or DATE string for table display.
 * Data source used: `deadline` and `updated_at` columns from MySQL `procurements`.
 *
 * @param {string|null} dateValue - Raw SQL date or datetime string.
 * @param {boolean} includeTime   - Whether to include HH:MM timestamp.
 * @returns {string} Clean readable date string.
 */
function formatDateValue(dateValue, includeTime = false) {
  if (!dateValue) return '—';
  if (!includeTime) {
    return String(dateValue).substring(0, 10);
  }
  const parsed = new Date(String(dateValue).replace(' ', 'T'));
  if (isNaN(parsed.getTime())) {
    return String(dateValue).substring(0, 16);
  }
  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Maps a MySQL procurement status value to its CSS badge class.
 * Data source used: `status` column from MySQL `procurements`.
 *
 * @param {string} status - Current procurement status string.
 * @returns {string} Plain CSS badge class name.
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Open':
      return 'badge badge-published';
    case 'For Evaluation':
      return 'badge badge-review';
    case 'Awarded':
      return 'badge badge-selected';
    case 'In Progress':
      return 'badge badge-auth';
    case 'Completed':
      return 'badge badge-paid';
    default:
      return 'badge badge-draft';
  }
}

/**
 * Search Function (Client-Side in React)
 * Searches the loaded procurement records by Reference Number or Procurement Title.
 * Data source used: Operates on the React `procurements` array previously loaded
 * from the MySQL `procurements` table via fetch().
 *
 * @param {Array<object>} records - Array of procurement records from MySQL.
 * @param {string} query          - User search text.
 * @returns {Array<object>} Records matching the reference number or title keyword.
 */
function searchProcurements(records, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return records;
  }

  return records.filter((record) => {
    const referenceNo = String(record.reference_no || record.reference_number || '').toLowerCase();
    const title = String(record.title || '').toLowerCase();
    return referenceNo.includes(trimmed) || title.includes(trimmed);
  });
}

/**
 * Filter Function (Client-Side in React)
 * Filters procurement records by selected procurement status.
 * Data source used: Operates on the React `procurements` array previously loaded
 * from the MySQL `procurements` table via fetch().
 *
 * @param {Array<object>} records - Array of procurement records from MySQL.
 * @param {string} status         - Selected status ('Open', 'For Evaluation', 'Awarded', 'In Progress', 'Completed', or '').
 * @returns {Array<object>} Filtered procurement records.
 */
function filterProcurementsByStatus(records, status) {
  if (!status) {
    return records;
  }
  return records.filter((record) => record.status === status);
}

/**
 * ProcurementTable Component (Procurement Records Page)
 * Displays the live centralized table of all CHR-CAR procurement records stored in MySQL.
 * Used by: App.jsx at route /chr/procurements.
 * Connects to: GET /api/procurements/get_procurements.php
 * Database table affected: Reads from MySQL table `procurements`.
 *
 * @returns {JSX.Element} Semantic Procurement Records page.
 */
export default function ProcurementTable() {
  const location = useLocation();
  const navigate = useNavigate();

  // Live records loaded directly from MySQL (never hardcoded)
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState(null);

  /**
   * Captures confirmation feedback passed via React Router redirect state
   * after creating or updating a procurement record.
   * Data source used: React Router location state from ProcurementForm.jsx.
   */
  useEffect(() => {
    if (location.state && location.state.successMessage) {
      setActionMessage(location.state.successMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  /**
   * Fetch / Load Function
   * Retrieves all procurement records from MySQL via browser fetch() to the PHP endpoint.
   * Data source used: PHP endpoint GET /api/procurements/get_procurements.php,
   * which executes a SELECT query on the centralized MySQL `procurements` table
   * sorted newest records first.
   */
  const fetchProcurementRecords = async () => {
    setLoading(true);
    setError(null);

    const endpoint = `${API_BASE_URL}/procurements/get_procurements.php`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `HTTP error ${response.status}`);
      }

      const rows = Array.isArray(payload.data?.procurements)
        ? payload.data.procurements
        : [];
      setProcurements(rows);
    } catch (err) {
      setProcurements([]);
      setError(
        err.message ||
          `Cannot connect to PHP backend at ${endpoint}. Please ensure PHP and MySQL are running.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Load records from MySQL on initial page mount
  useEffect(() => {
    fetchProcurementRecords();
  }, []);

  // Apply client-side status filter and search filter on live MySQL records
  const statusFilteredRecords = filterProcurementsByStatus(procurements, statusFilter);
  const displayedProcurements = searchProcurements(statusFilteredRecords, searchQuery);

  return (
    <main aria-labelledby="procurement-records-title">
      {/* Semantic Page Header */}
      <header
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 id="procurement-records-title" className="page-title">
            Procurement Records
          </h1>
          <p className="page-subtitle">
            Centralized CHR-CAR procurement registry loaded directly from MySQL (newest records first).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchProcurementRecords}
            disabled={loading}
          >
            {loading ? 'Reloading...' : 'Refresh from MySQL'}
          </button>
          <Link to="/chr/procurements/new" className="btn btn-primary btn-sm">
            + Create Procurement
          </Link>
        </div>
      </header>

      {/* Backend Connection Notice */}
      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Ensure MySQL (<code>chr_procurement</code>) and PHP (e.g.{' '}
              <code>php -S localhost:8000</code>) are running.
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Message Banner (e.g. after saving from Create Procurement) */}
      {actionMessage && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #bbf7d0',
            fontWeight: 600,
          }}
        >
          {actionMessage}
        </aside>
      )}

      {/* Search & Status Filter Controls */}
      <section aria-labelledby="filter-controls-heading" style={{ marginBottom: '20px' }}>
        <h2 id="filter-controls-heading" style={{ display: 'none' }}>
          Search and Filter Procurement Records
        </h2>
        <div className="gov-card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Search by Reference No. or Title */}
            <div style={{ flex: '1 1 260px' }}>
              <label
                htmlFor="procurement-search-input"
                className="form-label"
                style={{ display: 'block', marginBottom: '6px' }}
              >
                Search by Reference No. or Procurement Title
              </label>
              <input
                id="procurement-search-input"
                type="search"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="e.g., CHR-CAR-2024 or Office Supplies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter by Status */}
            <div style={{ width: '220px' }}>
              <label
                htmlFor="procurement-status-filter"
                className="form-label"
                style={{ display: 'block', marginBottom: '6px' }}
              >
                Filter by Status
              </label>
              <select
                id="procurement-status-filter"
                className="form-select"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses ({procurements.length})</option>
                <option value="Open">Open</option>
                <option value="For Evaluation">For Evaluation</option>
                <option value="Awarded">Awarded</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(statusFilter || searchQuery) && (
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setStatusFilter('');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Semantic Procurement Table Section */}
      <section aria-labelledby="procurement-table-heading">
        <h2 id="procurement-table-heading" style={{ display: 'none' }}>
          CHR-CAR Procurement Records Table
        </h2>
        <div className="gov-card">
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading procurement records from MySQL...
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table compact-table">
                <caption>
                  Showing {displayedProcurements.length} of {procurements.length} procurement{' '}
                  {procurements.length === 1 ? 'record' : 'records'} from MySQL (sorted newest first)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Reference No.</th>
                    <th scope="col">Procurement Title</th>
                    <th scope="col">Procurement Type</th>
                    <th scope="col">ABC</th>
                    <th scope="col">Budget Source</th>
                    <th scope="col">Deadline</th>
                    <th scope="col">Status</th>
                    <th scope="col">Awarded Amount</th>
                    <th scope="col">Savings</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedProcurements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          textAlign: 'center',
                          padding: '32px 16px',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {procurements.length === 0
                          ? 'No procurement records found in MySQL.'
                          : 'No procurement records matched your search or status filter.'}
                      </td>
                    </tr>
                  ) : (
                    displayedProcurements.map((p) => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{p.reference_no || p.reference_number}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                        </td>
                        <td>{p.procurement_type || p.procurement_mode || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {formatPhilippinePeso(p.abc)}
                        </td>
                        <td>{p.budget_source || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDateValue(p.deadline, false)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className={getStatusBadgeClass(p.status)}>{p.status}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatPhilippinePeso(p.awarded_amount)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.savings !== null && p.savings !== undefined ? (
                            <strong style={{ color: 'var(--color-success)' }}>
                              {formatPhilippinePeso(p.savings)}
                            </strong>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                          {formatDateValue(p.updated_at || p.created_at, true)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', whiteSpace: 'nowrap' }}>
                            <Link
                              to={`/chr/procurements/${p.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            >
                              View
                            </Link>
                            <Link
                              to={`/chr/procurements/${p.id}/edit`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
