import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Home / Prototype Navigation Component
 * Landing screen for the 50% working-system capstone prototype.
 *
 * SCOPE & ACCESS CONTROL NOTICE:
 * "Prototype only — authentication and final access control will be implemented in a later development stage."
 *
 * Used by: App.jsx as the root route (/).
 * Connects to: Client-side navigation to CHR Personnel and Bidder modules.
 * Database table affected: None.
 */
export default function Home() {
  const navigate = useNavigate();

  return (
    <article aria-labelledby="prototype-home-title" style={{ maxWidth: '960px', margin: '0 auto', padding: '12px 0 36px 0' }}>
      {/* Official Government Seal & Title Banner */}
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            color: 'var(--color-primary-dark)',
            fontSize: '22px',
            fontWeight: 800,
            border: '3px solid var(--color-accent-amber)',
            boxShadow: 'var(--box-shadow-sm)',
            marginBottom: '12px',
          }}
        >
          CHR
        </div>
        <p style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
          Republic of the Philippines &bull; Commission on Human Rights &bull; Cordillera Administrative Region
        </p>
        <h1
          id="prototype-home-title"
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            margin: '8px 0 6px 0',
            lineHeight: 1.3,
          }}
        >
          Centralized Procurement Tracking and Financial Monitoring System
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          College Capstone Project &mdash; 50% Working-System Prototype Submission
        </p>
      </header>

      {/* MANDATORY PROTOTYPE ACCESS CONTROL NOTICE */}
      <section
        role="alert"
        aria-label="Development Stage Disclaimer"
        style={{
          backgroundColor: '#fef3c7',
          borderLeft: '5px solid #d97706',
          borderRight: '1px solid #fde68a',
          borderTop: '1px solid #fde68a',
          borderBottom: '1px solid #fde68a',
          padding: '16px 20px',
          borderRadius: '6px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden="true">&#9888;</span>
          <div>
            <strong style={{ color: '#92400e', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
              Prototype Scope Notice
            </strong>
            <p style={{ margin: 0, color: '#78350f', fontSize: '13.5px', lineHeight: 1.5 }}>
              <strong>Prototype only &mdash; authentication and final access control will be implemented in a later development stage.</strong>
            </p>
            <p style={{ margin: '6px 0 0 0', color: '#92400e', fontSize: '12px' }}>
              For this 50% defense, login, user registration, and sessions are temporarily out of scope. Evaluators can directly access both user roles below.
            </p>
          </div>
        </div>
      </section>

      {/* PROTOTYPE VIEW SELECTOR: 2 PRIMARY ROLES */}
      <section aria-labelledby="select-view-title" style={{ marginBottom: '36px' }}>
        <h2 id="select-view-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '16px', textAlign: 'center' }}>
          Select Prototype View to Evaluate
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* CHR Personnel Card */}
          <div
            className="gov-card"
            style={{
              padding: '24px',
              borderTop: '4px solid var(--color-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-published" style={{ fontSize: '11px' }}>Internal Role</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>5 Modules</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                CHR Personnel View
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                Manage master procurement records, input item specifications, track 9 statutory stages, evaluate supplier price quotations, award winning bids, and monitor regional budget savings.
              </p>
              <ul style={{ fontSize: '12.5px', color: 'var(--color-text-main)', paddingLeft: '20px', marginBottom: '20px', lineHeight: 1.6 }}>
                <li>Executive KPI Dashboard</li>
                <li>Centralized Procurement Records Table</li>
                <li>Create / Edit Procurement Form with Item Specs</li>
                <li>Supplier Bids &amp; Winning Bid Selection</li>
                <li>Procurement Financials &amp; Savings Ledger</li>
                <li>Transaction Audit Trail Log</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/chr/dashboard')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}
            >
              Open CHR Personnel View &rarr;
            </button>
          </div>

          {/* Bidder / Supplier Card */}
          <div
            className="gov-card"
            style={{
              padding: '24px',
              borderTop: '4px solid var(--color-accent-gold)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-review" style={{ fontSize: '11px' }}>External Role</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>3 Modules</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-gold)', marginBottom: '8px' }}>
                Bidder / Supplier View
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                Browse open bidding opportunities published by CHR-CAR, view Approved Budget for the Contract (ABC) and specifications, and submit price quotations directly without account registration.
              </p>
              <ul style={{ fontSize: '12.5px', color: 'var(--color-text-main)', paddingLeft: '20px', marginBottom: '20px', lineHeight: 1.6 }}>
                <li>Public Catalog of Open Procurement Projects</li>
                <li>Project Specifications &amp; Submission Deadlines</li>
                <li>Direct Price Quotation Submission Form</li>
                <li>Submission History &amp; Review Status</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/bidder/opportunities')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, borderColor: 'var(--color-accent-gold)', color: 'var(--color-accent-gold)' }}
            >
              Open Bidder View &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* QUICK LINKS DIRECTORY */}
      <section aria-labelledby="all-pages-heading">
        <div className="gov-card" style={{ padding: '20px 24px' }}>
          <h3 id="all-pages-heading" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '12px' }}>
            Prototype Site Map &amp; Direct Links
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>CHR Personnel Pages:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <Link to="/chr/dashboard" style={{ fontSize: '13px' }}>&bull; Dashboard</Link>
                <Link to="/chr/procurements" style={{ fontSize: '13px' }}>&bull; Procurement Records</Link>
                <Link to="/chr/procurements/new" style={{ fontSize: '13px' }}>&bull; Create Procurement</Link>
                <Link to="/chr/bids" style={{ fontSize: '13px' }}>&bull; Bids Evaluation</Link>
                <Link to="/chr/financials" style={{ fontSize: '13px' }}>&bull; Financial Monitoring</Link>
                <Link to="/chr/history" style={{ fontSize: '13px' }}>&bull; Transaction History</Link>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-accent-gold)' }}>Bidder / Supplier Pages:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <Link to="/bidder/opportunities" style={{ fontSize: '13px' }}>&bull; Open Opportunities</Link>
                <Link to="/bidder/submit-bid" style={{ fontSize: '13px' }}>&bull; Submit Quotation</Link>
                <Link to="/bidder/my-quotations" style={{ fontSize: '13px' }}>&bull; My Submitted Quotations</Link>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Backend Architecture:</strong>
              <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '8px', lineHeight: 1.5 }}>
                Pure PHP endpoints in <code>/api/procurements/</code> using PDO prepared statements. MySQL database <code>chr_procurement</code>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
