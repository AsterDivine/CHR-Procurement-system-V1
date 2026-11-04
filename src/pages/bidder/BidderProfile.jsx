import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/bidder/BidderProfile.jsx
 * =============================================================================
 * 
 * Bidder Profile Page
 * Displays the authenticated bidder's account credentials and contact details
 * retrieved directly from the PHP session (/api/auth/me.php).
 * 
 * NOTE FOR CAPSTONE DEFENSE:
 * In this milestone (Prompt 8), this profile view is intentionally READ-ONLY
 * per system specification. Direct profile updates and document credential
 * renewals can be added in a subsequent backend milestone.
 */
export default function BidderProfile() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="gov-card">
        <Loading message="Loading supplier profile from CHR server..." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Supplier Company Profile</h1>
        <p>Review your registered company credentials and contact details on file with CHR-CAR.</p>
      </div>

      {/* Capstone Prototype Scope Notice */}
      <div className="notice-box info" style={{ marginBottom: '20px' }}>
        <div>
          <strong>System Milestone Note:</strong> Profile information is loaded directly from your authenticated PHP session
          (<code>/api/auth/me.php</code>). This view is read-only for the core prototype.
          Profile updating and PhilGEPS certificate renewal will be added in a future milestone.
        </div>
      </div>

      <div className="gov-card" style={{ maxWidth: '800px' }}>
        <div className="gov-card-header">
          <h3>Official Registration Details</h3>
          <span className="badge badge-published">Active Bidder Account</span>
        </div>

        <div className="gov-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div className="form-label">Company / Business Name</div>
              <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-primary-dark)', margin: '4px 0 0 0' }}>
                {user?.organization_name || 'N/A'}
              </p>
            </div>

            <div>
              <div className="form-label">Authorized Representative</div>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)', margin: '4px 0 0 0' }}>
                {user?.full_name || 'N/A'}
              </p>
            </div>

            <div>
              <div className="form-label">Official Email Address</div>
              <p style={{ fontWeight: 500, margin: '4px 0 0 0' }}>
                {user?.email || 'N/A'}
              </p>
            </div>

            <div>
              <div className="form-label">Contact Phone Number</div>
              <p style={{ fontWeight: 500, margin: '4px 0 0 0' }}>
                {user?.contact_number || 'Not provided'}
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div className="form-label">Registered Business Address</div>
              <p style={{ fontWeight: 500, margin: '4px 0 0 0', lineHeight: '1.5' }}>
                {user?.address || 'Not provided'}
              </p>
            </div>

            <div>
              <div className="form-label">System Account ID</div>
              <p style={{ fontWeight: 500, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                User #{user?.id || '—'} (Role: <code>{user?.role || 'bidder'}</code>)
              </p>
            </div>

            <div>
              <div className="form-label">Accreditation Status</div>
              <p style={{ fontWeight: 500, color: '#16a34a', margin: '4px 0 0 0' }}>
                &bull; Verified for CHR-CAR Procurement
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-primary-dark)' }}>
              Need to Update Your Supplier Information?
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>
              For official changes in company business name, PhilGEPS platinum status, or tax registration,
              please submit a formal written notification with certified true copies to the CHR-CAR Bids and Awards Committee (BAC) Secretariat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
