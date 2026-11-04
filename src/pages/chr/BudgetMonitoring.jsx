import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/BudgetMonitoring.jsx
 * =============================================================================
 * 
 * Regional Budget & Procurement Financial Monitoring.
 * Tracks allocated funds, committed contracts, actual paid disbursements,
 * available remaining balances, and competitive procurement savings.
 */
export default function BudgetMonitoring() {
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback demo budget sources (matches database/schema.sql)
  const fallbackSources = [
    {
      id: 1,
      name: 'GAA 2024 - MOOE Regular',
      fiscal_year: 2024,
      description: 'General Appropriations Act Regular Maintenance and Other Operating Expenses',
      allocated_amount: 1250000.00,
      committed_amount: 480000.00,
      paid_amount: 210000.00,
      available_amount: 770000.00,
      procurement_savings: 24500.00,
      total_transactions: 3,
    },
    {
      id: 2,
      name: 'GAA 2024 - Capital Outlay',
      fiscal_year: 2024,
      description: 'Capital Outlay for ICT hardware, infrastructure, and heavy equipment',
      allocated_amount: 800000.00,
      committed_amount: 450000.00,
      paid_amount: 0.00,
      available_amount: 350000.00,
      procurement_savings: 21500.00,
      total_transactions: 1,
    },
    {
      id: 3,
      name: 'Human Rights Protection Program Fund',
      fiscal_year: 2024,
      description: 'Special operational fund for human rights investigations, IEC, and missions',
      allocated_amount: 500000.00,
      committed_amount: 180000.00,
      paid_amount: 89000.00,
      available_amount: 320000.00,
      procurement_savings: 12000.00,
      total_transactions: 2,
    },
    {
      id: 4,
      name: 'Gender and Development (GAD) Fund',
      fiscal_year: 2024,
      description: 'Mandatory statutory allocation for gender-responsive regional activities',
      allocated_amount: 300000.00,
      committed_amount: 95000.00,
      paid_amount: 45000.00,
      available_amount: 205000.00,
      procurement_savings: 6400.00,
      total_transactions: 1,
    },
  ];

  // Declare fetcher before useEffect
  const loadBudgetSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getBudgetSummary();
      if (res?.data?.budget_sources) {
        setSources(res.data.budget_sources);
        setSummary(res.data.grand_totals);
      } else {
        setSources(fallbackSources);
        calculateFallbackTotals(fallbackSources);
      }
    } catch (err) {
      // Offline fallback
      setSources(fallbackSources);
      calculateFallbackTotals(fallbackSources);
    } finally {
      setLoading(false);
    }
  };

  const calculateFallbackTotals = (list) => {
    const allocated = list.reduce((sum, s) => sum + s.allocated_amount, 0);
    const committed = list.reduce((sum, s) => sum + s.committed_amount, 0);
    const paid = list.reduce((sum, s) => sum + s.paid_amount, 0);
    const savings = list.reduce((sum, s) => sum + s.procurement_savings, 0);
    const available = allocated - committed;

    setSummary({
      total_allocated: allocated,
      total_committed: committed,
      total_paid: paid,
      total_available: available,
      total_savings: savings,
    });
  };

  useEffect(() => {
    loadBudgetSummary();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Budget &amp; Financial Monitoring</h1>
        <p>Commission on Human Rights &mdash; Cordillera Administrative Region Financial Ledger</p>
      </div>

      {/* Mandatory Prototype Scope Disclaimer */}
      <div className="notice-box info" style={{ marginBottom: '20px' }}>
        <div>
          <strong>Simplified Financial Monitoring Disclaimer:</strong> This module provides procurement-level fund commitment tracking, savings calculation, and disbursement monitoring. It is a prototype designed for college capstone defense and does not replace official government accounting ledgers (eCOA / GAM).
        </div>
      </div>

      {loading ? (
        <Loading message="Calculating regional procurement budget allocations..." />
      ) : (
        <>
          {/* High-level Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Allocated Budget</div>
              <div className="stat-value">{formatCurrency(summary?.total_allocated)}</div>
              <div className="stat-help">Combined FY 2024 Appropriations</div>
            </div>

            <div className="stat-card stat-accent">
              <div className="stat-label">Committed / Awarded</div>
              <div className="stat-value">{formatCurrency(summary?.total_committed)}</div>
              <div className="stat-help">Obligated under procurement contracts</div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-label">Disbursed / Paid</div>
              <div className="stat-value">{formatCurrency(summary?.total_paid)}</div>
              <div className="stat-help">Actual vouchers settled</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Available Balance</div>
              <div className="stat-value" style={{ color: 'var(--color-primary-dark)' }}>
                {formatCurrency(summary?.total_available)}
              </div>
              <div className="stat-help">Allocated minus Committed</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Procurement Savings</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(summary?.total_savings)}
              </div>
              <div className="stat-help">Total ABC minus Awarded Amounts</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Funding Source Allocations &amp; Utilization
              </h3>
            </div>
            <div>
              <Link to="/chr/transactions" className="btn btn-secondary">
                View Linked Transactions &rarr;
              </Link>
            </div>
          </div>

          {/* Budget Sources Breakdown Table */}
          <div className="gov-card">
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Funding Source &amp; Year</th>
                      <th>Appropriation (Allocated)</th>
                      <th>Committed (Contracts)</th>
                      <th>Disbursed (Paid)</th>
                      <th>Available Balance</th>
                      <th>Savings</th>
                      <th style={{ width: '160px' }}>Budget Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((src) => {
                      const utilRate =
                        src.allocated_amount > 0
                          ? Math.round((src.committed_amount / src.allocated_amount) * 100)
                          : 0;

                      return (
                        <tr key={src.id}>
                          <td>
                            <strong>{src.name}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                              Fiscal Year {src.fiscal_year} &bull; {src.total_transactions || 0} Projects
                            </div>
                            {src.description && (
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                {src.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{formatCurrency(src.allocated_amount)}</strong>
                          </td>
                          <td>{formatCurrency(src.committed_amount)}</td>
                          <td>{formatCurrency(src.paid_amount)}</td>
                          <td>
                            <strong style={{ color: src.available_amount < 0 ? 'var(--color-danger)' : 'var(--color-text-main)' }}>
                              {formatCurrency(src.available_amount)}
                            </strong>
                          </td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            {formatCurrency(src.procurement_savings)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                              <span>{utilRate}%</span>
                              <span style={{ color: 'var(--color-text-subtle)' }}>
                                {src.available_amount >= 0 ? 'Normal' : 'Overcommitted'}
                              </span>
                            </div>
                            <div className="progress-bar-container">
                              <div
                                className={`progress-bar-fill ${utilRate > 90 ? 'danger' : utilRate > 70 ? 'warning' : ''}`}
                                style={{ width: `${Math.min(100, utilRate)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
