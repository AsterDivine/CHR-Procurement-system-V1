import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Login Page
 * Authenticates users against the PHP backend session (/api/auth/login.php).
 * Handles both 'bidder' and 'chr' user roles.
 */
export default function Login() {
  const navigate = useNavigate();
  const { login, demoLogin, backendOffline } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Real API login: sends JSON with credentials: 'include'
      const user = await login(email, password);
      if (user.role === 'chr') {
        navigate('/chr/dashboard');
      } else {
        navigate('/bidder/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick helper to fill demo credentials during capstone presentations
  const fillDemoAccount = (role) => {
    setErrorMsg('');
    if (role === 'chr') {
      setEmail('chr.demo@example.test');
      setPassword('Demo1234!');
    } else {
      setEmail('bidder.demo@example.test');
      setPassword('Demo1234!');
    }
  };

  const handleSimulateLogin = (role) => {
    demoLogin(role);
    if (role === 'chr') {
      navigate('/chr/dashboard');
    } else {
      navigate('/bidder/dashboard');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-seal">CHR</div>
          <h2>System Login</h2>
          <p>Commission on Human Rights &mdash; Cordillera Administrative Region</p>
        </div>

        <div className="auth-card-body">
          {errorMsg && (
            <div className="notice-box danger" style={{ marginBottom: '16px' }}>
              <div>{errorMsg}</div>
            </div>
          )}

          {backendOffline && (
            <div className="notice-box warning" style={{ marginBottom: '16px' }}>
              <div>
                <strong>Notice:</strong> Apache/MySQL is not reachable at <code>http://localhost/chr-procurement-system/api</code>.
                You can use the <strong>Instant Demo</strong> buttons below to test all screens.
              </div>
            </div>
          )}

          <form className="gov-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="e.g., supplier@company.com or chr.demo@example.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password <span className="required">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating with CHR Server...' : 'Sign In to System'}
            </button>
          </form>

          {/* Capstone Defense Credentials Quick Box */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
              Capstone Defense Demo Accounts:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>CHR Personnel:</strong> chr.demo@example.test</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 6px' }}
                    onClick={() => fillDemoAccount('chr')}
                  >
                    Auto-Fill
                  </button>
                  {backendOffline && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                      onClick={() => handleSimulateLogin('chr')}
                    >
                      Instant
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>Bidder Supplier:</strong> bidder.demo@example.test</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 6px' }}
                    onClick={() => fillDemoAccount('bidder')}
                  >
                    Auto-Fill
                  </button>
                  {backendOffline && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                      onClick={() => handleSimulateLogin('bidder')}
                    >
                      Instant
                    </button>
                  )}
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                Default Demo Password: <code>Demo1234!</code>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card-footer">
          <div>
            Are you a prospective supplier?{' '}
            <Link to="/register"><strong>Register as a Bidder</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
