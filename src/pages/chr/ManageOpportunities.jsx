import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/ManageOpportunities.jsx
 * =============================================================================
 * 
 * CHR Personnel Opportunity Management Table.
 * Allows CHR personnel to view, filter, edit, and advance the status of
 * procurement opportunities, as well as inspect bidder submissions.
 */
export default function ManageOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Fallback demo data
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
    {
      id: 5,
      reference_no: 'CHR-CAR-2024-005',
      title: 'Printed IEC Materials on Anti-Torture Act Campaign',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 95000.00,
      deadline: '2024-10-15 17:00:00',
      status: 'awarded',
      bids_count: 2,
    },
  ];

  // Declare fetch function before useEffect
  const loadOpportunities = async () => {
    setLoading(true);
    setActionError('');
    try {
      const res = await api.getCHROpportunities(statusFilter);
      if (res?.data?.opportunities) {
        setOpportunities(res.data.opportunities);
      } else {
        setOpportunities(fallbackOpportunities);
      }
    } catch (err) {
      // Offline fallback
      let list = fallbackOpportunities;
      if (statusFilter) {
        list = list.filter((item) => item.status === statusFilter);
      }
      setOpportunities(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [statusFilter]);

  // Allowed next status logic based on change_status.php
  const getNextStatusAction = (currentStatus) => {
    switch (currentStatus) {
      case 'draft':
        return { target: 'open', label: 'Publish (Open)', confirmText: 'Publish this opportunity to "open" status for bidders?' };
      case 'open':
        return { target: 'closed', label: 'Close Bidding', confirmText: 'Close submission of bids for this opportunity?' };
      case 'closed':
        return { target: 'awarded', label: 'Mark Awarded', confirmText: 'Mark this opportunity as "awarded"?' };
      case 'awarded':
        return { target: 'completed', label: 'Mark Completed', confirmText: 'Mark this procurement as "completed"?' };
      default:
        return null;
    }
  };

  const handleStatusChange = async (id, targetStatus, confirmText) => {
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      setActionError('');
      await api.changeOpportunityStatus(id, targetStatus);
      setActionMessage(`Opportunity status updated to "${targetStatus}".`);
      loadOpportunities();
      setTimeout(() => setActionMessage(''), 3500);
    } catch (err) {
      // Local state update fallback if offline
      setOpportunities((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: targetStatus } : item))
      );
      setActionMessage(`Opportunity status updated to "${targetStatus}" (Prototype local update).`);
      setTimeout(() => setActionMessage(''), 3500);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opp.reference_no?.toLowerCase().includes(term) ||
      opp.title?.toLowerCase().includes(term) ||
      opp.procurement_type?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1>Manage Procurement Opportunities</h1>
        <p>Commission on Human Rights &mdash; Cordillera Administrative Region Procurement Unit</p>
      </div>

      {actionMessage && (
        <div className="notice-box info" style={{ marginBottom: '16px' }}>
          <div>{actionMessage}</div>
        </div>
      )}

      {actionError && (
        <div className="notice-box warning" style={{ marginBottom: '16px' }}>
          <div>{actionError}</div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="action-bar">
        <div className="search-input-group">
          <input
            type="text"
            className="form-input"
            placeholder="Search by reference no. or project title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Link to="/chr/opportunities/new" className="btn btn-primary">
            + Post New Opportunity
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs / Buttons */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-btn ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          All Opportunities
        </button>
        <button
          type="button"
          className={`filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
          onClick={() => setStatusFilter('draft')}
        >
          Draft
        </button>
        <button
          type="button"
          className={`filter-btn ${statusFilter === 'open' ? 'active' : ''}`}
          onClick={() => setStatusFilter('open')}
        >
          Open
        </button>
        <button
          type="button"
          className={`filter-btn ${statusFilter === 'closed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('closed')}
        >
          Closed
        </button>
        <button
          type="button"
          className={`filter-btn ${statusFilter === 'awarded' ? 'active' : ''}`}
          onClick={() => setStatusFilter('awarded')}
        >
          Awarded
        </button>
        <button
          type="button"
          className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <Loading message="Loading procurement opportunities..." />
      ) : filteredOpportunities.length === 0 ? (
        <EmptyState
          title="No Opportunities Found"
          description={
            statusFilter
              ? `No opportunities match the status filter "${statusFilter}".`
              : 'No procurement opportunities have been posted yet.'
          }
          actionLink="/chr/opportunities/new"
          actionLabel="+ Post New Opportunity"
        />
      ) : (
        <div className="gov-card">
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opp) => {
                    const nextAction = getNextStatusAction(opp.status);
                    const isLocked = opp.status === 'awarded' || opp.status === 'completed';

                    return (
                      <tr key={opp.id}>
                        <td><strong>{opp.reference_no}</strong></td>
                        <td style={{ maxWidth: '280px' }}>
                          <div>{opp.title}</div>
                        </td>
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Submissions link */}
                            <Link
                              to={`/chr/opportunities/${opp.id}/submissions`}
                              className="btn btn-secondary btn-sm"
                              title="Inspect bidder quotations"
                            >
                              Submissions
                            </Link>

                            {/* Edit link (if not locked) */}
                            {!isLocked && (
                              <Link
                                to={`/chr/opportunities/${opp.id}/edit`}
                                className="btn btn-outline btn-sm"
                                title="Edit project details and line items"
                              >
                                Edit
                              </Link>
                            )}

                            {/* Change status button */}
                            {nextAction && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  handleStatusChange(opp.id, nextAction.target, nextAction.confirmText)
                                }
                              >
                                {nextAction.label}
                              </button>
                            )}
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
      )}
    </div>
  );
}
