import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/bidder/SubmitBid.jsx
 * =============================================================================
 * 
 * Submit Bid Page
 * Allows authenticated bidders to submit their formal financial quotation
 * and upload 1 to 5 supporting eligibility documents.
 * 
 * Client-Side Validation Rules:
 * - bid_amount > 0
 * - 1 to 5 files attached
 * - File types: PDF, JPG, JPEG, PNG only
 * - File size: Max 5 MB per file
 * - Submits as multipart/form-data using fetch() to /api/bids/submit.php
 */
export default function SubmitBid() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);

  const [bidAmount, setBidAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Allowed file specifications
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const loadOpportunity = async () => {
    setLoadingOpp(true);
    try {
      const res = await api.getOpportunity(id);
      if (res && res.data && res.data.opportunity) {
        setOpportunity(res.data.opportunity);
      } else {
        setOpportunity({
          id: id || 2,
          reference_no: `CHR-CAR-2024-00${id || 2}`,
          title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
          abc: 450000.00,
        });
      }
    } catch (err) {
      console.warn('Backend offline, using seed summary for SubmitBid:', err.message);
      setOpportunity({
        id: id || 2,
        reference_no: `CHR-CAR-2024-00${id || 2}`,
        title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
        abc: 450000.00,
      });
    } finally {
      setLoadingOpp(false);
    }
  };

  const handleFileChange = (e) => {
    setErrorMsg('');
    const files = Array.from(e.target.files || []);

    if (files.length > 5) {
      setErrorMsg('You may select a maximum of 5 files.');
      e.target.value = '';
      setSelectedFiles([]);
      return;
    }

    // Client-side file validation
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMsg(`File "${file.name}" has an unsupported format (.${ext}). Allowed: PDF, JPG, JPEG, PNG.`);
        e.target.value = '';
        setSelectedFiles([]);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(`File "${file.name}" exceeds the maximum allowed size of 5 MB.`);
        e.target.value = '';
        setSelectedFiles([]);
        return;
      }
    }

    setSelectedFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Amount validation
    const parsedAmount = parseFloat(bidAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Bid amount must be a valid positive number greater than 0.');
      return;
    }

    // Optional warning if bid exceeds ABC
    if (opportunity?.abc && parsedAmount > opportunity.abc) {
      const confirmExceed = window.confirm(
        `Warning: Your quotation (₱ ${parsedAmount.toLocaleString()}) exceeds the Approved Budget for the Contract (ABC: ₱ ${opportunity.abc.toLocaleString()}). Under R.A. 9184, this may result in automatic disqualification. Do you still wish to submit?`
      );
      if (!confirmExceed) return;
    }

    // 2. File count validation
    if (selectedFiles.length < 1 || selectedFiles.length > 5) {
      setErrorMsg('You must attach between 1 and 5 supporting files (PDF, JPG, JPEG, PNG).');
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Assemble multipart/form-data payload
      const formData = new FormData();
      formData.append('opportunity_id', id);
      formData.append('bid_amount', parsedAmount);
      formData.append('remarks', remarks);

      selectedFiles.forEach((file) => {
        formData.append('documents[]', file);
      });

      // Submit to PHP endpoint
      const res = await api.submitBid(formData);
      setSuccessMsg(res.message || 'Quotation and documents submitted successfully!');

      // Redirect to My Submissions after brief delay
      setTimeout(() => {
        navigate('/bidder/submissions');
      }, 1500);

    } catch (err) {
      console.error('Bid submission error:', err);
      setErrorMsg(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loadingOpp) {
    return (
      <div className="gov-card">
        <Loading message="Loading procurement project details..." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ marginBottom: '8px' }}>
          <Link to={`/bidder/opportunities/${id}`}>&larr; Back to Opportunity Details</Link>
        </div>
        <h1>Submit Bid Quotation</h1>
        <p>
          Project: <strong>{opportunity?.reference_no} &mdash; {opportunity?.title}</strong>
        </p>
      </div>

      <div className="gov-card">
        <div className="gov-card-header">
          <h3>Supplier Quotation &amp; Document Submission</h3>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            ABC Ceiling: <strong>{formatCurrency(opportunity?.abc)}</strong>
          </span>
        </div>

        <div className="gov-card-body">
          {errorMsg && (
            <div className="notice-box danger" style={{ marginBottom: '16px' }}>
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="notice-box success" style={{ marginBottom: '16px' }}>
              <div>
                <strong>Success!</strong> {successMsg} Redirecting to your submissions...
              </div>
            </div>
          )}

          <div className="notice-box info" style={{ marginBottom: '20px' }}>
            <div>
              <strong>Submission Rules:</strong> One quotation per supplier. Ensure that all required
              supporting documents (e.g. Mayor's Permit, PhilGEPS Certificate, Omnibus Sworn Statement, and Price Proposal)
              are uploaded before finalizing. Max 5 MB per file.
            </div>
          </div>

          <form className="gov-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="bid_amount">
                Total Financial Bid Amount (₱) <span className="required">*</span>
              </label>
              <input
                id="bid_amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="e.g., 425000.00"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
              />
              <span className="form-help">
                Must be greater than 0 and inclusive of all VAT and applicable government taxes.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="documents">
                Supporting Documents (1 to 5 files) <span className="required">*</span>
              </label>
              <input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="form-input"
                onChange={handleFileChange}
                required
              />
              <span className="form-help">
                Hold Ctrl or Cmd to select multiple files (1–5 files). Supported formats: PDF, JPG, JPEG, PNG. Max 5 MB each.
              </span>

              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px' }}>
                    Selected Files ({selectedFiles.length}/5):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                    {selectedFiles.map((file, i) => (
                      <li key={i}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="remarks">
                Remarks / Delivery Schedule / Compliance Notes (Optional)
              </label>
              <textarea
                id="remarks"
                className="form-textarea"
                rows="4"
                placeholder="Specify delivery lead time, brand/model offered, warranty period, or other technical details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading Documents & Submitting...' : 'Submit Formal Bid'}
              </button>
              <Link to={`/bidder/opportunities/${id}`} className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
