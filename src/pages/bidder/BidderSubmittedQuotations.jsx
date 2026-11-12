import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadBids } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: BidderSubmittedQuotations component.
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
 * Maps bid evaluation status to CSS badge classes.
 * Used by: BidderSubmittedQuotations component.
 * Connects to: Local style helper.
 * Database table affected: None.
 *
 * @param {string} status - Bid evaluation status.
 * @returns {string} CSS class name.
 */
function getBidBadgeClass(status) {
  switch (status) {
    case 'Selected / Awarded':
      return 'badge badge-selected';
    case 'Under Review':
      return 'badge badge-review';
    case 'Disqualified / Rejected':
      return 'badge badge-danger';
    case 'Submitted':
    default:
      return 'badge badge-published';
  }
}

/**
 * BidderSubmittedQuotations Component
 * Allows prospective suppliers to review all price quotations submitted into the centralized system.
 * Displays supplier company name, project title, quoted amount, and real-time BAC evaluation status.
 * Used by: App.jsx at route /bidder/my-quotations.
 * Connects to: /api/procurements/get_bids.php
 * Database tables affected: Reads from 'bids' and 'procurements'.
 */
export default function BidderSubmittedQuotations() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches all submitted quotations from the PHP backend.
   * Connects to: /api/procurements/get_bids.php
   * Database tables affected: Reads from bids and procurements.
   */
  const fetchAllBids = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await loadBids();
      setBids(records);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBids();
  }, []);

  return (
    <article aria-labelledby="submitted-quotations-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="submitted-quotations-heading" className="page-title">
            Supplier Quotations Log
          </h1>
          <p className="page-subtitle">
            Track submitted quotations, price proposals, and evaluation results in real-time
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchAllBids}
          >
            Refresh List
          </button>
          <Link to="/bidder/submit-bid" className="btn btn-primary btn-sm">
            + Submit New Quotation
          </Link>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start your PHP development server (e.g. <code>php -S localhost:8000</code>) to fetch live quotations from MySQL.
            </div>
          </div>
        </div>
      )}

      {/* Quotations Table Section */}
      <section aria-labelledby="bids-table-heading">
        <h2 id="bids-table-heading" className="sr-only" style={{ display: 'none' }}>
          Submitted Quotations Table
        </h2>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Registered Quotation Submissions ({bids.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Connected to MySQL bids table &bull; Real-time status sync
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading && bids.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading quotation records from MySQL...
              </div>
            ) : bids.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No quotations submitted yet. Click &ldquo;+ Submit New Quotation&rdquo; to test submission.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Date Submitted</th>
                      <th scope="col">Procurement Reference &amp; Project</th>
                      <th scope="col">Supplier / Bidder Company</th>
                      <th scope="col">Representative &amp; Contact</th>
                      <th scope="col">Quoted Price</th>
                      <th scope="col">Approved Budget (ABC)</th>
                      <th scope="col">Evaluation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((b) => (
                      <tr key={b.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <small>{b.created_at}</small>
                        </td>
                        <td>
                          <div><strong>{b.procurement_reference}</strong></div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-main)' }}>
                            {b.procurement_title}
                          </div>
                        </td>
                        <td>
                          <strong>{b.bidder_name}</strong>
                          {b.remarks && (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                              &ldquo;{b.remarks}&rdquo;
                            </p>
                          )}
                        </td>
                        <td>
                          <div>{b.representative_name}</div>
                          <small style={{ color: 'var(--color-text-subtle)' }}>
                            {b.contact_number} &bull; {b.email}
                          </small>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: '14.5px' }}>
                            {formatCurrency(b.bid_amount)}
                          </strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatCurrency(b.procurement_abc)}
                        </td>
                        <td>
                          <span className={getBidBadgeClass(b.status)}>
                            {b.status}
                          </span>
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
