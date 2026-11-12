import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadFinancialSummary } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: SimpleFinancialMonitoring component to display financial columns.
 * Connects to: Local formatting utility.
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
 * Maps procurement status to CSS badge classes.
 * Used by: SimpleFinancialMonitoring component.
 * Connects to: Local style helper.
 * Database table affected: None.
 *
 * @param {string} status - Procurement status string.
 * @returns {string} CSS class name.
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Published / Open':
      return 'badge badge-published';
    case 'Awarded':
      return 'badge badge-selected';
    case 'Under Evaluation':
      return 'badge badge-review';
    case 'Completed':
      return 'badge badge-completed';
    case 'Draft':
    default:
      return 'badge badge-draft';
  }
}

/**
 * SimpleFinancialMonitoring Component
 * Regional financial monitoring module for CHR-CAR procurement projects.
 * Calculates and tracks:
 * - Total Approved Budget for the Contract (ABC)
 * - Total Awarded Contracts
 * - Realized Procurement Savings (Formula: ABC - Awarded Amount)
 * - Overall Regional Savings Rate
 * Used by: App.jsx at route /chr/financials.
 * Connects to: /api/procurements/get_financial_summary.php
 * Database tables affected: Reads from 'procurements' and 'bids'.
 */
export default function SimpleFinancialMonitoring() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches financial aggregates and project rows from the PHP backend.
   * Connects to: /api/procurements/get_financial_summary.php
   * Database tables affected: Reads from procurements and bids.
   */
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadFinancialSummary();
      setFinancialData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totals = financialData?.totals || {
    total_projects: 0,
    awarded_projects: 0,
    total_abc: 0,
    total_awarded_amount: 0,
    total_savings: 0,
    overall_savings_rate: 0,
  };

  const projects = financialData?.projects || [];

  return (
    <article aria-labelledby="financial-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="financial-heading" className="page-title">
            9. Simple Financial Monitoring
          </h1>
          <p className="page-subtitle">
            CHR-CAR regional budget utilization, contract awards, and realized procurement savings
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchSummary}
          >
            Recalculate Financials
          </button>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start your PHP development server (e.g. <code>php -S localhost:8000</code>) to calculate live financial savings from MySQL.
            </div>
          </div>
        </div>
      )}

      {/* Scope Disclaimer Banner */}
      <aside
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '12px 18px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#1e3a8a',
        }}
      >
        <strong>Financial Scope Note:</strong> This is an administrative procurement tracking tool for capstone demonstration.
        It calculates realized savings (ABC minus Awarded Amount) and committed contract obligations. It is not full government accounting (eCOA / GAM).
      </aside>

      {/* High-Level Financial Metric Cards */}
      <section aria-labelledby="financial-metrics-heading" style={{ marginBottom: '24px' }}>
        <h2 id="financial-metrics-heading" className="sr-only" style={{ display: 'none' }}>
          Aggregate Financial Indicators
        </h2>
        <div className="stat-cards-grid">
          {/* Total Allocated ABC */}
          <div className="stat-card">
            <div className="stat-label">Total Allocated Budget (ABC)</div>
            <div className="stat-value">{formatCurrency(totals.total_abc)}</div>
            <div className="stat-subtext">Across {totals.total_projects} active projects</div>
          </div>

          {/* Committed Awarded Amount */}
          <div className="stat-card">
            <div className="stat-label">Committed Contract Price</div>
            <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(totals.total_awarded_amount)}
            </div>
            <div className="stat-subtext">Obligated under {totals.awarded_projects} awarded contracts</div>
          </div>

          {/* Realized Procurement Savings */}
          <div className="stat-card highlight">
            <div className="stat-label">Realized Savings (ABC - Awarded)</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {formatCurrency(totals.total_savings)}
            </div>
            <div className="stat-subtext">
              {totals.overall_savings_rate}% overall efficiency rate
            </div>
          </div>
        </div>
      </section>

      {/* Project-by-Project Financial Ledger Table */}
      <section aria-labelledby="financial-ledger-heading">
        <h2 id="financial-ledger-heading" className="sr-only" style={{ display: 'none' }}>
          Project Financial Ledger
        </h2>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Project Financial Ledger ({projects.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Real-time savings calculation: ABC minus Awarded Contract Amount
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Computing financial summary from MySQL...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No procurement records to monitor.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference Number</th>
                      <th scope="col">Project Title</th>
                      <th scope="col">Approved Budget (ABC)</th>
                      <th scope="col">Awarded Amount</th>
                      <th scope="col">Realized Savings</th>
                      <th scope="col">Savings Rate</th>
                      <th scope="col">Winning Supplier</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.reference_number}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <small style={{ color: 'var(--color-text-subtle)' }}>
                            {p.procurement_mode}
                          </small>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{formatCurrency(p.abc)}</strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.awarded_amount !== null ? (
                            <span>{formatCurrency(p.awarded_amount)}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>Pending Award</span>
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
                          {p.savings !== null && p.abc > 0 ? (
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              {p.savings_rate}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {p.winning_supplier ? (
                            <strong>{p.winning_supplier}</strong>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(p.status)}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/chr/procurements/${p.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', padding: '3px 8px' }}
                          >
                            Details &rarr;
                          </Link>
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
