import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Layout & Security Components
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Public Authentication Pages
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';

// Bidder Pages
import BidderDashboard from './pages/bidder/BidderDashboard.jsx';
import Opportunities from './pages/bidder/Opportunities.jsx';
import OpportunityDetails from './pages/bidder/OpportunityDetails.jsx';
import SubmitBid from './pages/bidder/SubmitBid.jsx';
import MySubmissions from './pages/bidder/MySubmissions.jsx';
import BidderProfile from './pages/bidder/BidderProfile.jsx';

// CHR Personnel Pages (Preserved for full routing tree)
import CHRDashboard from './pages/chr/CHRDashboard.jsx';
import ManageOpportunities from './pages/chr/ManageOpportunities.jsx';
import CreateEditOpportunity from './pages/chr/CreateEditOpportunity.jsx';
import OpportunitySubmissions from './pages/chr/OpportunitySubmissions.jsx';
import ProcurementTransactions from './pages/chr/ProcurementTransactions.jsx';
import TransactionDetails from './pages/chr/TransactionDetails.jsx';
import BudgetMonitoring from './pages/chr/BudgetMonitoring.jsx';
import Reports from './pages/chr/Reports.jsx';
import Search from './pages/chr/Search.jsx';
import AuditLogs from './pages/chr/AuditLogs.jsx';

/**
 * Root Redirector
 * Directs users to their corresponding dashboard based on their active PHP session role.
 */
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'chr') {
    return <Navigate to="/chr/dashboard" replace />;
  }

  return <Navigate to="/bidder/dashboard" replace />;
}

/**
 * App Root Component
 * Sets up the central React Router tree wrapped inside the session AuthProvider.
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Authentication Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main Application Shell */}
        <Route element={<Layout />}>
          {/* Root Path Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* ================================================================= */}
          {/* BIDDER PAGES                                                      */}
          {/* ================================================================= */}
          <Route
            path="/bidder/dashboard"
            element={
              <ProtectedRoute requiredRole="bidder">
                <BidderDashboard />
              </ProtectedRoute>
            }
          />
          {/* Opportunities list & details are accessible to all logged-in users */}
          <Route
            path="/bidder/opportunities"
            element={
              <ProtectedRoute>
                <Opportunities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidder/opportunities/:id"
            element={
              <ProtectedRoute>
                <OpportunityDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidder/submit-bid/:id"
            element={
              <ProtectedRoute requiredRole="bidder">
                <SubmitBid />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidder/submissions"
            element={
              <ProtectedRoute requiredRole="bidder">
                <MySubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidder/profile"
            element={
              <ProtectedRoute requiredRole="bidder">
                <BidderProfile />
              </ProtectedRoute>
            }
          />

          {/* ================================================================= */}
          {/* CHR PERSONNEL PAGES                                               */}
          {/* ================================================================= */}
          <Route
            path="/chr/dashboard"
            element={
              <ProtectedRoute requiredRole="chr">
                <CHRDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/opportunities"
            element={
              <ProtectedRoute requiredRole="chr">
                <ManageOpportunities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/opportunities/new"
            element={
              <ProtectedRoute requiredRole="chr">
                <CreateEditOpportunity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/opportunities/:id/edit"
            element={
              <ProtectedRoute requiredRole="chr">
                <CreateEditOpportunity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/opportunities/:id/submissions"
            element={
              <ProtectedRoute requiredRole="chr">
                <OpportunitySubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/transactions"
            element={
              <ProtectedRoute requiredRole="chr">
                <ProcurementTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/transactions/new"
            element={
              <ProtectedRoute requiredRole="chr">
                <TransactionDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/transactions/:id"
            element={
              <ProtectedRoute requiredRole="chr">
                <TransactionDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/budget"
            element={
              <ProtectedRoute requiredRole="chr">
                <BudgetMonitoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/reports"
            element={
              <ProtectedRoute requiredRole="chr">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/search"
            element={
              <ProtectedRoute requiredRole="chr">
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chr/audit-logs"
            element={
              <ProtectedRoute requiredRole="chr">
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
