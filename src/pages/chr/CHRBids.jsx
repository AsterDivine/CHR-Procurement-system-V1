import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadBids, selectWinningBid, loadProcurements } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: CHRBids to display ABC, bid amount, and potential savings.
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
 * Maps bid status strings to clean CSS badge classes.
 * Used by: CHRBids to render visual status badges.
 * Connects to: Local style helper.
 * Database table affected: None.
 *
 * @param {string} status - Bid status string.
 * @returns {string} CSS class name for styling.
 */
function getBidBadgeClass(status) {
  switch (status) {
    case 'Selected':
    case 'Selected / Awarded':
      return 'badge badge-selected';
    case 'Under Review':
      return 'badge badge-review';
    case 'Not Selected':
    case 'Disqualified / Rejected':
      return 'badge badge-not-selected';
    case 'Submitted':
    default:
      return 'badge badge-submitted';
  }
}

/**
 * CHRBids Component
 * CHR Personnel evaluation portal for supplier quotations across all projects.
 * Lists all submitted price bids, shows potential savings, and allows awarding.
 * Used by: App.jsx at route /chr/bids.
 * Connects to: Endpoints /api/procurements/get_bids.php and /api/procurements/select_bid.php.
 * Database tables affected: Reads and updates 'bids' and 'procurements', writes 'transaction_history'.
 */
export default function CHRBids() {
  const [bids, setBids] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [selectedProcurementFilter, setSelectedProcurementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  /**
   * Loads all submitted bids and active procurements from the PHP backend.
   * Used by: useEffect on component mount and after awarding a bid.
   * Connects to: /api/procurements/get_bids.php and /api/procurements/get_procurements.php.
   * Database tables affected: Reads 'bids' and 'procurements'.
   */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bidList, procList] = await Promise.all([
        loadBids(selectedProcurementFilter),
        loadProcurements(),
      ]);
      setBids(bidList || []);
      setProcurements(procList || []);
    } catch (err) {
      console.error('Error loading bids:', err);
      setError(err.message || 'Unable to connect to the PHP backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProcurementFilter]);

  /**
   * Handles selection of a winning quotation by CHR Personnel.
   * Used by: "Select as Winning Bid" button in the table.
   * Connects to: Endpoint /api/procurements/select_bid.php.
   * Database tables affected: Updates 'bids' and 'procurements', inserts into 'transaction_history'.
   *
   * @param {object} bid - The bid object being awarded.
   */
  const handleSelectWinner = async (bid) => {
    const confirmMsg = `Confirm awarding contract for "${bid.procurement_reference}" to:\n\nSupplier: ${bid.bidder_name}\nQuoted Amount: ${formatCurrency(bid.bid_amount)}\n\nThis will automatically calculate savings and advance project stage to "Notice of Award".`;
    if (!window.confirm(confirmMsg)) return;

    setSubmittingId(bid.id);
    setActionSuccess(null);
    setError(null);

    try {
      const result = await selectWinningBid(
        bid.id,
        `Winning quotation selected by CHR BAC Committee. Realized savings: ${formatCurrency(bid.potential_savings)}.`
      );
      setActionSuccess(
        `Successfully awarded project "${bid.procurement_reference}" to ${bid.bidder_name} at ${formatCurrency(bid.bid_amount)}! Realized savings: ${formatCurrency(result.savings)}.`
      );
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to select winning bid.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Filter bids by status if requested
  const filteredBids = bids.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  return (
    <article aria-labelledby="chr-bids-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="chr-bids-heading" className="page-title">
            Bids Evaluation &amp; Quotation Management
          </h1>
          <p className="page-subtitle">
            Review all submitted supplier quotations, evaluate potential budget savings, and award winning contracts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            disabled={loading}
          >
            Refresh Quotations
          </button>
          <Link to="/chr/procurements" className="btn btn-outline btn-sm">
            &larr; Procurement Records
          </Link>
        </div>
      </header>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="notice-box" role="status" style={{ borderLeftColor: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <div>
            <strong>Award Confirmed:</strong> {actionSuccess}
          </div>
        </div>
      )}

      {error && (
        <div className="notice-box warning" role="alert">
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Verify that MySQL is running and your PHP server is started (e.g. <code>php -S localhost:8000</code>).
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <section aria-label="Bid Filtering Controls" className="gov-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Procurement Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1 }}>
            <label htmlFor="procurement-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap' }}>
              Filter by Project:
            </label>
            <select
              id="procurement-filter"
              className="form-select"
              value={selectedProcurementFilter}
              onChange={(e) => setSelectedProcurementFilter(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">-- All Procurement Projects --</option>
              {procurements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference_number} - {p.title.length > 50 ? p.title.substring(0, 50) + '...' : p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status:</span>
            {['ALL', 'Submitted', 'Under Review', 'Selected', 'Not Selected'].map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quotations Table */}
      <section aria-label="Submitted Quotations Table">
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Submitted Quotations List ({filteredBids.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              BAC evaluation based on Lowest Calculated and Responsive Quotation (LCRQ)
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading submitted bids from MySQL...</p>
              </div>
            ) : filteredBids.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No Quotations Found</p>
                <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
                  There are no submitted bids matching the selected filters. Prospective suppliers can submit price quotations via the Bidder portal.
                </p>
                <Link to="/bidder/submit-bid" className="btn btn-secondary btn-sm">
                  Go to Bidder Submission Form &rarr;
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Bid ID</th>
                      <th scope="col">Procurement Project</th>
                      <th scope="col">Bidder / Supplier</th>
                      <th scope="col">Contact Info</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Quoted Price</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Project ABC</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Potential Savings</th>
                      <th scope="col">Bid Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBids.map((bid) => {
                      const isAwarded = bid.status === 'Selected / Awarded';
                      const isExceeding = bid.bid_amount > bid.procurement_abc;

                      return (
                        <tr key={bid.id} style={{ backgroundColor: isAwarded ? 'var(--color-primary-subtle)' : undefined }}>
                          <td>
                            <strong>#{bid.id}</strong>
                          </td>
                          <td>
                            <Link to={`/chr/procurements/${bid.procurement_id}`} style={{ fontWeight: 600 }}>
                              {bid.procurement_reference}
                            </Link>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bid.procurement_title}
                            </div>
                          </td>
                          <td>
                            <strong>{bid.company_name || bid.bidder_name}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                              Rep: {bid.bidder_name}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px' }}>{bid.contact_number || 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{bid.email || 'Direct Submission'}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-main)' }}>
                            {formatCurrency(bid.bid_amount)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                            {formatCurrency(bid.procurement_abc)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isExceeding ? (
                              <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600 }}>
                                Exceeds ABC
                              </span>
                            ) : (
                              <strong style={{ color: 'var(--color-success)' }}>
                                {formatCurrency(bid.potential_savings)}
                              </strong>
                            )}
                          </td>
                          <td>
                            <span className={getBidBadgeClass(bid.status)}>
                              {bid.status}
                            </span>
                          </td>
                          <td>
                            {isAwarded ? (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>
                                &#10003; Winning Bid
                              </span>
                            ) : isExceeding ? (
                              <span style={{ fontSize: '11.5px', color: 'var(--color-text-subtle)' }}>
                                Ineligible (Over ABC)
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSelectWinner(bid)}
                                disabled={submittingId === bid.id}
                                style={{ fontSize: '11.5px', padding: '4px 8px' }}
                              >
                                {submittingId === bid.id ? 'Awarding...' : 'Select as Winner'}
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
    </article>
  );
}
