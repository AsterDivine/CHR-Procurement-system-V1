import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadProcurements, updateProcurementStatus } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: ProcurementTable component to format ABC, Awarded Amount, and Savings.
 * Connects to: Local formatting helper.
 * Database table affected: None.
 *
 * @param {number|null} val - Amount to format.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return '₱ ' + Number(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Returns CSS badge class based on procurement status string.
 * Used by: ProcurementTable component.
 * Connects to: Local styling helper.
 * Database table affected: None.
 *
 * @param {string} status - Procurement status string.
 * @returns {string} CSS class name.
 */
function getBadgeClass(status) {
  switch (status) {
    case 'Open':
    case 'Published / Open':
      return 'badge badge-published';
    case 'Awarded':
      return 'badge badge-selected';
    case 'For Evaluation':
    case 'Under Evaluation':
      return 'badge badge-review';
    case 'In Progress':
      return 'badge badge-auth';
    case 'Completed':
      return 'badge badge-paid';
    case 'Draft':
    default:
      return 'badge badge-draft';
  }
}

/**
 * ProcurementTable Component
 * Centralized list of all procurement records in the CHR-CAR system.
 * Allows filtering by status, search by keyword, quick status transition,
 * and direct links to create, edit, or inspect details.
 * Used by: App.jsx at route /chr/procurements.
 * Connects to: /api/procurements/get_procurements.php and /api/procurements/update_status.php
 * Database tables affected: Reads and updates 'procurements' and 'transaction_history'.
 */
export default function ProcurementTable() {
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState(null);

  /**
   * Loads all procurement records from the PHP backend.
   * Connects to: /api/procurements/get_procurements.php
   * Database table affected: Reads from procurements, bids, and procurement_items.
   *
   * @param {string} filter - Optional status filter.
   */
  const fetchRecords = async (filter = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const records = await loadProcurements(filter);
      setProcurements(records);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(statusFilter);
  }, [statusFilter]);

  /**
   * Quickly advances a draft procurement to 'Published / Open' status.
   * Connects to: /api/procurements/update_status.php
   * Database tables affected: Updates procurements, writes to transaction_history.
   *
   * @param {number} id - Procurement ID.
   * @param {string} refNo - Procurement Reference Number.
   */
  const handlePublish = async (id, refNo) => {
    try {
      await updateProcurementStatus({
        id,
        status: 'Published / Open',
        current_stage: 'Request for Quotation',
        remarks: `Published notice for public bidding by CHR BAC Secretariat.`,
      });
      setActionMessage(`Project "${refNo}" has been successfully published for bidding!`);
      setTimeout(() => setActionMessage(''), 4000);
      fetchRecords();
    } catch (err) {
      alert('Failed to publish: ' + err.message);
    }
  };

  /**
   * Filters procurement records client-side by reference number and title keywords.
   * Used by: ProcurementTable render method.
   * Connects to: Local state filtering.
   * Database table affected: None.
   *
   * @returns {Array} Filtered procurement list.
   */
  const getFilteredProcurements = () => {
    if (!searchQuery.trim()) return procurements;
    const q = searchQuery.toLowerCase();
    return procurements.filter(
      (p) =>
        p.reference_number.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.procurement_mode.toLowerCase().includes(q)
    );
  };

  const filteredList = getFilteredProcurements();

  return (
    <article aria-labelledby="procurements-table-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="procurements-table-heading" className="page-title">
            Centralized Procurement Table
          </h1>
          <p className="page-subtitle">
            Master list of all CHR-CAR procurement notices, budgets, and status milestones
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchRecords()}
          >
            Refresh Table
          </button>
          <Link to="/chr/procurements/new" className="btn btn-primary btn-sm">
            + New Procurement Form
          </Link>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Ensure MySQL and the PHP development server (e.g. <code>php -S localhost:8000</code>) are running.
            </div>
          </div>
        </div>
      )}

      {/* Action Notification Banner */}
      {actionMessage && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            padding: '10px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #bbf7d0',
            fontWeight: 500,
          }}
        >
          {actionMessage}
        </aside>
      )}

      {/* Search and Status Filters Section */}
      <section aria-labelledby="filter-section-heading" style={{ marginBottom: '20px' }}>
        <h2 id="filter-section-heading" className="sr-only" style={{ display: 'none' }}>
          Filter Procurements
        </h2>
        <form
          className="gov-card"
          style={{ padding: '16px 20px' }}
          onSubmit={(e) => e.preventDefault()}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only" style={{ display: 'none' }}>
              Search &amp; Filter Options
            </legend>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Search Keyword */}
              <div style={{ flex: '1 1 240px' }}>
                <label
                  htmlFor="search-input"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Search by Title or Reference Number:
                </label>
                <input
                  id="search-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g., CHR-CAR-2024-001, Office Supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div style={{ width: '220px' }}>
                <label
                  htmlFor="status-select"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Filter by Status:
                </label>
                <select
                  id="status-select"
                  className="form-input"
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

              {/* Reset Button */}
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
          </fieldset>
        </form>
      </section>

      {/* Procurement Data Table Section */}
      <section aria-labelledby="records-list-heading">
        <h2 id="records-list-heading" className="sr-only" style={{ display: 'none' }}>
          Procurement Records
        </h2>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Registered Procurements ({filteredList.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Connected to MySQL database &bull; Real-time status sync
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading && procurements.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading procurement records from MySQL...
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No procurement records matched your search or status filter.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference Number</th>
                      <th scope="col">Project Title &amp; Mode</th>
                      <th scope="col">Approved Budget (ABC)</th>
                      <th scope="col">Awarded Price</th>
                      <th scope="col">Savings</th>
                      <th scope="col">Current Stage</th>
                      <th scope="col">Status</th>
                      <th scope="col">Bids</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.reference_no || p.reference_number}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <small style={{ color: 'var(--color-text-subtle)' }}>
                            {p.procurement_type || p.procurement_mode || 'NP-53.9 Small Value'} &bull; Deadline: {p.deadline ? p.deadline.substring(0, 10) : '—'}
                          </small>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{formatCurrency(p.abc)}</strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.awarded_amount !== null ? (
                            <span>{formatCurrency(p.awarded_amount)}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.savings !== null ? (
                            <strong style={{ color: 'var(--color-success)' }}>
                              {formatCurrency(p.savings)}
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                            {p.current_stage}
                          </span>
                        </td>
                        <td>
                          <span className={getBadgeClass(p.status)}>{p.status}</span>
                        </td>
                        <td>
                          <span className="badge badge-draft">{p.total_bids} bids</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Link
                              to={`/chr/procurements/${p.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '12px' }}
                            >
                              Details
                            </Link>

                            <Link
                              to={`/chr/procurements/${p.id}/edit`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '12px' }}
                            >
                              Edit
                            </Link>

                            {p.status === 'Draft' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '12px' }}
                                onClick={() => handlePublish(p.id, p.reference_number)}
                                title="Publish notice for public bidding"
                              >
                                Publish Notice
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}
