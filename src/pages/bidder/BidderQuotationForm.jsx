import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { loadProcurements, loadProcurementDetails, submitBidQuotation } from '../../services/api.js';

/**
 * Formats a numeric value into Philippine Peso currency format (PHP #,##0.00).
 * Used by: BidderQuotationForm to display ABC and bid preview.
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
 * BidderQuotationForm Component
 * Official supplier price quotation submission form for open CHR-CAR procurement notices.
 * Allows suppliers to submit bids without requiring account registration or login.
 * Captures company name, contact person, contact number, email, and proposed quotation amount.
 * Submits directly to the centralized MySQL bids table.
 * Used by: App.jsx at route /bidder/submit-bid.
 * Connects to: /api/procurements/create_bid.php
 * Database tables affected: Writes to 'bids' and 'transaction_history'.
 */
export default function BidderQuotationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedProcId = searchParams.get('procurement_id') || '';

  // Form State
  const [procurementList, setProcurementList] = useState([]);
  const [selectedProcurementId, setSelectedProcurementId] = useState(preselectedProcId);
  const [selectedProcurement, setSelectedProcurement] = useState(null);

  const [formData, setFormData] = useState({
    bidder_name: '',
    representative_name: '',
    contact_number: '',
    email: '',
    bid_amount: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Loads open procurement opportunities to populate the project selection dropdown.
   * Connects to: /api/procurements/get_procurements.php
   * Database table affected: Reads from procurements.
   */
  useEffect(() => {
    loadProcurements('Open')
      .then((records) => {
        setProcurementList(records);
        if (preselectedProcId) {
          setSelectedProcurementId(preselectedProcId);
        } else if (records.length > 0) {
          setSelectedProcurementId(records[0].id);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => setLoading(false));
  }, [preselectedProcId]);

  /**
   * Loads details and specifications for the currently selected procurement project.
   * Connects to: /api/procurements/get_procurement.php?id=X
   * Database table affected: Reads from procurements and procurement_items.
   */
  useEffect(() => {
    if (selectedProcurementId) {
      loadProcurementDetails(selectedProcurementId)
        .then((data) => setSelectedProcurement(data))
        .catch((err) => console.error('Error loading procurement details:', err));
    }
  }, [selectedProcurementId]);

  /**
   * Handles changes for all input fields in the quotation form.
   * Used by: Text and number inputs.
   * Connects to: Local formData state.
   * Database table affected: None.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Submits the supplier quotation to the PHP backend.
   * Connects to: /api/procurements/create_bid.php
   * Database tables affected: Writes to 'bids' and 'transaction_history'.
   *
   * @param {React.FormEvent} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      if (!selectedProcurementId) {
        throw new Error('Please select an open procurement project.');
      }
      if (!formData.bidder_name.trim()) {
        throw new Error('Supplier / Company Name is required.');
      }
      if (!formData.representative_name.trim()) {
        throw new Error('Authorized Representative Name is required.');
      }
      if (!formData.contact_number.trim()) {
        throw new Error('Contact Number is required.');
      }
      if (!formData.email.trim()) {
        throw new Error('Email Address is required.');
      }
      if (!formData.bid_amount || Number(formData.bid_amount) <= 0) {
        throw new Error('Quotation Amount must be a positive number.');
      }

      const company = formData.bidder_name.trim();
      const rep = formData.representative_name.trim();

      const payload = {
        procurement_id: Number(selectedProcurementId),
        bidder_name: rep || company,
        company_name: company || rep,
        representative_name: rep,
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim(),
        bid_amount: Number(formData.bid_amount),
        remarks: formData.remarks.trim(),
      };

      await submitBidQuotation(payload);

      setSuccessMessage(
        `Quotation successfully submitted for "${selectedProcurement?.reference_no || selectedProcurement?.reference_number}" at ${formatCurrency(payload.bid_amount)}!`
      );

      // Reset quotation form fields
      setFormData({
        bidder_name: '',
        representative_name: '',
        contact_number: '',
        email: '',
        bid_amount: '',
        remarks: '',
      });

      // Redirect after brief delay
      setTimeout(() => {
        navigate('/bidder/my-quotations');
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article aria-labelledby="bid-form-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="bid-form-heading" className="page-title">
            6. Bidder Quotation Submission Form
          </h1>
          <p className="page-subtitle">
            Submit an official price quotation for CHR-CAR competitive procurement
          </p>
        </div>
        <div>
          <Link to="/bidder/opportunities" className="btn btn-secondary btn-sm">
            &larr; View All Opportunities
          </Link>
        </div>
      </header>

      {/* Success Notification Alert */}
      {successMessage && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            padding: '14px 18px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #bbf7d0',
            fontWeight: 600,
          }}
        >
          {successMessage}
          <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px' }}>
            Redirecting to submitted quotations log...
          </div>
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

      {/* Semantic HTML5 Form with Fieldsets */}
      <form onSubmit={handleSubmit} className="gov-card">
        {/* Fieldset 1: Opportunity Selection & Verification */}
        <fieldset style={{ border: 'none', padding: '20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
            1. Select Procurement Opportunity
          </legend>

          <div className="form-group">
            <label htmlFor="procurement-select" className="form-label">
              Target Procurement Project <span className="required">*</span>
            </label>
            <select
              id="procurement-select"
              className="form-input"
              value={selectedProcurementId}
              onChange={(e) => setSelectedProcurementId(e.target.value)}
              required
            >
              <option value="">-- Choose an Open Opportunity --</option>
              {procurementList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference_number}: {p.title} (ABC: {formatCurrency(p.abc)})
                </option>
              ))}
            </select>
          </div>

          {/* Project Details Snapshot Box */}
          {selectedProcurement && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                padding: '14px 18px',
                marginTop: '12px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong>Approved Budget for the Contract (ABC Ceiling):</strong>{' '}
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(selectedProcurement.abc)}
                  </span>
                </div>
                <div>
                  <strong>Submission Deadline:</strong>{' '}
                  <span style={{ color: 'var(--color-accent-gold)', fontWeight: 600 }}>
                    {selectedProcurement.deadline}
                  </span>
                </div>
              </div>
              <div>
                <strong>Scope / Delivery:</strong> {selectedProcurement.description}
              </div>
            </div>
          )}
        </fieldset>

        {/* Fieldset 2: Supplier / Bidder Identification */}
        <fieldset style={{ border: 'none', padding: '20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
            2. Prospective Supplier Credentials
          </legend>

          <div className="form-row">
            {/* Bidder Company Name */}
            <div className="form-group">
              <label htmlFor="bidder_name" className="form-label">
                Company / Supplier Name <span className="required">*</span>
              </label>
              <input
                id="bidder_name"
                name="bidder_name"
                type="text"
                className="form-input"
                placeholder="e.g. Northern Highlands General Merchandise"
                value={formData.bidder_name}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Authorized Representative */}
            <div className="form-group">
              <label htmlFor="representative_name" className="form-label">
                Authorized Representative Name <span className="required">*</span>
              </label>
              <input
                id="representative_name"
                name="representative_name"
                type="text"
                className="form-input"
                placeholder="e.g. Juan C. Dela Cruz"
                value={formData.representative_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            {/* Contact Number */}
            <div className="form-group">
              <label htmlFor="contact_number" className="form-label">
                Contact Phone / Mobile Number <span className="required">*</span>
              </label>
              <input
                id="contact_number"
                name="contact_number"
                type="text"
                className="form-input"
                placeholder="e.g. 0917-555-0192 or (074) 442-1234"
                value={formData.contact_number}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Official Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="e.g. sales@company.ph"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Fieldset 3: Proposed Price Quotation & Terms */}
        <fieldset style={{ border: 'none', padding: '20px' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
            3. Price Quotation &amp; Proposed Delivery Terms
          </legend>

          {/* Bid Quotation Amount */}
          <div className="form-group">
            <label htmlFor="bid_amount" className="form-label">
              Total Proposed Quotation Amount (PHP) <span className="required">*</span>
            </label>
            <input
              id="bid_amount"
              name="bid_amount"
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="e.g. 142500.00"
              value={formData.bid_amount}
              onChange={handleInputChange}
              required
              style={{ fontSize: '16px', fontWeight: 600 }}
            />
            {selectedProcurement && formData.bid_amount && (
              <span className="form-hint">
                {Number(formData.bid_amount) <= selectedProcurement.abc ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    ✓ Quotation is within Approved Budget (Potential Savings: {formatCurrency(selectedProcurement.abc - Number(formData.bid_amount))})
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                    ⚠️ Warning: Quotation exceeds ABC ({formatCurrency(selectedProcurement.abc)}) and may be disqualified by BAC.
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Remarks & Specifications Compliance */}
          <div className="form-group">
            <label htmlFor="remarks" className="form-label">
              Proposal Remarks, Warranty &amp; Delivery Commitments
            </label>
            <textarea
              id="remarks"
              name="remarks"
              className="form-input"
              rows={3}
              placeholder="State delivery turnaround time, warranty duration, brand models offered, and compliance with technical specifications..."
              value={formData.remarks}
              onChange={handleInputChange}
            />
          </div>
        </fieldset>

        {/* Submit Action Bar */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link to="/bidder/opportunities" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !selectedProcurementId}
            style={{ fontWeight: 600, padding: '10px 24px' }}
          >
            {submitting ? 'Submitting Quotation to MySQL...' : 'Submit Official Price Quotation'}
          </button>
        </div>
      </form>
    </article>
  );
}
