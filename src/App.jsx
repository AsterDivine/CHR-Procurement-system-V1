/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/App.jsx
 * =============================================================================
 * 
 * Main application routing component for the 50% Working-System Prototype.
 * 
 * CAPSTONE PROTOTYPE SCOPE NOTE:
 * "Prototype only — authentication and final access control will be implemented in a later development stage."
 * In this 50% submission, authentication (login, registration, passwords, sessions,
 * and role-based route guards) is temporarily out of scope.
 * Evaluators navigate directly between CHR Personnel and Bidder modules.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Navigation Wrapper
import Navigation from './components/Navigation.jsx';

// Shared Home / Prototype Landing
import Home from './pages/Home.jsx';

// CHR Personnel Modules
import CHRDashboard from './pages/chr/CHRDashboard.jsx';
import ProcurementTable from './pages/chr/ProcurementTable.jsx';
import ProcurementForm from './pages/chr/ProcurementForm.jsx';
import ProcurementDetails from './pages/chr/ProcurementDetails.jsx';
import CHRBids from './pages/chr/CHRBids.jsx';
import SimpleFinancialMonitoring from './pages/chr/SimpleFinancialMonitoring.jsx';
import TransactionHistoryView from './pages/chr/TransactionHistoryView.jsx';

// Bidder Modules
import BidderOpportunities from './pages/bidder/BidderOpportunities.jsx';
import BidderQuotationForm from './pages/bidder/BidderQuotationForm.jsx';
import BidderSubmittedQuotations from './pages/bidder/BidderSubmittedQuotations.jsx';

/**
 * Main Application Root Component
 * Sets up client-side routes for the core prototype modules under a unified Navigation layout.
 * Used by: src/main.jsx as the React DOM root entry point.
 * Connects to: React Router DOM.
 * Database table affected: None.
 *
 * @returns {JSX.Element} React routing tree.
 */
export default function App() {
  return (
    <Navigation>
      <Routes>
        {/* Root Route: Landing Page / Prototype View Selector */}
        <Route path="/" element={<Home />} />

        {/* ================================================================= */}
        {/* CHR PERSONNEL MODULES (Core Functions)                            */}
        {/* ================================================================= */}
        {/* 1. CHR Dashboard */}
        <Route path="/chr/dashboard" element={<CHRDashboard />} />

        {/* 2. Procurement Records Table */}
        <Route path="/chr/procurements" element={<ProcurementTable />} />

        {/* 3. Create Procurement Form */}
        <Route path="/chr/procurements/new" element={<ProcurementForm />} />

        {/* Edit Procurement Form */}
        <Route path="/chr/procurements/:id/edit" element={<ProcurementForm />} />

        {/* 4. Procurement Details */}
        <Route path="/chr/procurements/:id" element={<ProcurementDetails />} />

        {/* 5. CHR Bids Evaluation Portal */}
        <Route path="/chr/bids" element={<CHRBids />} />

        {/* 6. Simple Financial Monitoring Ledger */}
        <Route path="/chr/financials" element={<SimpleFinancialMonitoring />} />

        {/* 7. Transaction History Audit Log */}
        <Route path="/chr/history" element={<TransactionHistoryView />} />

        {/* ================================================================= */}
        {/* BIDDER MODULES (Core Functions)                                   */}
        {/* ================================================================= */}
        {/* 1. Open Opportunities Catalog */}
        <Route path="/bidder/opportunities" element={<BidderOpportunities />} />

        {/* 2. Submit Quotation Form */}
        <Route path="/bidder/submit-bid" element={<BidderQuotationForm />} />

        {/* 3. My Submitted Quotations */}
        <Route path="/bidder/my-quotations" element={<BidderSubmittedQuotations />} />

        {/* Fallback for unknown paths: Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Navigation>
  );
}
