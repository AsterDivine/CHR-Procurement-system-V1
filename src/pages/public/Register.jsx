import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Bidder Registration Page
 * Connects to PHP backend (/api/auth/register_bidder.php).
 * Strictly creates accounts with role='bidder'.
 */
export default function Register() {
  const navigate = useNavigate();
  const { registerBidder } = useAuth();

  const [formData, setFormData] = useState({
    organization_name: '',
    full_name: '',
    email: '',
    contact_number: '',
    address: '',
    password: '',
    confirm_password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call PHP register endpoint
      await registerBidder({
        organization_name: formData.organization_name,
        full_name: formData.full_name,
        email: formData.email,
        contact_number: formData.contact_number,
        address: formData.address,
        password: formData.password,
      });

      // Registration endpoint creates session automatically; redirect to bidder dashboard
      navigate('/bidder/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '580px' }}>
        <div className="auth-card-header">
          <div className="auth-seal">CHR</div>
          <h2>Bidder Registration</h2>
          <p>Register your company for CHR-CAR Procurement Opportunities</p>
        </div>

        <div className="auth-card-body">
          {errorMsg && (
            <div className="notice-box danger" style={{ marginBottom: '16px' }}>
              <div>{errorMsg}</div>
            </div>
          )}

          <div className="notice-box info" style={{ marginBottom: '16px' }}>
            <div>
              <strong>Supplier Note:</strong> This form registers prospective suppliers/contractors under Republic Act 9184 for CHR-CAR bids and quotations.
            </div>
          </div>

          <form className="gov-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="organization_name">
                Company / Business Name <span className="required">*</span>
              </label>
              <input
                id="organization_name"
                name="organization_name"
                type="text"
                className="form-input"
                placeholder="e.g., Mountain Province Office Supplies Inc."
                value={formData.organization_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="full_name">
                  Authorized Representative <span className="required">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="form-input"
                  placeholder="Full Name (e.g. Juan Dela Cruz)"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact_number">
                  Contact Number
                </label>
                <input
                  id="contact_number"
                  name="contact_number"
                  type="tel"
                  className="form-input"
                  placeholder="e.g., 0917-123-4567"
                  value={formData.contact_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Official Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="bids@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address">
                Office / Business Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                className="form-input"
                placeholder="e.g., Unit 4B, Session Road, Baguio City"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password <span className="required">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm_password">
                  Confirm Password <span className="required">*</span>
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  className="form-input"
                  placeholder="Repeat password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering Company with CHR...' : 'Complete Bidder Registration'}
            </button>
          </form>
        </div>

        <div className="auth-card-footer">
          <div>
            Already registered? <Link to="/login"><strong>Sign in here</strong></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
