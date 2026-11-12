import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadProcurements } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: BidderOpportunities component to display Approved Budget for Contract (ABC).
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
 * Calculates remaining days until deadline.
 * Used by: BidderOpportunities component to give prospective suppliers clear deadline notices.
 * Connects to: Local date calculation helper.
 * Database table affected: None.
 *
 * @param {string} deadlineStr - MySQL DATETIME string.
 * @returns {string} Human-readable deadline countdown or expiration notice.
 */
function getDeadlineStatus(deadlineStr) {
  if (!deadlineStr) return 'No deadline set';
  const deadlineDate = new Date(deadlineStr);
  const now = new Date();
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Deadline Expired';
  } else if (diffDays === 0) {
    return 'Due Today at ' + deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return `${diffDays} day(s) remaining`;
  }
}

/**
 * BidderOpportunities Component
 * Public procurement opportunities catalog for prospective suppliers and bidders.
 * Displays active RFQs and bidding notices posted by CHR-CAR.
 * Bidders can browse technical specifications and click "Submit Quotation" to enter their price bid.
 * Used by: App.jsx at route /bidder/opportunities.
 * Connects to: /api/procurements/get_procurements.php?status=Published%20/%20Open
 * Database table affected: Reads from 'procurements' table.
 */
export default function BidderOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  /**
   * Fetches published and open procurement notices from the PHP backend.
   * Connects to: /api/procurements/get_procurements.php
   * Database table affected: Reads from procurements.
   */
  const fetchOpenOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      // In this 50% prototype, bidders see all 'Published / Open' notices
      const all = await loadProcurements('Published / Open');
      setOpportunities(all);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenOpportunities();
  }, []);

  /**
   * Filters the open opportunities list client-side by title or reference number.
   * Used by: Render method.
   * Connects to: Local searchKeyword state.
   * Database table affected: None.
   *
   * @returns {Array} Filtered opportunities.
   */
  const getFilteredList = () => {
    if (!searchKeyword.trim()) return opportunities;
    const q = searchKeyword.toLowerCase();
    return opportunities.filter(
      (opp) =>
        opp.reference_number.toLowerCase().includes(q) ||
        opp.title.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q)
    );
  };

  const filteredOpportunities = getFilteredList();

  return (
    <article aria-labelledby="bidder-opps-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="bidder-opps-heading" className="page-title">
            5. Open Procurement Opportunities
          </h1>
          <p className="page-subtitle">
            Commission on Human Rights &mdash; Cordillera Administrative Region Public Bidding Notices
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchOpenOpportunities}
          >
            Refresh Notices
          </button>
        </div>
      </header>

      {error && (
        <div className="notice-box warning" role="alert" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start your PHP development server (e.g. <code>php -S localhost:8000</code>) to fetch live opportunities from MySQL.
            </div>
          </div>
        </div>
      )}

      {/* Prospective Supplier Notice */}
      <aside
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '12px 18px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '13.5px',
          color: '#166534',
        }}
      >
        <strong>Supplier Notice:</strong> In this 50% prototype, prospective suppliers can submit official price quotations directly without account registration.
        Select an open opportunity below to review technical specifications and submit your proposal.
      </aside>

      {/* Search Filter Form */}
      <section aria-labelledby="search-section-heading" style={{ marginBottom: '20px' }}>
        <h2 id="search-section-heading" className="sr-only" style={{ display: 'none' }}>
          Search Open Opportunities
        </h2>
        <form
          className="gov-card"
          style={{ padding: '16px 20px' }}
          onSubmit={(e) => e.preventDefault()}
        >
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only" style={{ display: 'none' }}>
              Search Opportunities
            </legend>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 auto' }}>
                <label
                  htmlFor="opp-search"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Search Open RFQs / Opportunities:
                </label>
                <input
                  id="opp-search"
                  type="text"
                  className="form-input"
                  placeholder="Search by Project Title, Reference Number, or Goods description..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              {searchKeyword && (
                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSearchKeyword('')}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </fieldset>
        </form>
      </section>

      {/* Opportunities List Table */}
      <section aria-labelledby="opportunities-table-heading">
        <h2 id="opportunities-table-heading" className="sr-only" style={{ display: 'none' }}>
          Active Opportunities Table
        </h2>
        <div className="gov-card">
          <header className="gov-card-header">
            <h3>Active Bidding Notices ({filteredOpportunities.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Published by CHR BAC &bull; Open for Quotations
            </span>
          </header>

          <div className="gov-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading published procurement opportunities from MySQL...
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No open procurement notices currently found. Check back soon or contact the CHR-CAR BAC Secretariat.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference Number</th>
                      <th scope="col">Project Title &amp; Description</th>
                      <th scope="col">Procurement Mode</th>
                      <th scope="col">Approved Budget (ABC)</th>
                      <th scope="col">Submission Deadline</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opp) => (
                      <tr key={opp.id}>
                        <td>
                          <strong>{opp.reference_number}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '14.5px', marginBottom: '4px' }}>
                            {opp.title}
                          </div>
                          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0 }}>
                            {opp.description}
                          </p>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px' }}>{opp.procurement_mode}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--color-primary-dark)' }}>
                            {formatCurrency(opp.abc)}
                          </strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div>{opp.deadline.substring(0, 10)}</div>
                          <small style={{ color: 'var(--color-accent-gold)', fontWeight: 600 }}>
                            {getDeadlineStatus(opp.deadline)}
                          </small>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Link
                            to={`/bidder/submit-bid?procurement_id=${opp.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ fontWeight: 600 }}
                          >
                            Submit Quotation &rarr;
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
