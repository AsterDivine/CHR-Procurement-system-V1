import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadTransactionHistory } from '../../services/api.js';

/**
 * Maps action types to visual badge CSS classes.
 * Used by: TransactionHistoryView to format action badges.
 * Connects to: Local style helper.
 * Database table affected: None.
 *
 * @param {string} action - Action string from transaction_history table.
 * @returns {string} CSS class name.
 */
function getActionBadgeClass(action) {
  switch (action) {
    case 'Bid Awarded':
      return 'badge badge-selected';
    case 'Bid Submitted':
      return 'badge badge-published';
    case 'Status / Stage Updated':
      return 'badge badge-review';
    case 'Procurement Created':
      return 'badge badge-draft';
    default:
      return 'badge badge-draft';
  }
}

/**
 * TransactionHistoryView Component
 * Dedicated centralized audit trail ledger displaying all chronological activities
 * recorded across the CHR-CAR procurement lifecycle.
 * Provides transparent accountability for capstone defense review.
 * Used by: App.jsx at route /chr/history.
 * Connects to: /api/procurements/get_history.php
 * Database tables affected: Reads from 'transaction_history' and 'procurements'.
 */
export default function TransactionHistoryView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  /**
   * Loads the transaction audit history from the PHP backend.
   * Connects to: /api/procurements/get_history.php
   * Database tables affected: Reads from transaction_history.
   */
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await loadTransactionHistory();
      setLogs(records);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  /**
   * Filters audit logs client-side by keyword or procurement reference.
   * Used by: Render method.
   * Connects to: Local filterQuery state.
   * Database table affected: None.
   *
   * @returns {Array} Filtered log entries.
   */
  const getFilteredLogs = () => {
    if (!filterQuery.trim()) return logs;
    const q = filterQuery.toLowerCase();
    return logs.filter(
      (log) =>
        (log.procurement_reference || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.remarks || '').toLowerCase().includes(q) ||
        (log.performed_by || '').toLowerCase().includes(q)
    );
  };

  const filteredLogs = getFilteredLogs();

  return (
    <article aria-labelledby="history-view-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="history-view-heading" className="page-title">
            10. Centralized Transaction History &amp; Audit Trail
          </h1>
          <p className="page-subtitle">
            Immutable chronological ledger of status milestones, quotations, and contract awards
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchLogs}
          >
            Refresh Logs
          </button>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start your PHP development server (e.g. <code>php -S localhost:8000</code>) to view live audit logs from MySQL.
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <section aria-labelledby="history-filter-heading" style={{ marginBottom: '20px' }}>
        <h2 id="history-filter-heading" className="sr-only" style={{ display: 'none' }}>
          Filter Logs
        </h2>
        <form
          className="gov-card"
          style={{ padding: '14px 18px' }}
          onSubmit={(e) => e.preventDefault()}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only" style={{ display: 'none' }}>
              Search Log Filter
            </legend>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 auto' }}>
                <label
                  htmlFor="history-filter"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}
                >
                  Search Audit Logs by Project, Action, or Actor:
                </label>
                <input
                  id="history-filter"
                  type="text"
                  className="form-input"
                  placeholder="e.g. CHR-CAR-2024-001, Bid Awarded, BAC Committee..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </div>
              {filterQuery && (
                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFilterQuery('')}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </fieldset>
        </form>
      </section>

      {/* Transaction History Table */}
      <section aria-labelledby="logs-table-heading">
        <h2 id="logs-table-heading" className="sr-only" style={{ display: 'none' }}>
          Audit Logs Table
        </h2>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Chronological Audit Trail ({filteredLogs.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Logged into MySQL transaction_history table
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading transaction history from MySQL...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No transaction logs matched your query.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '170px' }}>Date &amp; Time</th>
                      <th scope="col">Procurement Project</th>
                      <th scope="col">Action Taken</th>
                      <th scope="col">Status Transition</th>
                      <th scope="col">Remarks &amp; Audit Details</th>
                      <th scope="col">Acting Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <small>{log.created_at}</small>
                        </td>
                        <td>
                          <Link
                            to={`/chr/procurements/${log.procurement_id}`}
                            style={{ fontWeight: 600 }}
                          >
                            {log.procurement_reference}
                          </Link>
                          {log.procurement_title && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                              {log.procurement_title}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={getActionBadgeClass(log.action)}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          {log.previous_status && log.new_status ? (
                            <span>
                              <span className="badge badge-draft">{log.previous_status}</span> &rarr;{' '}
                              <span className="badge badge-published">{log.new_status}</span>
                            </span>
                          ) : (
                            <span className="badge badge-draft">{log.new_status || 'Initial'}</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '13px' }}>{log.remarks}</span>
                        </td>
                        <td>
                          <small style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {log.performed_by}
                          </small>
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
