import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/CHRDashboard.jsx
 * =============================================================================
 * 
 * CHR Personnel Operational Dashboard.
 * Displays high-level procurement KPIs, workflow stage distribution,
 * recent procurement opportunities, and ongoing transactions.
 */
export default function CHRDashboard() {
  const [metrics, setMetrics] = useState({
    open_opportunities: 5,
    pending_bids: 8,
    active_transactions_count: 4,
    completed_transactions_count: 1,
    total_abc_active: 755000,
    total_awarded: 289500,
    total_savings: 85400,
    stages_breakdown: [],
  });

  const [recentOpportunities, setRecentOpportunities] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);

  // Fallback demo records (matches database/schema.sql)
  const fallbackOpportunities = [
    {
      id: 1,
      reference_no: 'CHR-CAR-2024-001',
      title: 'Procurement of Office Supplies for Q3 2024',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 150000.00,
      deadline: '2024-11-15 17:00:00',
      status: 'open',
      bids_count: 4,
    },
    {
      id: 2,
      reference_no: 'CHR-CAR-2024-002',
      title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 450000.00,
      deadline: '2024-11-20 17:00:00',
      status: 'open',
      bids_count: 3,
    },
    {
      id: 3,
      reference_no: 'CHR-CAR-2024-003',
      title: 'Catering and Venue for Human Rights Regional Summit',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 85000.00,
      deadline: '2024-11-28 12:00:00',
      status: 'draft',
      bids_count: 0,
    },
    {
      id: 4,
      reference_no: 'CHR-CAR-2024-004',
      title: 'Preventive Maintenance and Replacement Parts for Service Vehicle',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 60000.00,
      deadline: '2024-10-30 17:00:00',
      status: 'closed',
      bids_count: 2,
    },
  ];

  const fallbackTransactions = [
    {
      id: 1,
      control_no: 'TXN-2024-0001',
      opportunity_title: 'Procurement of Office Supplies for Q3 2024',
      current_stage: 'Abstract / Canvass',
      abc: 150000.00,
      awarded_amount: 142500.00,
      savings: 7500.00,
      payment_status: 'not_for_billing',
    },
    {
      id: 2,
      control_no: 'TXN-2024-0002',
      opportunity_title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
      current_stage: 'Request for Quotation',
      abc: 450000.00,
      awarded_amount: 428500.00,
      savings: 21500.00,
      payment_status: 'not_for_billing',
    },
    {
      id: 3,
      control_no: 'TXN-2024-0003',
      opportunity_title: 'Preventive Maintenance and Replacement Parts for Service Vehicle',
      current_stage: 'Notice of Award',
      abc: 60000.00,
      awarded_amount: 58000.00,
      savings: 2000.00,
      payment_status: 'processing',
    },
    {
      id: 4,
      control_no: 'TXN-2024-0004',
      opportunity_title: 'Meals & Venue for HR Violations Documentation Training',
      current_stage: 'Completed',
      abc: 95000.00,
      awarded_amount: 89000.00,
      savings: 6000.00,
      payment_status: 'paid',
    },
  ];

  // Function declared before useEffect to respect TDZ rules
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      const summaryRes = await api.getDashboardSummary();
      if (summaryRes?.data) {
        setMetrics((prev) => ({
          ...prev,
          ...summaryRes.data,
        }));
      }

      // 2. Fetch opportunities
      const oppsRes = await api.getCHROpportunities();
      if (oppsRes?.data?.opportunities) {
        setRecentOpportunities(oppsRes.data.opportunities.slice(0, 5));
      } else {
        setRecentOpportunities(fallbackOpportunities);
      }

      // 3. Fetch transactions
      const txRes = await api.getTransactions();
      if (txRes?.data?.transactions) {
        setRecentTransactions(txRes.data.transactions.slice(0, 5));
      } else {
        setRecentTransactions(fallbackTransactions);
      }

      setOfflineNotice(false);
    } catch (err) {
      // Fallback for presentation / offline dev mode
      setOfflineNotice(true);
      setRecentOpportunities(fallbackOpportunities);
      setRecentTransactions(fallbackTransactions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="page-header">
        <h1>CHR Personnel Dashboard</h1>
        <p>Commission on Human Rights &mdash; Cordillera Administrative Region Procurement Unit</p>
      </div>

      {offlineNotice && (
        <div className="notice-box info" style={{ marginBottom: '16px' }}>
          <div>
            <strong>Interactive Prototype Mode:</strong> Displaying local seed data. Connect XAMPP / Apache MySQL to view live database synchronization.
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Opportunities</div>
          <div className="stat-value">{metrics.open_opportunities}</div>
          <div className="stat-help">Published &amp; open for RFQ/Bids</div>
        </div>

        <div className="stat-card stat-accent">
          <div className="stat-label">Pending Bid Evaluations</div>
          <div className="stat-value">{metrics.pending_bids}</div>
          <div className="stat-help">Quotations awaiting CHR review</div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-label">Active Transactions</div>
          <div className="stat-value">{metrics.active_transactions_count}</div>
          <div className="stat-help">Tracked across 11 stages</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Budget Savings (YTD)</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(metrics.total_savings)}
          </div>
          <div className="stat-help">Difference: Total ABC minus Awarded</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar" style={{ marginTop: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Quick Procurement Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/chr/opportunities/new" className="btn btn-primary">
            + New Opportunity
          </Link>
          <Link to="/chr/opportunities" className="btn btn-secondary">
            Manage Opportunities
          </Link>
          <Link to="/chr/transactions" className="btn btn-secondary">
            Transactions Tracker
          </Link>
          <Link to="/chr/budget" className="btn btn-secondary">
            Budget Monitoring
          </Link>
          <Link to="/chr/reports" className="btn btn-outline">
            Reports
          </Link>
        </div>
      </div>

      {loading ? (
        <Loading message="Loading dashboard statistics..." />
      ) : (
        <>
          {/* Ongoing Transactions Table */}
          <div className="gov-card" style={{ marginBottom: '24px' }}>
            <div className="gov-card-header">
              <h3>Active Procurement Transactions</h3>
              <Link to="/chr/transactions" className="btn btn-secondary btn-sm">
                View All Transactions &rarr;
              </Link>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Transaction Code</th>
                      <th>Opportunity Title</th>
                      <th>Current Stage</th>
                      <th>Approved Budget (ABC)</th>
                      <th>Awarded Amount</th>
                      <th>Savings</th>
                      <th>Payment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td><strong>{tx.control_no}</strong></td>
                        <td>{tx.opportunity_title}</td>
                        <td>
                          <span className="stage-pill active">{tx.current_stage}</span>
                        </td>
                        <td>{formatCurrency(tx.abc)}</td>
                        <td>{tx.awarded_amount ? formatCurrency(tx.awarded_amount) : 'Pending'}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                          {tx.savings !== null && tx.savings !== undefined
                            ? formatCurrency(tx.savings)
                            : '—'}
                        </td>
                        <td>
                          <StatusBadge status={tx.payment_status || 'not_for_billing'} />
                        </td>
                        <td>
                          <Link to={`/chr/transactions/${tx.id}`} className="btn btn-outline btn-sm">
                            Track
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Opportunities Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3>Recent Procurement Postings</h3>
              <Link to="/chr/opportunities" className="btn btn-secondary btn-sm">
                Manage All Postings &rarr;
              </Link>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Project Title</th>
                      <th>Procurement Mode</th>
                      <th>ABC</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOpportunities.map((opp) => (
                      <tr key={opp.id}>
                        <td><strong>{opp.reference_no}</strong></td>
                        <td>{opp.title}</td>
                        <td><small>{opp.procurement_type}</small></td>
                        <td>{formatCurrency(opp.abc)}</td>
                        <td>
                          <small>
                            {opp.deadline
                              ? new Date(opp.deadline).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </small>
                        </td>
                        <td>
                          <StatusBadge status={opp.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Link
                              to={`/chr/opportunities/${opp.id}/submissions`}
                              className="btn btn-secondary btn-sm"
                            >
                              Submissions
                            </Link>
                            <Link
                              to={`/chr/opportunities/${opp.id}/edit`}
                              className="btn btn-outline btn-sm"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
