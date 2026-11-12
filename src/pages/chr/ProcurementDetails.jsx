import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadProcurementDetails, updateProcurementStatus, selectWinningBid } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: ProcurementDetails to display ABC, awarded amount, savings, and bid amounts.
 * Connects to: Local formatting utility.
 * Database table affected: None.
 *
 * @param {number|null} val - Numeric value to format.
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
 * Maps procurement status strings to clean CSS badge classes.
 * Used by: ProcurementDetails to visually style the project status.
 * Connects to: Local styling helper.
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

// 9 Statutory Procurement Stages for government tracking under R.A. 9184
const STATUTORY_STAGES = [
  'Purchase Request',
  'Request for Quotation',
  'Abstract of Canvass',
  'BAC Resolution',
  'Notice of Award',
  'Purchase Order',
  'Notice to Proceed',
  'Delivery & Inspection',
  'Payment & Completion',
];

/**
 * ProcurementDetails Component
 * Comprehensive view of a single procurement record.
 * Integrates:
 * - Module 4: Procurement Details & Specifications
 * - Module 7: CHR Bid Table with Winning Bid Selection
 * - Module 8: Procurement Status Tracker across 9 statutory stages
 * - Module 10: Transaction History Audit Trail
 * Used by: App.jsx at route /chr/procurements/:id.
 * Connects to: /api/procurements/get_procurement.php, /api/procurements/update_status.php, and /api/procurements/select_bid.php
 * Database tables affected: Reads and updates 'procurements', 'bids', and 'transaction_history'.
 */
