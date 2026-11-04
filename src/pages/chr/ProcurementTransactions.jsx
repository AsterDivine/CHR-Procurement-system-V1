import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/ProcurementTransactions.jsx
 * =============================================================================
 * 
 * Central Transactions Tracker for CHR Personnel.
 * Monitors transactions through the 11 statutory stages, financial commitments,
 * savings realizations, and payment states.
 */
export default function ProcurementTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [stageFilter, setStageFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 11 statutory stages
  const stagesList = [
    'Purchase Request',
    'Request for Quotation',
    'Abstract / Canvass',
    'BAC Resolution',
    'Notice of Award',
    'Purchase Order',
    'Notice to Proceed',
    'Delivery / Implementation',
    'Inspection / Evaluation',
    'Billing / Payment',
    'Completed',
  ];

  // Fallback demo data (matches database/schema.sql)
  const fallbackTransactions = [
    {
      id: 1,
      control_no: 'TXN-2024-0001',
      opportunity_id: 1,
      opportunity_title: 'Procurement of Office Supplies for Q3 2024',
      budget_source_name: 'GAA 2024 - MOOE Regular',
      expense_category: 'Supplies & Materials',
      abc: 150000.00,
      awarded_amount: 142500.00,
      savings: 7500.00,
      current_stage: 'Abstract / Canvass',
      payment_status: 'not_for_billing',
      supplier_name: 'Highland Paper Traders',
    },
    {
      id: 2,
      control_no: 'TXN-2024-0002',
      opportunity_id: 2,
      opportunity_title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
      budget_source_name: 'GAA 2024 - Capital Outlay',
      expense_category: 'Information Technology',
      abc: 450000.00,
      awarded_amount: 428500.00,
      savings: 21500.00,
      current_stage: 'Request for Quotation',
      payment_status: 'not_for_billing',
      supplier_name: 'Cordillera Computer Trading',
    },
    {
      id: 3,
      control_no: 'TXN-2024-0003',
      opportunity_id: 4,
      opportunity_title: 'Preventive Maintenance and Replacement Parts for Service Vehicle',
      budget_source_name: 'GAA 2024 - MOOE Regular',
      expense_category: 'Services & Repairs',
      abc: 60000.00,
      awarded_amount: 58000.00,
      savings: 2000.00,
      current_stage: 'Notice of Award',
      payment_status: 'processing',
      supplier_name: 'Baguio Auto Care Services',
    },
    {
      id: 4,
      control_no: 'TXN-2024-0004',
      opportunity_id: 5,
      opportunity_title: 'Printed IEC Materials on Anti-Torture Act Campaign',
      budget_source_name: 'Human Rights Protection Fund',
      expense_category: 'Printing & Publication',
      abc: 95000.00,
      awarded_amount: 89000.00,
      savings: 6000.00,
      current_stage: 'Completed',
      payment_status: 'paid',
      supplier_name: 'North Luzon Press Corp.',
    },
  ];

  // Declare fetcher before useEffect
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions(stageFilter);
      if (res?.data?.transactions) {
        setTransactions(res.data.transactions);
      } else {
        setTransactions(fallbackTransactions);
      }
    } catch (err) {
      // Offline fallback
      let list = fallbackTransactions;
      if (stageFilter) {
        list = list.filter((t) => t.current_stage === stageFilter);
      }
      setTransactions(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [stageFilter]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.control_no?.toLowerCase().includes(term) ||
      tx.opportunity_title?.toLowerCase().includes(term) ||
      tx.budget_source_name?.toLowerCase().includes(term) ||
      tx.supplier_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1>Procurement Transactions Tracker</h1>
        <p>Commission on Human Rights &mdash; Cordillera Administrative Region Procurement Unit</p>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="search-input-group">
          <input
            type="text"
            className="form-input"
            placeholder="Search by control no., project title, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Link to="/chr/opportunities" className="btn btn-secondary">
            View Opportunities to Create Tracker &rarr;
          </Link>
        </div>
      </div>

      {/* Stage Filter Selector */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label htmlFor="stage-filter" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Filter by Workflow Stage:
        </label>
        <select
          id="stage-filter"
          className="form-select"
          style={{ maxWidth: '300px' }}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All Stages (All Transactions)</option>
          {stagesList.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        {stageFilter && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setStageFilter('')}
          >
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <Loading message="Loading procurement transactions..." />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          title="No Transactions Found"
          description={
            stageFilter
              ? `No transactions currently in stage "${stageFilter}".`
              : 'No transactions have been created yet. Transactions are created from selected bidder quotations.'
          }
          actionLink="/chr/opportunities"
          actionLabel="Go to Opportunities"
        />
      ) : (
        <div className="gov-card">
          <div className="gov-card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Control Number</th>
                    <th>Procurement Project</th>
                    <th>Current Stage</th>
                    <th>Approved Budget (ABC)</th>
                    <th>Awarded Amount</th>
                    <th>Savings</th>
                    <th>Funding Source</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <strong>{tx.control_no}</strong>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div>{tx.opportunity_title}</div>
                        {tx.supplier_name && (
                          <small style={{ color: 'var(--color-text-subtle)' }}>
                            Supplier: {tx.supplier_name}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="stage-pill active">{tx.current_stage}</span>
                      </td>
                      <td>{formatCurrency(tx.abc)}</td>
                      <td>
                        {tx.awarded_amount ? formatCurrency(tx.awarded_amount) : 'Pending'}
                      </td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        {tx.savings !== null && tx.savings !== undefined
                          ? formatCurrency(tx.savings)
                          : '—'}
                      </td>
                      <td>
                        <small>{tx.budget_source_name || 'Unassigned'}</small>
                      </td>
                      <td>
                        <StatusBadge status={tx.payment_status || 'not_for_billing'} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/chr/transactions/${tx.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Track / Manage &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
