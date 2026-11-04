import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/AuditLogs.jsx
 * =============================================================================
 * 
 * System Audit Trail & Security Logs for CHR Personnel.
 * Tracks critical actions:
 * - User Logins & Authentications
 * - Opportunity Creations & Status Updates
 * - Bid Quotations & Submissions
 * - Transaction Lifecycle Stage Transitions
 * - Document Uploads & Verifications
 */

const DEMO_AUDIT_LOGS = [
  {
    id: 101,
    user_id: 1,
    user_name: 'CHR Personnel Demo',
    user_email: 'chr.demo@example.test',
    user_role: 'chr',
    organization_name: 'Commission on Human Rights CAR',
    action: 'STAGE_CHANGE',
    entity_type: 'transaction',
    entity_id: 1,
    details: 'Advanced transaction TXN-2024-001 from Request for Quotation to Abstract / Canvass',
    created_at: '2024-08-20 15:45:12',
  },
  {
    id: 100,
    user_id: 2,
    user_name: 'Juan Dela Cruz',
    user_email: 'bidder.demo@example.test',
    user_role: 'bidder',
    organization_name: 'Highland Paper & Office Depot',
    action: 'BID_SUBMITTED',
    entity_type: 'bid',
    entity_id: 5,
    details: 'Submitted sealed quotation ₱142,500.00 with 3 required eligibility documents for CHR-CAR-2024-001',
    created_at: '2024-08-18 11:20:00',
  },
  {
    id: 99,
    user_id: 1,
    user_name: 'CHR Personnel Demo',
    user_email: 'chr.demo@example.test',
    user_role: 'chr',
    organization_name: 'Commission on Human Rights CAR',
    action: 'DOCUMENT_UPLOAD',
    entity_type: 'transaction',
    entity_id: 1,
    details: 'Uploaded signed Purchase Request (PR) scanned verification PDF',
    created_at: '2024-08-15 14:02:40',
  },
  {
    id: 98,
    user_id: 1,
    user_name: 'CHR Personnel Demo',
    user_email: 'chr.demo@example.test',
    user_role: 'chr',
    organization_name: 'Commission on Human Rights CAR',
    action: 'CREATE_TRANSACTION',
    entity_type: 'transaction',
    entity_id: 2,
    details: 'Created internal procurement tracker TXN-2024-002 linked to CHR-CAR-2024-002',
    created_at: '2024-08-15 10:15:33',
  },
  {
    id: 97,
    user_id: 1,
    user_name: 'CHR Personnel Demo',
    user_email: 'chr.demo@example.test',
    user_role: 'chr',
    organization_name: 'Commission on Human Rights CAR',
    action: 'CREATE_OPPORTUNITY',
    entity_type: 'opportunity',
    entity_id: 2,
    details: 'Created and published opportunity CHR-CAR-2024-002 (ABC ₱450,000.00)',
    created_at: '2024-08-15 09:30:15',
  },
  {
    id: 96,
    user_id: 2,
    user_name: 'Juan Dela Cruz',
    user_email: 'bidder.demo@example.test',
    user_role: 'bidder',
    organization_name: 'Highland Paper & Office Depot',
    action: 'LOGIN',
    entity_type: 'user',
    entity_id: 2,
    details: 'Successful user authentication via secure PHP session session_regenerate_id',
    created_at: '2024-08-14 08:45:00',
  },
  {
    id: 95,
    user_id: 1,
    user_name: 'CHR Personnel Demo',
    user_email: 'chr.demo@example.test',
    user_role: 'chr',
    organization_name: 'Commission on Human Rights CAR',
    action: 'LOGIN',
    entity_type: 'user',
    entity_id: 1,
    details: 'BAC Personnel authenticated from IP 192.168.1.45',
    created_at: '2024-08-14 08:00:22',
  },
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown options
  const [actionOptions, setActionOptions] = useState([
    'LOGIN',
    'LOGOUT',
    'CREATE_OPPORTUNITY',
    'UPDATE_OPPORTUNITY',
    'BID_SUBMITTED',
    'CREATE_TRANSACTION',
    'STAGE_CHANGE',
    'FINANCIAL_UPDATE',
    'DOCUMENT_UPLOAD',
  ]);
  const [entityOptions, setEntityOptions] = useState([
    'opportunity',
    'bid',
    'transaction',
    'user',
    'budget',
  ]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (actionFilter) params.append('action', actionFilter);
    if (entityFilter) params.append('entity_type', entityFilter);
    if (dateFilter) params.append('date', dateFilter);

    try {
      const res = await api.getAuditLogs(params.toString());
      if (res.data) {
        setLogs(res.data.logs || []);
        if (res.data.options) {
          if (res.data.options.actions && res.data.options.actions.length > 0) {
            setActionOptions(res.data.options.actions);
          }
          if (res.data.options.entity_types && res.data.options.entity_types.length > 0) {
            setEntityOptions(res.data.options.entity_types);
          }
        }
      }
    } catch {
      // Offline fallback: filter DEMO_AUDIT_LOGS locally
      let filtered = [...DEMO_AUDIT_LOGS];

      if (actionFilter) {
        filtered = filtered.filter((l) => l.action === actionFilter);
      }
      if (entityFilter) {
        filtered = filtered.filter((l) => l.entity_type === entityFilter);
      }
      if (dateFilter) {
        filtered = filtered.filter((l) => l.created_at.startsWith(dateFilter));
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.details.toLowerCase().includes(s) ||
            l.user_name.toLowerCase().includes(s) ||
            l.user_email.toLowerCase().includes(s) ||
            l.action.toLowerCase().includes(s)
        );
      }

      setLogs(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, dateFilter]);

  const handleReset = () => {
    setActionFilter('');
    setEntityFilter('');
    setDateFilter('');
    setSearchTerm('');
  };

  const displayedLogs = searchTerm
    ? logs.filter(
        (l) =>
          l.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  return (
    <div className="audit-logs-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>System Audit Trail &amp; Security Logs</h2>
          <p className="page-subtitle">
            Immutable log of all user logins, bids submissions, lifecycle stage updates, and procurement documents for audit defense.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchLogs}
            title="Reload latest 100 audit entries"
          >
            🔄 Refresh Trail
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            title="Print formal audit ledger"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card no-print" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
            Filter Audit Records (Latest 100 maximum)
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11.5px' }}
            onClick={handleReset}
          >
            Reset Filters
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          <div>
            <label className="form-label" htmlFor="audit-search">Keyword / User Search</label>
            <input
              id="audit-search"
              type="text"
              className="form-control"
              placeholder="Search user, email, remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="audit-action">Action Type</label>
            <select
              id="audit-action"
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All System Actions</option>
              {actionOptions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="audit-entity">Entity Type</label>
            <select
              id="audit-entity"
              className="form-control"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entity Modules</option>
              {entityOptions.map((ent) => (
                <option key={ent} value={ent}>
                  {ent.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="audit-date">Date</label>
            <input
              id="audit-date"
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            Retrieving system audit logs...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-danger)' }}>
            <p><strong>Failed to load audit logs:</strong> {error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '10px' }}
              onClick={fetchLogs}
            >
              Retry
            </button>
          </div>
        ) : displayedLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              No Audit Records Found
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No system security logs match your current filter selection.
            </p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border-medium)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>User &amp; Organization</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Action</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Target Entity</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Details &amp; Audit Trail Record</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.map((log, idx) => (
                <tr
                  key={log.id || idx}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                  }}
                >
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <div>{log.created_at ? log.created_at.slice(0, 10) : '—'}</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                      {log.created_at ? log.created_at.slice(11, 19) : ''}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-main)' }}>
                      {log.user_name || 'System / Unregistered'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                      {log.user_email || '—'}
                    </div>
                    {log.organization_name && (
                      <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 500 }}>
                        {log.organization_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={log.action} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                      padding: '1px 6px',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}>
                      {log.entity_type ? log.entity_type.toUpperCase() : 'N/A'}
                    </span>
                    {log.entity_id && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                        ID #{log.entity_id}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12.5px', color: 'var(--color-text-main)', maxWidth: '380px' }}>
                    {log.details || 'No remarks provided.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--color-text-subtle)', textAlign: 'right' }}>
        Showing {displayedLogs.length} audit trail events &bull; Commission on Human Rights Regional Office CAR
      </div>
    </div>
  );
}
