import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/bidder/OpportunityDetails.jsx
 * =============================================================================
 * 
 * Opportunity Details Page
 * Displays full procurement invitation details, line items, and eligibility rules.
 * Enforces business logic:
 * - Shows "Proceed to Submit Bid" ONLY if status='open' AND deadline has not passed AND bidder has not yet submitted.
 * - Shows existing submission details if the logged-in bidder already submitted.
 */
export default function OpportunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const DEMO_DETAILS = {
    1: {
      id: 1,
      reference_no: 'CHR-CAR-2024-001',
      title: 'Procurement of Office Supplies for Q3 2024',
      description: 'Procurement of assorted office supplies, paper products, and desktop stationery for CHR-CAR regional operations.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 150000.00,
      deadline: '2026-11-20 17:00:00',
      status: 'open',
      items: [
        { id: 1, item_name: 'A4 Copy Paper (80gsm, 500 sheets)', specifications: 'Multi-purpose substance 20 / 80gsm white', quantity: 200, unit: 'reams', estimated_unit_cost: 260.00 },
        { id: 2, item_name: 'Original Black Toner Cartridge', specifications: 'OEM black toner cartridge for regional laser printer', quantity: 10, unit: 'cartridges', estimated_unit_cost: 3800.00 },
        { id: 3, item_name: 'Sign Pen 0.5mm Black', specifications: 'Liquid gel ink rollerball sign pen', quantity: 150, unit: 'pieces', estimated_unit_cost: 45.00 },
        { id: 4, item_name: 'Expanding Envelope Legal', specifications: 'Heavy duty brown kraft board with string tie', quantity: 100, unit: 'pieces', estimated_unit_cost: 35.00 },
      ],
      my_submission: null,
    },
    2: {
      id: 2,
      reference_no: 'CHR-CAR-2024-002',
      title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
      description: 'Supply, delivery, and setup of five (5) high-performance laptops and two (2) multi-function network laser printers with 1-year warranty.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 450000.00,
      deadline: '2026-11-25 17:00:00',
      status: 'open',
      items: [
        { id: 5, item_name: 'Business Class Investigation Laptops', specifications: 'Intel Core i7 13th Gen, 16GB RAM, 512GB SSD, 14-inch FHD, Windows 11 Pro', quantity: 5, unit: 'units', estimated_unit_cost: 70000.00 },
        { id: 6, item_name: 'Heavy Duty Multi-Function Network Printers', specifications: 'Print, Scan, Copy, Duplex, LAN & Wi-Fi enabled color laser printer', quantity: 2, unit: 'units', estimated_unit_cost: 50000.00 },
      ],
      my_submission: null,
    },
    3: {
      id: 3,
      reference_no: 'CHR-CAR-2024-003',
      title: 'Catering and Venue for Human Rights Day Regional Summit',
      description: 'Full-day catering package (buffet lunch and 2 snacks) and air-conditioned venue for 120 summit participants in Baguio City.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 85000.00,
      deadline: '2026-11-30 17:00:00',
      status: 'open',
      items: [
        { id: 7, item_name: 'Summit Venue & Audio-Visual Hall Rental', specifications: 'Air-conditioned hall with basic sound system, projector, and microphones for 1 day', quantity: 1, unit: 'lot', estimated_unit_cost: 25000.00 },
        { id: 8, item_name: 'Full Day Meal Package (AM/PM snacks + Lunch)', specifications: 'Buffet lunch with 2 viands, rice, soup, dessert, and drinks for 120 pax', quantity: 120, unit: 'pax', estimated_unit_cost: 500.00 },
      ],
      my_submission: null,
    },
  };

  const loadOpportunity = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOpportunity(id);
      if (res && res.data && res.data.opportunity) {
        setOpportunity(res.data.opportunity);
      } else {
        setOpportunity(DEMO_DETAILS[id] || DEMO_DETAILS[1]);
      }
    } catch (err) {
      console.warn('Backend offline, using seed details for demonstration:', err.message);
      setOpportunity(DEMO_DETAILS[id] || DEMO_DETAILS[2]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="gov-card">
        <Loading message="Loading procurement specifications from CHR server..." />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div>
        <div className="page-header">
          <Link to="/bidder/opportunities">&larr; Back to Opportunities</Link>
          <h1>Procurement Opportunity</h1>
        </div>
        <div className="gov-card">
          <div className="gov-card-body">
            <div className="notice-box danger">
              <div>
                <strong>Error:</strong> {error || 'Unable to locate the requested procurement opportunity.'}
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Link to="/bidder/opportunities" className="btn btn-secondary btn-sm">
                Return to Opportunities List
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDeadlinePassed = opportunity.deadline ? new Date(opportunity.deadline).getTime() < Date.now() : false;
  const isOpen = opportunity.status === 'open' && !isDeadlinePassed;
  const mySubmission = opportunity.my_submission;

  return (
    <div>
      <div className="page-header">
        <div style={{ marginBottom: '8px' }}>
          <Link to="/bidder/opportunities">&larr; Back to Opportunities</Link>
        </div>
        <h1>{opportunity.title}</h1>
        <p>Reference Number: <strong>{opportunity.reference_no}</strong></p>
      </div>

      {/* Submission Status Alerts */}
      {mySubmission && (
        <div className="notice-box success" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Quotation Already Submitted:</strong> You submitted a quotation of{' '}
            <strong>{formatCurrency(mySubmission.bid_amount)}</strong> for this project on{' '}
            {formatDate(mySubmission.submitted_at)}. Status: <strong><StatusBadge status={mySubmission.status} /></strong>.
            <div style={{ marginTop: '8px' }}>
              <Link to="/bidder/submissions" className="btn btn-secondary btn-sm">
                View in My Submissions
              </Link>
            </div>
          </div>
        </div>
      )}

      {isDeadlinePassed && !mySubmission && (
        <div className="notice-box warning" style={{ marginBottom: '20px' }}>
          <div>
            <strong>Notice:</strong> The submission deadline for this procurement opportunity expired on {formatDate(opportunity.deadline)}.
            Quotations can no longer be accepted.
          </div>
        </div>
      )}

      {/* Opportunity Overview Card */}
      <div className="gov-card" style={{ marginBottom: '24px' }}>
        <div className="gov-card-header">
          <h3>Procurement Notice Overview</h3>
          <StatusBadge status={opportunity.status} />
        </div>
        <div className="gov-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <div className="form-label">Approved Budget for Contract (ABC)</div>
              <p style={{ fontWeight: 700, fontSize: '20px', color: 'var(--color-primary-dark)', margin: '4px 0 0 0' }}>
                {formatCurrency(opportunity.abc)}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ceiling price under R.A. 9184</span>
            </div>

            <div>
              <div className="form-label">Submission Deadline</div>
              <p style={{
                fontWeight: 600,
                color: isDeadlinePassed ? '#dc2626' : 'var(--color-accent-gold)',
                margin: '4px 0 0 0'
              }}>
                {formatDate(opportunity.deadline)}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {isDeadlinePassed ? 'Closed / Expired' : 'Active Quotation Window'}
              </span>
            </div>

            <div>
              <div className="form-label">Procurement Mode</div>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>
                {opportunity.procurement_type || 'Small Value Procurement (NP-53.9)'}
              </p>
            </div>

            <div>
              <div className="form-label">Procuring Agency</div>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>
                CHR-CAR Regional Office
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '16px', marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px', color: 'var(--color-primary-dark)' }}>Project Description / Scope of Work</h4>
            <p style={{ color: 'var(--color-text)', lineHeight: '1.6', margin: 0 }}>
              {opportunity.description || 'No additional project description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Bill of Quantities / Line Items Table */}
      <div className="gov-card" style={{ marginBottom: '24px' }}>
        <div className="gov-card-header">
          <h3>Required Technical Items &amp; Specifications</h3>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {(opportunity.items || []).length} Line Item(s)
          </span>
        </div>
        <div className="gov-card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="gov-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Item Name</th>
                  <th>Technical Specifications</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Estimated Cost</th>
                </tr>
              </thead>
              <tbody>
                {(opportunity.items || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      No individual line items listed. Please review the project description above.
                    </td>
                  </tr>
                ) : (
                  opportunity.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td><strong>{idx + 1}</strong></td>
                      <td><strong>{item.item_name}</strong></td>
                      <td style={{ maxWidth: '380px' }}>{item.specifications || 'Standard specifications'}</td>
                      <td><strong>{item.quantity}</strong></td>
                      <td>{item.unit || 'lot'}</td>
                      <td>{item.estimated_unit_cost ? formatCurrency(item.estimated_unit_cost) : 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mandatory Requirements Section */}
      <div className="gov-card" style={{ marginBottom: '24px' }}>
        <div className="gov-card-header">
          <h3>Mandatory Supporting Documents for Submission</h3>
        </div>
        <div className="gov-card-body">
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Under R.A. 9184 and CHR-CAR guidelines, prospective bidders must attach between 1 and 5 files (PDF, JPG, JPEG, PNG, max 5 MB each):
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--color-text)', lineHeight: '1.6', fontSize: '13px' }}>
            <li>Official Financial Quotation / Price Proposal Sheet (Signed)</li>
            <li>PhilGEPS Registration Certificate (Platinum or Red)</li>
            <li>Valid Mayor's / Business Permit for the current calendar year</li>
            <li>Omnibus Sworn Statement (OSS)</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {isOpen && !mySubmission && (
          <Link to={`/bidder/submit-bid/${opportunity.id}`} className="btn btn-primary">
            Proceed to Submit Quotation &rarr;
          </Link>
        )}
        <Link to="/bidder/opportunities" className="btn btn-secondary">
          Back to All Opportunities
        </Link>
      </div>
    </div>
  );
}
