import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/Search.jsx
 * =============================================================================
 * 
 * Global Cross-Module Search for CHR Personnel.
 * Groups search queries across:
 * 1. Procurement Opportunities (Reference No., Title)
 * 2. Procurement Transactions (Control No., Project Title, Stage)
 * 3. Registered Bidders (Company Name, Representative Name, Contact)
 */

const DEMO_SEARCH_DATA = {
  opportunities: [
    {
      id: 1,
      reference_no: 'CHR-CAR-2024-001',
      title: 'Procurement of Office Supplies for Q3 2024',
      abc: 150000.0,
      deadline: '2024-09-15 17:00:00',
      status: 'open',
      created_at: '2024-08-10 09:30:00',
    },
    {
      id: 2,
      reference_no: 'CHR-CAR-2024-002',
      title: 'Supply and Delivery of IT Equipment for Legal and Investigation Unit',
      abc: 450000.0,
      deadline: '2024-09-20 17:00:00',
      status: 'open',
      created_at: '2024-08-15 14:15:00',
    },
    {
      id: 3,
      reference_no: 'CHR-CAR-2024-003',
      title: 'Preventive Maintenance and Spare Parts for CHR-CAR Service Vehicles',
      abc: 85000.0,
      deadline: '2024-08-25 17:00:00',
      status: 'awarded',
      created_at: '2024-08-01 11:00:00',
    },
    {
      id: 4,
      reference_no: 'CHR-CAR-2024-004',
      title: 'Meals, Venue, and Accommodation for Regional Human Rights Summit',
      abc: 120000.0,
      deadline: '2024-08-10 17:00:00',
      status: 'completed',
      created_at: '2024-07-20 10:00:00',
    },
  ],
  transactions: [
    {
      id: 1,
      opportunity_id: 1,
      control_no: 'TXN-2024-001',
      reference_no: 'CHR-CAR-2024-001',
      title: 'Procurement of Office Supplies for Q3 2024',
      current_stage: 'Abstract / Canvass',
      payment_status: 'not_for_billing',
      abc: 150000.0,
      awarded_amount: 142500.0,
      savings: 7500.0,
    },
    {
      id: 2,
      opportunity_id: 2,
      control_no: 'TXN-2024-002',
      reference_no: 'CHR-CAR-2024-002',
      title: 'Supply and Delivery of IT Equipment for Legal and Investigation Unit',
      current_stage: 'Request for Quotation',
      payment_status: 'not_for_billing',
      abc: 450000.0,
      awarded_amount: 428000.0,
      savings: 22000.0,
    },
    {
      id: 3,
      opportunity_id: 3,
      control_no: 'TXN-2024-003',
      reference_no: 'CHR-CAR-2024-003',
      title: 'Preventive Maintenance and Spare Parts for CHR-CAR Service Vehicles',
      current_stage: 'Notice of Award',
      payment_status: 'not_for_billing',
      abc: 85000.0,
      awarded_amount: 79500.0,
      savings: 5500.0,
    },
  ],
  bidders: [
    {
      id: 2,
      full_name: 'Juan Dela Cruz',
      organization_name: 'Highland Paper & Office Depot',
      email: 'bidder.demo@example.test',
      contact_number: '+63 917 123 4567',
      address: 'Session Road, Baguio City, Benguet',
      total_bids_submitted: 3,
      created_at: '2024-08-01 08:00:00',
    },
    {
      id: 3,
      full_name: 'Maria Santos',
      organization_name: 'Cordillera Computer & Cyber Solutions',
      email: 'msantos@cordilleracomputer.example',
      contact_number: '+63 920 987 6543',
      address: 'Magsaysay Avenue, Baguio City, Benguet',
      total_bids_submitted: 2,
      created_at: '2024-08-05 10:20:00',
    },
    {
      id: 4,
      full_name: 'Arthur Baguio',
      organization_name: 'Baguio Auto Tech Services',
      email: 'arthur@baguioautotech.example',
      contact_number: '+63 918 555 1212',
      address: 'La Trinidad, Benguet',
      total_bids_submitted: 1,
      created_at: '2024-08-08 13:40:00',
    },
  ],
};

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'opportunities', 'transactions', 'bidders'
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [results, setResults] = useState({
    opportunities: [],
    transactions: [],
    bidders: [],
  });

  const performSearch = async (searchTerm) => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) {
      setResults({ opportunities: [], transactions: [], bidders: [] });
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await api.search(q);
      if (res.data && res.data.results) {
        setResults({
          opportunities: res.data.results.opportunities || [],
          transactions: res.data.results.transactions || [],
          bidders: res.data.results.bidders || [],
        });
      }
    } catch {
      // Offline fallback: perform local search on DEMO_SEARCH_DATA
      const term = q.toLowerCase();
      const opps = DEMO_SEARCH_DATA.opportunities.filter(
        (o) =>
          o.reference_no.toLowerCase().includes(term) ||
          o.title.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term)
      );

      const txns = DEMO_SEARCH_DATA.transactions.filter(
        (t) =>
          t.control_no.toLowerCase().includes(term) ||
          t.reference_no.toLowerCase().includes(term) ||
          t.title.toLowerCase().includes(term) ||
          t.current_stage.toLowerCase().includes(term)
      );

      const bidds = DEMO_SEARCH_DATA.bidders.filter(
        (b) =>
          b.organization_name.toLowerCase().includes(term) ||
          b.full_name.toLowerCase().includes(term) ||
          b.email.toLowerCase().includes(term) ||
          (b.address && b.address.toLowerCase().includes(term))
      );

      setResults({
        opportunities: opps,
        transactions: txns,
        bidders: bidds,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      performSearch(query.trim());
    }
  };

  const totalResults =
    results.opportunities.length + results.transactions.length + results.bidders.length;

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '₱0.00';
    return `₱${Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="search-page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Global System Search</h2>
          <p className="page-subtitle">
            Search across registered procurement opportunities, active transactions, and accredited bidders.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="search"
            className="form-control"
            style={{ fontSize: '15px', padding: '10px 14px' }}
            placeholder="Search by reference no., transaction control no., title, supplier name, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ minWidth: '120px', fontWeight: 600 }}
          >
            🔍 Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          <span>Try quick terms:</span>
          {['Office Supplies', 'IT Equipment', 'TXN-2024', 'CHR-CAR', 'Highland Paper', 'Services'].map((kw) => (
            <button
              key={kw}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
              }}
              onClick={() => {
                setQuery(kw);
                setSearchParams({ q: kw });
                performSearch(kw);
              }}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Filter Bar */}
      {hasSearched && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            All Results ({totalResults})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'opportunities' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('opportunities')}
          >
            Opportunities ({results.opportunities.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions ({results.transactions.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'bidders' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('bidders')}
          >
            Bidders / Suppliers ({results.bidders.length})
          </button>
        </div>
      )}

      {/* Results View */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          Searching system records...
        </div>
      ) : hasSearched && totalResults === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)' }}>
            No Matching Records Found
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            No opportunities, transactions, or registered suppliers matched <strong>"{query}"</strong>.
          </p>
        </div>
      ) : hasSearched ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. OPPORTUNITIES GROUP */}
          {(activeTab === 'all' || activeTab === 'opportunities') && results.opportunities.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  Procurement Opportunities ({results.opportunities.length})
                </h3>
                <Link to="/chr/opportunities" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Manage All &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    style={{
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13px' }}>
                          {opp.reference_no}
                        </span>
                        <StatusBadge status={opp.status} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-main)', marginTop: '2px' }}>
                        {opp.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Approved Budget (ABC): <strong>{formatCurrency(opp.abc)}</strong> &bull; Deadline: {opp.deadline || 'N/A'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/chr/opportunities/${opp.id}/submissions`)}
                      >
                        View Submissions
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/chr/opportunities/${opp.id}/edit`)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. TRANSACTIONS GROUP */}
          {(activeTab === 'all' || activeTab === 'transactions') && results.transactions.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  Procurement Transactions ({results.transactions.length})
                </h3>
                <Link to="/chr/transactions" style={{ fontSize: '12px', fontWeight: 600 }}>
                  View All Trackers &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '13px' }}>
                          {tx.control_no}
                        </span>
                        <span style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '3px',
                        }}>
                          {tx.current_stage}
                        </span>
                        <StatusBadge status={tx.payment_status} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-main)', marginTop: '2px' }}>
                        {tx.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Ref: {tx.reference_no} &bull; ABC: <strong>{formatCurrency(tx.abc)}</strong> &bull; Awarded: {tx.awarded_amount ? formatCurrency(tx.awarded_amount) : 'Pending'}
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/chr/transactions/${tx.id}`)}
                      >
                        Open Tracker &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. BIDDERS / SUPPLIERS GROUP */}
          {(activeTab === 'all' || activeTab === 'bidders') && results.bidders.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  Registered Bidders &amp; Suppliers ({results.bidders.length})
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
              }}>
                {results.bidders.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '14px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--color-primary-dark)' }}>
                      {b.organization_name || 'Individual Supplier'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Authorized Rep: <strong>{b.full_name}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                      📧 {b.email}
                    </div>
                    {b.contact_number && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                        📞 {b.contact_number}
                      </div>
                    )}
                    {b.address && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                        📍 {b.address}
                      </div>
                    )}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Submissions: <strong>{b.total_bids_submitted || 0} bids</strong>
                      </span>
                      <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                        Active Supplier
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-main)' }}>
            Enter a search term above to locate opportunities, transactions, or suppliers.
          </p>
          <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
            The global index queries project titles, government control numbers, and vendor registries.
          </p>
        </div>
      )}
    </div>
  );
}
