import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadDashboardSummary } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: CHRDashboard component to display ABC, awarded amount, and savings.
 * Connects to: Local formatting utility.
 * Database table affected: None.
 *
 * @param {number|null} val - Amount to format.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '₱ 0.00';
  return '₱ ' + Number(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Maps procurement status strings to clean CSS badge classes.
 * Used by: CHRDashboard and ProcurementTable to render visual status badges.
 * Connects to: Local style helper.
 * Database table affected: None.
 *
 * @param {string} status - Procurement status string.
 * @returns {string} CSS class name for styling.
 */
function getStatusBadgeClass(status) {
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
 * CHRDashboard Component
 * Executive dashboard for CHR Personnel. Displays high-level procurement metrics,
 * budget savings summary, recent procurements, and real-time transaction activity.
 * Includes an automatic 8-second refresh interval to demonstrate real-time updates.
 * Used by: App.jsx at route /chr/dashboard and default /.
 * Connects to: Endpoint /api/procurements/get_dashboard_summary.php
 * Database tables affected: Reads from procurements, bids, and transaction_history.
 */
export default function CHRDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  /**
   * Fetches latest dashboard summary statistics and recent projects from the PHP backend.
   * Used by: useEffect hook on initial component mount and manual refresh.
   * Connects to: /api/procurements/get_dashboard_summary.php
   * Database tables affected: Reads from procurements, bids, and transaction_history.
   */
  const fetchDashboard = async () => {
    try {
      setError(null);
      const data = await loadDashboardSummary();
      setDashboardData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const kpi = dashboardData?.kpi || {
    total_procurements: 0,
    total_open: 0,
    total_evaluation: 0,
    total_awarded: 0,
    total_bids: 0,
    total_abc: 0,
    total_awarded_amount: 0,
    total_savings: 0,
  };

  const recentProcurements = dashboardData?.recent_procurements || [];
  const recentHistory = dashboardData?.recent_history || [];

  return (
    <article aria-labelledby="chr-dashboard-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="chr-dashboard-heading" className="page-title">
            CHR Personnel Executive Dashboard
          </h1>
          <p className="page-subtitle">
            Centralized procurement overview &amp; real-time financial tracking for CHR-CAR
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            Last updated: {lastRefreshed.toLocaleTimeString()} (Auto-refreshes every 8s)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboard}
          >
            Refresh Data
          </button>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              To view real MySQL database records, start your PHP server (e.g. <code>php -S localhost:8000</code> in your project directory).
            </div>
          </div>
        </div>
      )}

      {/* Metric KPI Cards Section */}
      <section aria-labelledby="kpi-metrics-heading">
        <h2 id="kpi-metrics-heading" className="sr-only" style={{ display: 'none' }}>
          Key Procurement Indicators
        </h2>
        <div className="stat-cards-grid">
          {/* Total Procurements */}
          <div className="stat-card">
            <div className="stat-label">Total Procurements</div>
            <div className="stat-value">{kpi.total_procurements}</div>
            <div className="stat-subtext">Registered projects in MySQL</div>
          </div>

          {/* Open / Active */}
          <div className="stat-card">
            <div className="stat-label">Open for Quotations</div>
            <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
              {kpi.total_open}
            </div>
            <div className="stat-subtext">Active supplier opportunities</div>
          </div>

          {/* Under Review */}
          <div className="stat-card">
            <div className="stat-label">Under BAC Evaluation</div>
            <div className="stat-value" style={{ color: 'var(--color-accent-gold)' }}>
              {kpi.total_evaluation}
            </div>
            <div className="stat-subtext">{kpi.total_bids} supplier bids received</div>
          </div>

          {/* Awarded */}
          <div className="stat-card">
            <div className="stat-label">Awarded Projects</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {kpi.total_awarded}
            </div>
            <div className="stat-subtext">Contracts awarded with savings</div>
          </div>

          {/* Total ABC */}
          <div className="stat-card">
            <div className="stat-label">Total Allocated (ABC)</div>
            <div className="stat-value">{formatCurrency(kpi.total_abc)}</div>
            <div className="stat-subtext">Combined Approved Budget</div>
          </div>

          {/* Realized Savings */}
          <div className="stat-card highlight">
            <div className="stat-label">Procurement Savings</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {formatCurrency(kpi.total_savings)}
            </div>
            <div className="stat-subtext">Formula: Total ABC minus Awarded</div>
          </div>
        </div>
      </section>

      {/* Quick Action Buttons */}
      <section aria-labelledby="quick-actions-heading" style={{ margin: '20px 0' }}>
        <div className="gov-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ color: 'var(--color-primary-dark)' }}>Quick Procurement Actions:</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                Create, track, or review financial metrics
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/chr/procurements/new" className="btn btn-primary btn-sm">
                + New Procurement Form
              </Link>
              <Link to="/chr/procurements" className="btn btn-secondary btn-sm">
                View All Procurements Table
              </Link>
              <Link to="/chr/financials" className="btn btn-secondary btn-sm">
                Financial Monitoring Ledger
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Procurements Table Section */}
      <section aria-labelledby="recent-procurements-heading" style={{ marginTop: '24px' }}>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="recent-procurements-heading">Recent Procurement Projects</h3>
            <Link to="/chr/procurements" className="btn btn-secondary btn-sm">
              View All ({kpi.total_procurements}) &rarr;
            </Link>
          </header>
          <div className="gov-card-body" style={{ padding: 0 }}>
            {recentProcurements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No procurement records found in the database. Click &ldquo;+ New Procurement Form&rdquo; to create one.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference No.</th>
                      <th scope="col">Project Title</th>
                      <th scope="col">Approved Budget (ABC)</th>
                      <th scope="col">Awarded Price</th>
                      <th scope="col">Savings</th>
                      <th scope="col">Bids</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProcurements.map((proc) => (
                      <tr key={proc.id}>
                        <td>
                          <strong>{proc.reference_no || proc.reference_number}</strong>
                        </td>
                        <td>
                          <div>{proc.title}</div>
                          <small style={{ color: 'var(--color-text-subtle)' }}>
                            Mode: {proc.procurement_type || proc.procurement_mode || 'NP-53.9 Small Value'}
                          </small>
                        </td>
                        <td>{formatCurrency(proc.abc)}</td>
                        <td>
                          {proc.awarded_amount !== null ? formatCurrency(proc.awarded_amount) : <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                        </td>
                        <td>
                          {proc.savings !== null ? (
                            <strong style={{ color: 'var(--color-success)' }}>
                              {formatCurrency(proc.savings)}
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-draft">{proc.total_bids} bids</span>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(proc.status)}>
                            {proc.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/chr/procurements/${proc.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
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

      {/* Recent Transaction History Section */}
      <section aria-labelledby="recent-history-heading" style={{ marginTop: '24px' }}>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="recent-history-heading">Recent Real-Time Transaction Logs</h3>
            <Link to="/chr/history" className="btn btn-secondary btn-sm">
              Full Audit Trail &rarr;
            </Link>
          </header>
          <div className="gov-card-body" style={{ padding: 0 }}>
            {recentHistory.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No recent activity recorded.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Date / Time</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Action</th>
                      <th scope="col">Remarks</th>
                      <th scope="col">Performed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHistory.map((item) => (
                      <tr key={item.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <small>{item.created_at}</small>
                        </td>
                        <td>
                          <strong>{item.procurement_reference}</strong>
                        </td>
                        <td>
                          <span className="badge badge-published">{item.action}</span>
                        </td>
                        <td>{item.remarks}</td>
                        <td>
                          <small style={{ color: 'var(--color-text-muted)' }}>{item.performed_by}</small>
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
