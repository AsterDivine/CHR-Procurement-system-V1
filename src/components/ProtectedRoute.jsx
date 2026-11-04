import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from './Loading.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes based on active PHP session and role authorization.
 * 
 * Rules:
 * - If session is still verifying, show Loading state.
 * - If not authenticated, redirect to /login.
 * - If user role does not match requiredRole, display an Access Restricted alert.
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const { user, loading } = useAuth();

  // 1. Session verification in progress
  if (loading) {
    return (
      <div className="gov-card">
        <Loading message="Checking authorization with CHR server..." />
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Role mismatch (e.g. Bidder attempting to access CHR internal finance routes)
  if (requiredRole && user.role !== requiredRole) {
    const requiredTitle = requiredRole === 'chr' ? 'CHR Personnel' : 'Bidder / Supplier';
    const currentTitle = user.role === 'chr' ? 'CHR Personnel' : 'Bidder / Supplier';

    return (
      <div className="gov-card">
        <div className="gov-card-header" style={{ borderBottomColor: '#fecaca', background: '#fef2f2' }}>
          <h3 style={{ color: '#991b1b', margin: 0 }}>403 &mdash; Access Restricted</h3>
        </div>
        <div className="gov-card-body">
          <div className="notice-box danger" style={{ marginBottom: '16px' }}>
            <div>
              <strong>Unauthorized Role Access:</strong> This module is restricted to <strong>{requiredTitle}</strong> accounts only.
              You are currently signed in as <strong>{user.full_name} ({currentTitle})</strong>.
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            If you need access to this resource, please sign out and sign in with an authorized account, or return to your role dashboard.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <Link
              to={user.role === 'chr' ? '/chr/dashboard' : '/bidder/dashboard'}
              className="btn btn-primary btn-sm"
            >
              Return to My Dashboard
            </Link>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Switch Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized: render guarded children
  return children;
}
