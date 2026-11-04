import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/TransactionDetails.jsx
 * =============================================================================
 * 
 * Comprehensive 5-Tab Transaction Lifecycle Tracker:
 * 1. Overview (Metadata, ABC, Awarded, Savings, Supplier)
 * 2. Workflow (11 Sequential Statutory Stages with Progress Controls)
 * 3. Documents (Compliance Checklist & File Uploads)
 * 4. Financials (Budget Allocation, Expense Categories, Savings)
 * 5. History (Audit Trail Log)
 */
export default function TransactionDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: 'overview' | 'workflow' | 'documents' | 'financials' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Transaction state objects
  const [transaction, setTransaction] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);
  const [budgetSource, setBudgetSource] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [budgetList, setBudgetList] = useState([]);

  // Workflow Next-Stage Form State
  const [advancingStage, setAdvancingStage] = useState(false);
  const [stageRemarks, setStageRemarks] = useState('');

  // Financials Form State
  const [financialForm, setFinancialForm] = useState({
    budget_source_id: '',
    expense_category: '',
    awarded_amount: '',
    payment_status: 'not_for_billing',
  });
  const [savingFinancials, setSavingFinancials] = useState(false);

  // Document Upload Form State
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('Purchase Request');
  const [docStatus, setDocStatus] = useState('complete');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // The 11 official sequential stages
  const stages = [
    'Purchase Request',
    'Request for Quotation',
    'Abstract / Canvass',
    'BAC Resolution',
    'Notice of Award',
    'Purchase Order',
    'Notice to Proceed',
    'Delivery / Implementation',
    'Inspection / Evaluation',
    'Billing / Payment',
    'Completed',
  ];

  // Fallback demo data
  const fallbackTransaction = {
    id: parseInt(id, 10) || 1,
    control_no: `TXN-2024-000${id || '1'}`,
    opportunity_id: 1,
    selected_bid_id: 201,
    budget_source_id: 1,
    expense_category: 'Supplies & Materials',
    abc: 150000.00,
    awarded_amount: 142500.00,
    savings: 7500.00,
    current_stage: 'Abstract / Canvass',
    payment_status: 'not_for_billing',
    created_by_name: 'CHR BAC Secretariat Officer',
    created_at: '2024-10-15 09:00:00',
    updated_at: '2024-11-02 16:00:00',
  };

  const fallbackOpportunity = {
    id: 1,
    reference_no: 'CHR-CAR-2024-001',
    title: 'Procurement of Office Supplies for Q3 2024',
    description: 'Procurement of standardized common-use office supplies for CHR Regional Office.',
    procurement_type: 'NP-53.9 Small Value Procurement',
    abc: 150000.00,
    deadline: '2024-11-15 17:00:00',
    status: 'open',
  };

  const fallbackSelectedBid = {
    id: 201,
    bid_amount: 142500.00,
    remarks: 'Complies with all technical specs; delivery within 7 working days.',
    bidder_name: 'Roberto Flores',
    organization_name: 'Highland Paper Traders',
    bidder_email: 'sales@highlandpaper.ph',
    bidder_phone: '0917-555-0192',
    status: 'selected',
  };

  const fallbackBudgetSource = {
    id: 1,
    name: 'GAA 2024 - MOOE Regular',
    fiscal_year: 2024,
    allocated_amount: 1250000.00,
  };

  const fallbackDocuments = [
    {
      id: 1,
      document_type: 'Approved Purchase Request (PR)',
      original_name: 'PR-2024-001-Approved.pdf',
      status: 'complete',
      uploaded_by_name: 'BAC Secretariat',
      uploaded_at: '2024-10-15 10:15:00',
    },
    {
      id: 2,
      document_type: 'Request for Quotation (RFQ) Packet',
      original_name: 'RFQ-Posting-Copy.pdf',
      status: 'complete',
      uploaded_by_name: 'BAC Secretariat',
      uploaded_at: '2024-10-18 14:30:00',
    },
    {
      id: 3,
      document_type: 'Abstract of Canvass / Quotations',
      original_name: 'Abstract-Canvass-Signed.pdf',
      status: 'complete',
      uploaded_by_name: 'BAC Secretariat',
      uploaded_at: '2024-11-02 15:45:00',
    },
  ];

  const fallbackHistory = [
    {
      id: 1,
      action_type: 'Stage Transition',
      old_value: 'Purchase Request',
      new_value: 'Request for Quotation',
      remarks: 'RFQ published on bulletin board and website.',
      performed_by_name: 'CHR BAC Secretariat',
      created_at: '2024-10-18 14:30:00',
    },
    {
      id: 2,
      action_type: 'Stage Transition',
      old_value: 'Request for Quotation',
      new_value: 'Abstract / Canvass',
      remarks: 'Quotations opened and abstract prepared.',
      performed_by_name: 'CHR BAC Secretariat',
      created_at: '2024-11-02 16:00:00',
    },
    {
      id: 3,
      action_type: 'Financial Update',
      old_value: 'Pending',
      new_value: 'Awarded ₱142,500.00 (Savings ₱7,500.00)',
      remarks: 'Selected lowest calculated quotation from Highland Paper Traders.',
      performed_by_name: 'CHR Budget Officer',
      created_at: '2024-11-02 16:15:00',
    },
  ];

  const fallbackBudgetList = [
    { id: 1, name: 'GAA 2024 - MOOE Regular', fiscal_year: 2024, allocated_amount: 1250000 },
    { id: 2, name: 'GAA 2024 - Capital Outlay', fiscal_year: 2024, allocated_amount: 800000 },
    { id: 3, name: 'Human Rights Protection Fund', fiscal_year: 2024, allocated_amount: 500000 },
    { id: 4, name: 'Gender and Development (GAD) Fund', fiscal_year: 2024, allocated_amount: 300000 },
  ];

  // Declare fetcher before useEffect
  const loadTransactionData = async () => {
    setLoading(true);
    setErrorMessage('');
    const targetId = id === 'new' ? 1 : id;

    try {
      // Load available budget sources for dropdown
      try {
        const blRes = await api.getBudgetList();
        if (blRes?.data?.budgets) {
          setBudgetList(blRes.data.budgets);
        } else {
          setBudgetList(fallbackBudgetList);
        }
      } catch (err) {
        setBudgetList(fallbackBudgetList);
      }

      // Fetch transaction details
      const res = await api.getTransaction(targetId);
      if (res?.data?.transaction) {
        const tx = res.data.transaction;
        setTransaction(tx);
        setOpportunity(res.data.opportunity || fallbackOpportunity);
        setSelectedBid(res.data.selected_bid || fallbackSelectedBid);
        setBudgetSource(res.data.budget_source || fallbackBudgetSource);
        setDocuments(res.data.documents || []);
        setHistory(res.data.history || []);

        setFinancialForm({
          budget_source_id: tx.budget_source_id ? String(tx.budget_source_id) : '',
          expense_category: tx.expense_category || '',
          awarded_amount: tx.awarded_amount ? String(tx.awarded_amount) : '',
          payment_status: tx.payment_status || 'not_for_billing',
        });
      } else {
        setTransaction(fallbackTransaction);
        setOpportunity(fallbackOpportunity);
        setSelectedBid(fallbackSelectedBid);
        setBudgetSource(fallbackBudgetSource);
        setDocuments(fallbackDocuments);
        setHistory(fallbackHistory);
        setFinancialForm({
          budget_source_id: '1',
          expense_category: 'Supplies & Materials',
          awarded_amount: '142500',
          payment_status: 'not_for_billing',
        });
      }
    } catch (err) {
      // Offline fallback
      setTransaction(fallbackTransaction);
      setOpportunity(fallbackOpportunity);
      setSelectedBid(fallbackSelectedBid);
      setBudgetSource(fallbackBudgetSource);
      setDocuments(fallbackDocuments);
      setHistory(fallbackHistory);
      setBudgetList(fallbackBudgetList);
      setFinancialForm({
        budget_source_id: '1',
        expense_category: 'Supplies & Materials',
        awarded_amount: '142500',
        payment_status: 'not_for_billing',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactionData();
  }, [id]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Find index of current stage in the 11 stages
  const currentStageName = transaction?.current_stage || 'Purchase Request';
  const currentStageIndex = stages.indexOf(currentStageName);
  const nextStageName =
    currentStageIndex >= 0 && currentStageIndex < stages.length - 1
      ? stages[currentStageIndex + 1]
      : null;

  // Real-time savings calculation for financial form
  const formAwardedNum = parseFloat(financialForm.awarded_amount) || 0;
  const oppAbcNum = parseFloat(transaction?.abc || opportunity?.abc) || 0;
  const formCalculatedSavings = oppAbcNum - formAwardedNum;
  const formHasNegativeSavings = formAwardedNum > oppAbcNum;

  // Handle Advancing to Next Stage
  const handleAdvanceStage = async () => {
    if (!nextStageName) return;

    const confirmMsg = `Advance transaction ${transaction.control_no} from "${currentStageName}" to "${nextStageName}"?`;
    if (!window.confirm(confirmMsg)) return;

    setAdvancingStage(true);
    setErrorMessage('');
    try {
      await api.updateTransactionStage(transaction.id, nextStageName, stageRemarks);
      setActionMessage(`Transaction successfully moved to stage: "${nextStageName}".`);
      setStageRemarks('');
      loadTransactionData();
      setTimeout(() => setActionMessage(''), 3500);
    } catch (err) {
      // Local fallback
      setTransaction((prev) => ({ ...prev, current_stage: nextStageName }));
      setHistory((prev) => [
        {
          id: Date.now(),
          action_type: 'Stage Transition',
          old_value: currentStageName,
          new_value: nextStageName,
          remarks: stageRemarks || 'Advanced to next statutory stage',
          performed_by_name: 'CHR Personnel',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActionMessage(`Transaction advanced to "${nextStageName}" (Prototype local update).`);
      setStageRemarks('');
      setTimeout(() => setActionMessage(''), 3500);
    } finally {
      setAdvancingStage(false);
    }
  };

  // Handle Saving Financials
  const handleSaveFinancials = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setActionMessage('');

    if (formHasNegativeSavings) {
      setErrorMessage(
        `Validation Error: Awarded amount (${formatCurrency(formAwardedNum)}) cannot exceed the Approved Budget for the Contract ABC (${formatCurrency(oppAbcNum)}). Negative savings are strictly disallowed.`
      );
      return;
    }

    const payload = {
      id: transaction.id,
      budget_source_id: financialForm.budget_source_id ? parseInt(financialForm.budget_source_id, 10) : null,
      expense_category: financialForm.expense_category.trim(),
      awarded_amount: financialForm.awarded_amount ? parseFloat(financialForm.awarded_amount) : null,
      payment_status: financialForm.payment_status,
    };

    setSavingFinancials(true);
    try {
      await api.updateTransactionFinancials(payload);
      setActionMessage('Financial monitoring figures and payment status updated successfully!');
      loadTransactionData();
      setTimeout(() => setActionMessage(''), 3500);
    } catch (err) {
      // Local fallback
      setTransaction((prev) => ({
        ...prev,
        budget_source_id: payload.budget_source_id,
        expense_category: payload.expense_category,
        awarded_amount: payload.awarded_amount,
        savings: payload.awarded_amount ? oppAbcNum - payload.awarded_amount : null,
        payment_status: payload.payment_status,
      }));
      setActionMessage('Financial monitoring updated! (Prototype local update)');
      setTimeout(() => setActionMessage(''), 3500);
    } finally {
      setSavingFinancials(false);
    }
  };

  // Handle Uploading Document
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setActionMessage('');

    if (!docFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('transaction_id', transaction.id);
    formData.append('document_type', docType);
    formData.append('status', docStatus);
    formData.append('file', docFile);

    setUploadingDoc(true);
    try {
      await api.uploadTransactionDocument(formData);
      setActionMessage(`Document "${docFile.name}" attached successfully to transaction.`);
      setDocFile(null);
      loadTransactionData();
      setTimeout(() => setActionMessage(''), 3500);
    } catch (err) {
      // Local fallback
      const newDoc = {
        id: Date.now(),
        document_type: docType,
        original_name: docFile.name,
        status: docStatus,
        uploaded_by_name: 'CHR Personnel',
        uploaded_at: new Date().toISOString(),
      };
      setDocuments([newDoc, ...documents]);
      setActionMessage(`Document attached! (Prototype local update)`);
      setDocFile(null);
      setTimeout(() => setActionMessage(''), 3500);
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return <Loading message="Loading transaction details and statutory stage tracker..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ marginBottom: '8px' }}>
          <Link to="/chr/transactions">&larr; Back to Transactions Tracker</Link>
        </div>
        <h1>
          Transaction: <strong>{transaction?.control_no}</strong>
        </h1>
        <p>Project: <strong>{opportunity?.title}</strong></p>
      </div>

      {actionMessage && (
        <div className="notice-box info" style={{ marginBottom: '16px' }}>
          <div>{actionMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="notice-box warning" style={{ marginBottom: '16px' }}>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="gov-tabs">
        <button
          type="button"
          className={`gov-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          type="button"
          className={`gov-tab ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          🔄 Workflow Stages (11)
        </button>
        <button
          type="button"
          className={`gov-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📁 Documents Checklist ({documents.length})
        </button>
        <button
          type="button"
          className={`gov-tab ${activeTab === 'financials' ? 'active' : ''}`}
          onClick={() => setActiveTab('financials')}
        >
          💰 Financials &amp; Savings
        </button>
        <button
          type="button"
          className={`gov-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Audit History ({history.length})
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Top Key Metrics Row */}
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">Approved Budget (ABC)</div>
              <div className="stat-value">{formatCurrency(transaction?.abc)}</div>
              <div className="stat-help">Statutory Ceiling</div>
            </div>

            <div className="stat-card stat-accent">
              <div className="stat-label">Contract Awarded Amount</div>
              <div className="stat-value">
                {transaction?.awarded_amount ? formatCurrency(transaction.awarded_amount) : 'Pending'}
              </div>
              <div className="stat-help">Winning Bidder Commitment</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Calculated Procurement Savings</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {transaction?.savings !== null && transaction?.savings !== undefined
                  ? formatCurrency(transaction.savings)
                  : '—'}
              </div>
              <div className="stat-help">ABC minus Awarded Amount</div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-label">Current Statutory Stage</div>
              <div className="stat-value" style={{ fontSize: '18px' }}>
                {transaction?.current_stage}
              </div>
              <div className="stat-help">Stage {currentStageIndex + 1} of 11</div>
            </div>
          </div>

          {/* Details Card */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3>Transaction Master Record</h3>
              <StatusBadge status={transaction?.payment_status || 'not_for_billing'} />
            </div>
            <div className="gov-card-body">
              <div className="form-row">
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Control Number</div>
                  <strong>{transaction?.control_no}</strong>
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Opportunity Reference</div>
                  <strong>{opportunity?.reference_no}</strong>
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Procurement Mode</div>
                  <div>{opportunity?.procurement_type}</div>
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Budget Funding Source</div>
                  <div><strong>{budgetSource?.name || 'Not yet allocated'}</strong></div>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '16px' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Awarded Supplier</div>
                  <strong>
                    {selectedBid?.organization_name || selectedBid?.bidder_name || 'Pending Evaluation'}
                  </strong>
                  {selectedBid?.bidder_email && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {selectedBid.bidder_email} | {selectedBid.bidder_phone || 'No phone'}
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Expense Category</div>
                  <div>{transaction?.expense_category || 'General Procurement'}</div>
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Created Date &amp; Officer</div>
                  <div>
                    {transaction?.created_at ? new Date(transaction.created_at).toLocaleDateString() : '—'}
                    {transaction?.created_by_name && ` (${transaction.created_by_name})`}
                  </div>
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Payment Status</div>
                  <div>
                    <StatusBadge status={transaction?.payment_status || 'not_for_billing'} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border-light)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveTab('workflow')}
                >
                  View Workflow &amp; Advance Stage &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: WORKFLOW STAGES (11)                                         */}
      {/* =================================================================== */}
      {activeTab === 'workflow' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <div className="gov-card-header">
              <h3>Statutory 11-Stage Procurement Workflow</h3>
              <div>
                Current Stage: <span className="badge badge-selected">{currentStageName}</span>
              </div>
            </div>
            <div className="gov-card-body">
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Under R.A. 9184 and CHR internal procurement controls, transactions advance sequentially through the 11 stages. Skipping stages is disallowed to preserve administrative order and audit accountability.
              </p>

              {/* Visual 11 Stages Bar */}
              <div className="workflow-stages">
                {stages.map((st, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div
                      key={st}
                      className={`stage-pill ${isCurrent ? 'active' : isPast ? 'completed' : ''}`}
                    >
                      {isPast ? '✓ ' : `${idx + 1}. `}{st}
                    </div>
                  );
                })}
              </div>

              {/* Stage Progress Bar */}
              <div style={{ margin: '14px 0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span>Progress: {Math.round(((currentStageIndex + 1) / stages.length) * 100)}%</span>
                  <span>{currentStageIndex + 1} of {stages.length} Stages</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Advance Action Controls */}
              {nextStageName ? (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-border-medium)',
                  }}
                >
                  <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>
                    Advance to Next Stage: <span style={{ color: 'var(--color-primary)' }}>&ldquo;{nextStageName}&rdquo;</span>
                  </h4>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" htmlFor="stageRemarks">
                      Action Remarks / Notes for Audit Trail (Optional)
                    </label>
                    <input
                      id="stageRemarks"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Approved by Regional Director, Abstract signed by BAC members..."
                      value={stageRemarks}
                      onChange={(e) => setStageRemarks(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAdvanceStage}
                    disabled={advancingStage}
                  >
                    {advancingStage ? 'Advancing Stage...' : `Confirm: Advance to "${nextStageName}" \u2192`}
                  </button>
                </div>
              ) : (
                <div className="notice-box info">
                  <div>
                    🎉 <strong>Procurement Cycle Completed:</strong> This transaction has reached the final stage (Completed). All audit requirements, disbursements, and inspections have been concluded.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: DOCUMENTS CHECKLIST & UPLOADS                                */}
      {/* =================================================================== */}
      {activeTab === 'documents' && (
        <div>
          {/* Upload New Document Card */}
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <div className="gov-card-header">
              <h3>Attach Compliance Document</h3>
            </div>
            <div className="gov-card-body">
              <form onSubmit={handleUploadDocument}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: '1 1 240px' }}>
                    <label className="form-label" htmlFor="docType">
                      Document Type <span className="required">*</span>
                    </label>
                    <select
                      id="docType"
                      className="form-select"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      required
                    >
                      <option value="Purchase Request">Purchase Request (PR)</option>
                      <option value="Request for Quotation">Request for Quotation (RFQ) Pack</option>
                      <option value="Abstract of Canvass">Abstract of Canvass / Quotations</option>
                      <option value="BAC Resolution">BAC Resolution Recommending Award</option>
                      <option value="Notice of Award">Notice of Award (NOA)</option>
                      <option value="Purchase Order">Purchase Order (PO)</option>
                      <option value="Notice to Proceed">Notice to Proceed (NTP)</option>
                      <option value="Inspection & Acceptance Report">Inspection &amp; Acceptance Report (IAR)</option>
                      <option value="Disbursement Voucher">Disbursement Voucher (DV) / Billing</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label className="form-label" htmlFor="docStatus">
                      Document Verification Status
                    </label>
                    <select
                      id="docStatus"
                      className="form-select"
                      value={docStatus}
                      onChange={(e) => setDocStatus(e.target.value)}
                    >
                      <option value="complete">Complete</option>
                      <option value="verified">Verified by BAC</option>
                      <option value="pending">Pending Further Signature</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '2 1 280px' }}>
                    <label className="form-label" htmlFor="docFile">
                      Select File (PDF, JPG, PNG up to 5MB) <span className="required">*</span>
                    </label>
                    <input
                      id="docFile"
                      type="file"
                      className="form-input"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocFile(e.target.files[0] || null)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? 'Uploading...' : 'Upload & Attach Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Attached Documents Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3>Attached Transaction Documents ({documents.length})</h3>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              {documents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No documents attached to this transaction yet. Use the form above to upload compliance files.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Document Classification</th>
                        <th>Original Filename</th>
                        <th>Status</th>
                        <th>Uploaded By</th>
                        <th>Date Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td><strong>{doc.document_type}</strong></td>
                          <td>
                            <span>📄 {doc.original_name}</span>
                          </td>
                          <td>
                            <span className="badge badge-published">{doc.status || 'Complete'}</span>
                          </td>
                          <td>{doc.uploaded_by_name || 'CHR BAC Officer'}</td>
                          <td>
                            <small>
                              {doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleString('en-US')
                                : '—'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: FINANCIALS & BUDGET ALLOCATION                               */}
      {/* =================================================================== */}
      {activeTab === 'financials' && (
        <div className="gov-card">
          <div className="gov-card-header">
            <h3>Regional Financial Ledger &amp; Budget Source Assignment</h3>
          </div>
          <div className="gov-card-body">
            <form onSubmit={handleSaveFinancials}>
              <div className="form-row">
                <div className="form-group" style={{ flex: '1 1 260px' }}>
                  <label className="form-label" htmlFor="budget_source_id">
                    Budget Funding Source <span className="required">*</span>
                  </label>
                  <select
                    id="budget_source_id"
                    name="budget_source_id"
                    className="form-select"
                    value={financialForm.budget_source_id}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, budget_source_id: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Select Regional Fund Source --</option>
                    {budgetList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (FY {b.fiscal_year}) &mdash; Alloc: {formatCurrency(b.allocated_amount)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: '1 1 260px' }}>
                  <label className="form-label" htmlFor="expense_category">
                    Expense Category <span className="required">*</span>
                  </label>
                  <select
                    id="expense_category"
                    name="expense_category"
                    className="form-select"
                    value={financialForm.expense_category}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, expense_category: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Select Expense Category --</option>
                    <option value="Supplies & Materials">Supplies &amp; Materials (50203010)</option>
                    <option value="Information Technology">Information Technology (50604050)</option>
                    <option value="Services & Repairs">Services &amp; Repairs (50213050)</option>
                    <option value="Printing & Publication">Printing &amp; Publication (50299020)</option>
                    <option value="Catering & Events">Catering &amp; Venue Accommodation (50202010)</option>
                    <option value="Professional Services">Professional &amp; Consultancy (50211990)</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group" style={{ flex: '1 1 260px' }}>
                  <label className="form-label" htmlFor="awarded_amount">
                    Final Awarded Contract Amount (PHP) <span className="required">*</span>
                  </label>
                  <input
                    id="awarded_amount"
                    name="awarded_amount"
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    value={financialForm.awarded_amount}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, awarded_amount: e.target.value })
                    }
                    required
                  />
                  <small style={{ color: 'var(--color-text-subtle)' }}>
                    Approved Budget (ABC Ceiling): <strong>{formatCurrency(oppAbcNum)}</strong>
                  </small>
                </div>

                <div className="form-group" style={{ flex: '1 1 260px' }}>
                  <label className="form-label" htmlFor="payment_status">
                    Regional Payment Status
                  </label>
                  <select
                    id="payment_status"
                    name="payment_status"
                    className="form-select"
                    value={financialForm.payment_status}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, payment_status: e.target.value })
                    }
                  >
                    <option value="not_for_billing">Not Yet For Billing (In Progress)</option>
                    <option value="for_billing">For Billing (Supplier Submitted Invoice)</option>
                    <option value="processing">Processing Disbursement Voucher (DV)</option>
                    <option value="paid">Paid &amp; Check / LDDAP Issued</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Savings Card */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px 20px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: formHasNegativeSavings ? 'var(--color-danger-bg)' : 'var(--color-primary-subtle)',
                  border: `1px solid ${formHasNegativeSavings ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  Computed Procurement Savings:
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: formHasNegativeSavings ? 'var(--color-danger)' : 'var(--color-success)',
                    marginTop: '4px',
                  }}
                >
                  {formatCurrency(formCalculatedSavings)}
                </div>
                {formHasNegativeSavings && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>
                    Awarded amount cannot exceed ABC under government procurement rules!
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingFinancials || formHasNegativeSavings}
                >
                  {savingFinancials ? 'Saving Financial Data...' : 'Save Financial Commitments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: AUDIT HISTORY LOG                                            */}
      {/* =================================================================== */}
      {activeTab === 'history' && (
        <div className="gov-card">
          <div className="gov-card-header">
            <h3>Procurement Audit Trail</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Permanent Chronological Transaction Log
            </span>
          </div>
          <div className="gov-card-body">
            {history.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No history events recorded yet.
              </div>
            ) : (
              <div className="timeline-list">
                {history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-header">
                      <span>{h.performed_by_name || 'CHR Authorized Personnel'}</span>
                      <span>
                        {h.created_at ? new Date(h.created_at).toLocaleString('en-US') : '—'}
                      </span>
                    </div>
                    <div className="timeline-title">
                      {h.action_type || 'Action Recorded'}
                      {h.new_value && (
                        <span>: &ldquo;{h.new_value}&rdquo;</span>
                      )}
                    </div>
                    {h.old_value && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                        Previous state: {h.old_value}
                      </div>
                    )}
                    {h.remarks && (
                      <div className="timeline-remarks">
                        <em>Remarks:</em> {h.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
