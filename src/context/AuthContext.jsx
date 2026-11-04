import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/context/AuthContext.jsx
 * =============================================================================
 * 
 * Authentication Context
 * - Maintains active session state for the React SPA.
 * - On app initialization, calls /api/auth/me.php to verify if a valid PHP session exists.
 * - Stores authenticated user details (ID, role, name, email, org).
 * - Exposes login, registerBidder, logout, and refreshUser methods.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendOffline, setBackendOffline] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMe();
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        setBackendOffline(false);
      } else {
        setUser(null);
      }
    } catch (err) {
      if (err.status === 401) {
        // Not logged in (normal state for guest visitors)
        setUser(null);
        setBackendOffline(false);
      } else if (err.status === 0 || (err.message && err.message.includes('Unable to connect'))) {
        // Apache / XAMPP backend is not running or unreachable
        console.warn('PHP Backend is currently unreachable. Running in offline/preview mode.');
        setBackendOffline(true);
        const stored = sessionStorage.getItem('chr_demo_session');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setError(err.message);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Real PHP Login via /api/auth/login.php
   * PHP will verify password_verify() and establish the session.
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.login(email, password);
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        setBackendOffline(false);
        return res.data.user;
      }
      throw new Error(res.message || 'Login failed.');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Real PHP Bidder Registration via /api/auth/register_bidder.php
   */
  const registerBidder = async (formData) => {
    setError(null);
    try {
      const res = await api.registerBidder(formData);
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        setBackendOffline(false);
        return res.data.user;
      }
      throw new Error(res.message || 'Registration failed.');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Real PHP Logout via /api/auth/logout.php
   * Destroys the PHP session and clears session cookie.
   */
  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout request warning:', err.message);
    } finally {
      sessionStorage.removeItem('chr_demo_session');
      setUser(null);
    }
  };

  /**
   * Demo Simulation Login (for capstone offline defense/testing when Apache is offline)
   */
  const demoLogin = (role) => {
    const demoUser = role === 'chr' ? {
      id: 1,
      role: 'chr',
      full_name: 'Maria Santos (BAC Secretariat)',
      email: 'chr.demo@example.test',
      organization_name: 'CHR-CAR Regional Office',
      contact_number: '074-442-1234',
      address: 'CHR-CAR, Baguio City',
    } : {
      id: 2,
      role: 'bidder',
      full_name: 'Juan Dela Cruz',
      email: 'bidder.demo@example.test',
      organization_name: 'Highland Office & IT Supplies',
      contact_number: '0917-555-8899',
      address: 'Session Road, Baguio City',
    };
    sessionStorage.setItem('chr_demo_session', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const value = {
    user,
    loading,
    error,
    backendOffline,
    login,
    registerBidder,
    logout,
    demoLogin,
    refreshUser: checkAuth,
    isAuthenticated: !!user,
    isBidder: user?.role === 'bidder',
    isCHR: user?.role === 'chr',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