export default function ProcurementDetails() {
  const { id } = useParams();
  const [procurement, setProcurement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Status transition form state
  const [targetStage, setTargetStage] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [transitionRemarks, setTransitionRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  /**
   * Fetches the complete procurement record with items, bids, and history from the PHP backend.
   * Connects to: /api/procurements/get_procurement.php?id=X
   * Database tables affected: Reads from procurements, procurement_items, bids, and transaction_history.
   */
  const loadDetails = async () => {
    try {
      const data = await loadProcurementDetails(id);
      setProcurement(data);
      setTargetStage(data.current_stage || STATUTORY_STAGES[0]);
      setTargetStatus(data.status || 'Draft');
    } catch (err) {
      setErrorMessage('Failed to load procurement details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  /**
   * Submits a status/stage transition with remarks to the PHP backend.
   * Used by: Procurement Status Tracker form.
   * Connects to: /api/procurements/update_status.php
   * Database tables affected: Updates procurements, writes to transaction_history.
   *
   * @param {React.FormEvent} e
   */
  const handleStageTransitionSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setErrorMessage('');
    setActionSuccess('');

    try {
      await updateProcurementStatus({
        id: procurement.id,
        status: targetStatus,
        current_stage: targetStage,
        remarks: transitionRemarks || `Stage advanced to "${targetStage}" with status "${targetStatus}".`,
      });

      setActionSuccess(`Workflow milestone successfully updated to "${targetStage}"!`);
      setTransitionRemarks('');
      await loadDetails();
    } catch (err) {
      setErrorMessage('Failed to update stage: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /**
   * Selects a bidder quotation as the winning bid.
   * Transparently triggers award status, records awarded amount,
   * calculates savings (ABC - Awarded), and logs the event in transaction_history.
   * Used by: "Select as Winning Bid" button on each quotation row.
   * Connects to: /api/procurements/select_bid.php
   * Database tables affected: Updates bids and procurements, writes to transaction_history.
   *
   * @param {number} bidId - Primary key ID of the bid to award.
   * @param {string} bidderName - Company name of winning bidder.
   * @param {number} bidAmount - Price quotation amount.
   */
  const handleAwardBid = async (bidId, bidderName, bidAmount) => {
    const confirmAward = window.confirm(
      `Confirm Award Decision:\n\nSelect "${bidderName}" at ${formatCurrency(bidAmount)} as the winning quotation?\n\nThis will automatically calculate realized procurement savings and advance status to "Awarded".`
    );

    if (!confirmAward) return;

    setErrorMessage('');
    setActionSuccess('');

    try {
      const result = await selectWinningBid(
        bidId,
        `Selected "${bidderName}" as Lowest Calculated and Responsive Quotation at ${formatCurrency(bidAmount)}.`
      );

      setActionSuccess(
        `Quotation awarded to "${bidderName}"! Realized Savings: ${formatCurrency(result.savings)}.`
      );
      await loadDetails();
    } catch (err) {
      setErrorMessage('Failed to select winning bid: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading procurement record from MySQL...
      </div>
    );
  }

  if (!procurement) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>{errorMessage || 'Procurement record not found.'}</p>
        <Link to="/chr/procurements" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          &larr; Back to Procurements Table
        </Link>
      </div>
    );
  }

  const currentStageIndex = STATUTORY_STAGES.indexOf(procurement.current_stage);

  return (
    <article aria-labelledby="procurement-details-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className={getStatusBadgeClass(procurement.status)}>
              {procurement.status}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              Mode: {procurement.procurement_mode}
            </span>
          </div>
          <h1 id="procurement-details-heading" className="page-title">
            {procurement.reference_number}: {procurement.title}
          </h1>
          <p className="page-subtitle">
            Deadline: {procurement.deadline} &bull; Created: {procurement.created_at}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/chr/procurements/${procurement.id}/edit`} className="btn btn-secondary btn-sm">
            Edit Details
          </Link>
          <Link to="/chr/procurements" className="btn btn-secondary btn-sm">
            &larr; All Procurements
          </Link>
        </div>
      </header>

      {/* Action Success Alert */}
      {actionSuccess && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #bbf7d0',
            fontWeight: 500,
          }}
        >
          {actionSuccess}
        </aside>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <aside
          role="alert"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #fecaca',
            fontWeight: 500,
          }}
        >
          {errorMessage}
        </aside>
      )}

      {/* Financial Transparency Summary Cards */}
      <section aria-labelledby="financial-transparency-heading" style={{ marginBottom: '24px' }}>
        <h2 id="financial-transparency-heading" className="sr-only" style={{ display: 'none' }}>
          Financial Summary
        </h2>
        <div className="stat-cards-grid">
          {/* Approved Budget for Contract */}
          <div className="stat-card">
            <div className="stat-label">Approved Budget (ABC)</div>
            <div className="stat-value">{formatCurrency(procurement.abc)}</div>
            <div className="stat-subtext">Authorized government ceiling</div>
          </div>

          {/* Awarded Contract Price */}
          <div className="stat-card">
            <div className="stat-label">Awarded Contract Price</div>
            <div className="stat-value" style={{ color: procurement.awarded_amount ? 'var(--color-primary)' : 'inherit' }}>
              {formatCurrency(procurement.awarded_amount)}
            </div>
            <div className="stat-subtext">
              {procurement.awarded_bidder_name
                ? `Winning: ${procurement.awarded_bidder_name}`
                : 'Pending winning bid selection'}
            </div>
          </div>

          {/* Realized Procurement Savings */}
          <div className="stat-card highlight">
            <div className="stat-label">Realized Savings</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {formatCurrency(procurement.savings)}
            </div>
            <div className="stat-subtext">
              {procurement.savings && procurement.abc
                ? `${((procurement.savings / procurement.abc) * 100).toFixed(1)}% saved through competitive quotes`
                : 'Calculated upon bid award'}
            </div>
          </div>
        </div>
      </section>

      {/* Module 8: Procurement Status Tracker */}
      <section aria-labelledby="workflow-tracker-heading" style={{ marginBottom: '24px' }}>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="workflow-tracker-heading">8. Statutory Procurement Workflow Tracker</h3>
            <div>
              Current Stage: <span className="badge badge-selected">{procurement.current_stage}</span>
            </div>
          </header>
          <div className="gov-card-body">
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Statutory 9-stage workflow tracking under Philippine Government Procurement Reform Act (R.A. 9184) and CHR internal controls.
            </p>

            {/* Visual Workflow Stage Pills */}
            <nav aria-label="Procurement Milestone Stages" className="workflow-stages" style={{ marginBottom: '16px' }}>
              {STATUTORY_STAGES.map((st, idx) => {
                const isPast = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={st}
                    className={`stage-pill ${isCurrent ? 'active' : isPast ? 'completed' : ''}`}
                  >
                    {isPast ? '✓ ' : `${idx + 1}. `}{st}
                  </div>
                );
              })}
            </nav>

            {/* Advance Stage Form */}
            <form onSubmit={handleStageTransitionSubmit} style={{ marginTop: '20px', borderTop: '1px solid var(--color-border-light)', paddingTop: '16px' }}>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                  Update Project Status or Advance Stage
                </legend>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="stage-select" className="form-label">
                      Select Milestone Stage:
                    </label>
                    <select
                      id="stage-select"
                      className="form-input"
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value)}
                    >
                      {STATUTORY_STAGES.map((st, idx) => (
                        <option key={st} value={st}>
                          {idx + 1}. {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status-select" className="form-label">
                      Project Status:
                    </label>
                    <select
                      id="status-select"
                      className="form-input"
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published / Open">Published / Open</option>
                      <option value="Under Evaluation">Under Evaluation</option>
                      <option value="Awarded">Awarded</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="remarks-input" className="form-label">
                    Transition Remarks / Justification:
                  </label>
                  <input
                    id="remarks-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. BAC Resolution #014 approved; advancing to Notice of Award."
                    value={transitionRemarks}
                    onChange={(e) => setTransitionRemarks(e.target.value)}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? 'Updating Milestone...' : 'Save Stage & Status Transition'}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      </section>

      {/* Specifications & Line Items Table */}
      <section aria-labelledby="specs-heading" style={{ marginBottom: '24px' }}>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="specs-heading">Technical Line Items &amp; Delivery Scope</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              {(procurement.items || []).length} items defined
            </span>
          </header>
          <div className="gov-card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '40px' }}>#</th>
                    <th scope="col">Item Name</th>
                    <th scope="col">Technical Specifications</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Estimated Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(procurement.items || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td><strong>{idx + 1}</strong></td>
                      <td><strong>{item.item_name}</strong></td>
                      <td>{item.specifications || <span style={{ color: 'var(--color-text-subtle)' }}>Standard specifications</span>}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{formatCurrency(item.estimated_unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Module 7: CHR Bid Table */}
      <section aria-labelledby="chr-bid-table-heading" style={{ marginBottom: '24px' }}>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="chr-bid-table-heading">
              7. CHR Bid Table: Submitted Supplier Quotations ({(procurement.bids || []).length})
            </h3>
            <Link
              to={`/bidder/submit-bid?procurement_id=${procurement.id}`}
              className="btn btn-secondary btn-sm"
            >
              + Submit Quotation (as Bidder)
            </Link>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {(!procurement.bids || procurement.bids.length === 0) ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No bidder quotations submitted yet for this project.
                <div style={{ marginTop: '8px' }}>
                  <Link to={`/bidder/submit-bid?procurement_id=${procurement.id}`} className="btn btn-primary btn-sm">
                    Submit Demo Bid Quotation &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Supplier / Bidder Company</th>
                      <th scope="col">Representative &amp; Contact</th>
                      <th scope="col">Quotation Amount</th>
                      <th scope="col">Variance from ABC</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date Submitted</th>
                      <th scope="col">BAC Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procurement.bids.map((b) => {
                      const isAwarded = Number(procurement.awarded_bid_id) === Number(b.id) || b.status === 'Selected / Awarded';
                      const variance = procurement.abc - b.bid_amount;

                      return (
                        <tr
                          key={b.id}
                          style={{
                            backgroundColor: isAwarded ? '#f0fdf4' : 'inherit',
                          }}
                        >
                          <td>
                            <strong>{b.bidder_name}</strong>
                            {isAwarded && (
                              <div style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 700 }}>
                                ★ WINNING SUPPLIER
                              </div>
                            )}
                          </td>
                          <td>
                            <div>{b.representative_name}</div>
                            <small style={{ color: 'var(--color-text-subtle)' }}>
                              {b.contact_number} &bull; {b.email}
                            </small>
                          </td>
                          <td>
                            <strong style={{ fontSize: '14.5px' }}>
                              {formatCurrency(b.bid_amount)}
                            </strong>
                          </td>
                          <td>
                            {variance >= 0 ? (
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                - {formatCurrency(variance)} (Below ABC)
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                + {formatCurrency(Math.abs(variance))} (Exceeds ABC)
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={isAwarded ? 'badge badge-selected' : 'badge badge-review'}>
                              {isAwarded ? 'Selected / Awarded' : b.status}
                            </span>
                          </td>
                          <td>
                            <small>{b.created_at}</small>
                          </td>
                          <td>
                            {isAwarded ? (
                              <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '12px' }}>
                                ✓ Contract Awarded
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '11.5px', padding: '4px 8px' }}
                                onClick={() => handleAwardBid(b.id, b.bidder_name, b.bid_amount)}
                              >
                                Select Winning Bid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Module 10: Transaction History Audit Trail */}
      <section aria-labelledby="history-heading">
        <div className="gov-card">
          <header className="gov-card-header">
            <h3 id="history-heading">10. Transaction History &amp; Audit Trail</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              {(procurement.history || []).length} logged events
            </span>
          </header>
          <div className="gov-card-body" style={{ padding: 0 }}>
            {(!procurement.history || procurement.history.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No history entries recorded yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '160px' }}>Date &amp; Time</th>
                      <th scope="col">Action Taken</th>
                      <th scope="col">Status Transition</th>
                      <th scope="col">Remarks &amp; Details</th>
                      <th scope="col">Performed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procurement.history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <small>{h.created_at}</small>
                        </td>
                        <td>
                          <strong>{h.action}</strong>
                        </td>
                        <td>
                          {h.previous_status && h.new_status ? (
                            <span>
                              <span className="badge badge-draft">{h.previous_status}</span> &rarr;{' '}
                              <span className="badge badge-published">{h.new_status}</span>
                            </span>
                          ) : (
                            <span className="badge badge-draft">{h.new_status || 'Initial'}</span>
                          )}
                        </td>
                        <td>{h.remarks}</td>
                        <td>
                          <small style={{ color: 'var(--color-text-muted)' }}>{h.performed_by}</small>
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
