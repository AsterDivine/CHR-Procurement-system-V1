import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createProcurement, updateProcurement, loadProcurementDetails } from '../../services/api.js';

/**
 * Creates an empty line-item template object.
 * Used by: ProcurementForm to initialize item rows and add new specification lines.
 * Connects to: Local state initialization.
 * Database table affected: Maps to procurement_items table.
 *
 * @returns {object} Blank item object.
 */
function createEmptyItem() {
  return {
    item_name: '',
    specifications: '',
    quantity: 1,
    unit: 'pcs',
    estimated_unit_cost: '',
  };
}

/**
 * ProcurementForm Component
 * Unified semantic HTML form for creating new procurement projects and editing existing ones.
 * Collects project reference, title, description, procurement mode, ABC, deadline, and
 * dynamic technical specification line items.
 * Used by: App.jsx at routes /chr/procurements/new and /chr/procurements/:id/edit.
 * Connects to: /api/procurements/create_procurement.php and /api/procurements/update_procurement.php
 * Database tables affected: Writes to 'procurements', 'procurement_items', and 'transaction_history'.
 */
export default function ProcurementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Master Form State
  const [formData, setFormData] = useState({
    reference_no: '',
    reference_number: '',
    title: '',
    description: '',
    procurement_type: 'NP-53.9 Small Value Procurement',
    procurement_mode: 'NP-53.9 Small Value Procurement',
    budget_source: 'GAA 2024 - General Administration and Support (GAS)',
    abc: '',
    deadline: '',
    status: 'Open',
  });

  // Dynamic Line Items State
  const [items, setItems] = useState([createEmptyItem()]);

  // UI state
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Loads existing procurement record when editing an existing project.
   * Connects to: /api/procurements/get_procurement.php?id=X
   * Database table affected: Reads from procurements.
   */
  useEffect(() => {
    if (isEditMode) {
      loadProcurementDetails(id)
        .then((proc) => {
          setFormData({
            reference_no: proc.reference_no || proc.reference_number || '',
            reference_number: proc.reference_no || proc.reference_number || '',
            title: proc.title || '',
            description: proc.description || '',
            procurement_type: proc.procurement_type || proc.procurement_mode || 'NP-53.9 Small Value Procurement',
            procurement_mode: proc.procurement_type || proc.procurement_mode || 'NP-53.9 Small Value Procurement',
            budget_source: proc.budget_source || 'GAA 2024',
            abc: proc.abc || '',
            deadline: proc.deadline ? proc.deadline.substring(0, 10) : '',
            status: proc.status || 'Open',
          });

          if (Array.isArray(proc.items) && proc.items.length > 0) {
            setItems(proc.items);
          }
        })
        .catch((err) => {
          setErrorMessage('Failed to load procurement: ' + err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  /**
   * Handles text and number changes for the master procurement fields.
   * Used by: Master field input elements.
   * Connects to: Local formData state.
   * Database table affected: None.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>} e
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles updates to a specific specification line item in the items array.
   * Used by: Line item table input elements.
   * Connects to: Local items state.
   * Database table affected: Maps to procurement_items.
   *
   * @param {number} index - Index of item row in array.
   * @param {string} field - Field property name (e.g. 'item_name', 'quantity').
   * @param {string|number} value - New field value.
   */
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /**
   * Appends a new blank line-item specification row to the items array.
   * Used by: "+ Add Line Item" button.
   * Connects to: Local items state.
   * Database table affected: None.
   */
  const handleAddItemRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  /**
   * Removes a line-item row from the items array.
   * Used by: "Remove" button on individual line item rows.
   * Connects to: Local items state.
   * Database table affected: None.
   *
   * @param {number} index - Index of item to remove.
   */
  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) {
      alert('Procurement must contain at least one specification line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Submits the procurement form data to the PHP backend.
   * Connects to: /api/procurements/create_procurement.php or /api/procurements/update_procurement.php
   * Database tables affected: Writes to procurements, procurement_items, and transaction_history.
   *
   * @param {React.FormEvent} e - Form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const ref = (formData.reference_no || formData.reference_number || '').trim();
      if (!ref) throw new Error('Reference Number is required.');
      if (!formData.title.trim()) throw new Error('Project Title is required.');
      if (!formData.abc || Number(formData.abc) <= 0) throw new Error('ABC must be a valid positive number.');
      if (!formData.deadline) throw new Error('Submission Deadline date is required.');

      const payload = {
        ...formData,
        reference_no: ref,
        reference_number: ref,
        procurement_type: formData.procurement_type || formData.procurement_mode || 'NP-53.9 Small Value Procurement',
        procurement_mode: formData.procurement_type || formData.procurement_mode || 'NP-53.9 Small Value Procurement',
        budget_source: formData.budget_source || 'GAA 2024 - General Administration and Support (GAS)',
        abc: Number(formData.abc),
        status: formData.status || 'Open',
        items: items.filter((item) => item.item_name && item.item_name.trim() !== ''),
      };

      if (isEditMode) {
        payload.id = id;
        await updateProcurement(payload);
        navigate(`/chr/procurements/${id}`);
      } else {
        const result = await createProcurement(payload);
        navigate(`/chr/procurements/${result.procurement_id || ''}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while saving the procurement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading procurement form...
      </div>
    );
  }

  return (
    <article aria-labelledby="form-heading">
      {/* Semantic Page Header */}
      <header className="page-header">
        <div>
          <h1 id="form-heading" className="page-title">
            {isEditMode ? `Edit Procurement: ${formData.reference_number}` : 'Create New Procurement Opportunity'}
          </h1>
          <p className="page-subtitle">
            Enter procurement specifications and Approved Budget for the Contract (ABC)
          </p>
        </div>
        <div>
          <Link to="/chr/procurements" className="btn btn-secondary btn-sm">
            &larr; Back to Procurements
          </Link>
        </div>
      </header>

      {/* Error Alert Banner */}
      {errorMessage && (
        <aside
          role="alert"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #fecaca',
            fontWeight: 500,
          }}
        >
          {errorMessage}
        </aside>
      )}

      {/* Semantic HTML5 Form with Fieldsets */}
      <form onSubmit={handleSubmit} className="gov-card">
        {/* Fieldset 1: Master Project Identification */}
        <fieldset style={{ border: 'none', padding: '20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
            1. Procurement Project Identification
          </legend>

          <div className="form-row">
            {/* Reference Number */}
            <div className="form-group">
              <label htmlFor="reference_number" className="form-label">
                Reference Number <span className="required">*</span>
              </label>
              <input
                id="reference_number"
                name="reference_number"
                type="text"
                className="form-input"
                placeholder="e.g. CHR-CAR-2024-005"
                value={formData.reference_number}
                onChange={handleInputChange}
                disabled={isEditMode}
                required
              />
              <span className="form-hint">Unique official reference tracking identifier.</span>
            </div>

            {/* Procurement Mode */}
            <div className="form-group">
              <label htmlFor="procurement_mode" className="form-label">
                Mode of Procurement <span className="required">*</span>
              </label>
              <select
                id="procurement_mode"
                name="procurement_mode"
                className="form-input"
                value={formData.procurement_mode}
                onChange={handleInputChange}
                required
              >
                <option value="NP-53.9 Small Value Procurement">NP-53.9 Small Value Procurement</option>
                <option value="NP-53.1 Two-Failed Biddings">NP-53.1 Two-Failed Biddings</option>
                <option value="Competitive Bidding (Public Bidding)">Competitive Bidding (Public Bidding)</option>
                <option value="Direct Contracting">Direct Contracting</option>
                <option value="Repeat Order">Repeat Order</option>
                <option value="Shopping (Section 52.1.b)">Shopping (Section 52.1.b)</option>
              </select>
            </div>
          </div>

          {/* Project Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Project Title / Name of Project <span className="required">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Supply and Delivery of Office Supplies for Q4 2024"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Project Detailed Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Detailed Project Scope / Purpose <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              className="form-input"
              rows={3}
              placeholder="Explain the operational purpose, target regional beneficiaries, and scope of delivery..."
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </div>
        </fieldset>

        {/* Fieldset 2: Financial Allocation & Schedule */}
        <fieldset style={{ border: 'none', padding: '20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
            2. Budget Allocation &amp; Submission Deadline
          </legend>

          <div className="form-row">
            {/* Approved Budget for the Contract (ABC) */}
            <div className="form-group">
              <label htmlFor="abc" className="form-label">
                Approved Budget for the Contract (ABC in PHP) <span className="required">*</span>
              </label>
              <input
                id="abc"
                name="abc"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="e.g. 150000.00"
                value={formData.abc}
                onChange={handleInputChange}
                required
              />
              <span className="form-hint">Authorized expenditure ceiling under Philippine procurement rules.</span>
            </div>

            {/* Submission Deadline */}
            <div className="form-group">
              <label htmlFor="deadline" className="form-label">
                Quotation Submission Deadline <span className="required">*</span>
              </label>
              <input
                id="deadline"
                name="deadline"
                type="datetime-local"
                className="form-input"
                value={formData.deadline}
                onChange={handleInputChange}
                required
              />
              <span className="form-hint">Date and time after which quotations cannot be received.</span>
            </div>
          </div>

          <div className="form-row">
            {/* Status */}
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Procurement Status
              </label>
              <select
                id="status"
                name="status"
                className="form-input"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="Open">Open (Active for supplier bidding)</option>
                <option value="For Evaluation">For Evaluation (Closed for BAC review)</option>
                <option value="Awarded">Awarded (Winning quotation selected)</option>
                <option value="In Progress">In Progress (PO / Notice to Proceed issued)</option>
                <option value="Completed">Completed (Delivered & inspected)</option>
              </select>
            </div>

            {/* Budget Source */}
            <div className="form-group">
              <label htmlFor="budget_source" className="form-label">
                Budget / Funding Source
              </label>
              <input
                id="budget_source"
                name="budget_source"
                type="text"
                className="form-input"
                placeholder="e.g. GAA 2024 - General Administration and Support (GAS)"
                value={formData.budget_source || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </fieldset>

        {/* Fieldset 3: Line Items Specification Table */}
        <fieldset style={{ border: 'none', padding: '20px' }}>
          <legend style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
            3. Technical Line-Item Specifications
          </legend>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Itemize the goods, materials, or services required for this procurement project.
          </p>

          <div className="table-responsive">
            <table className="gov-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px' }}>#</th>
                  <th scope="col" style={{ width: '25%' }}>Item Name &amp; Description *</th>
                  <th scope="col" style={{ width: '35%' }}>Technical Specifications</th>
                  <th scope="col" style={{ width: '12%' }}>Quantity *</th>
                  <th scope="col" style={{ width: '12%' }}>Unit *</th>
                  <th scope="col" style={{ width: '12%' }}>Est. Unit Cost</th>
                  <th scope="col" style={{ width: '40px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{idx + 1}</strong></td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Copy Paper A4"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                        required
                        style={{ fontSize: '12.5px', padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 80gsm, 500 sheets/ream"
                        value={item.specifications}
                        onChange={(e) => handleItemChange(idx, 'specifications', e.target.value)}
                        style={{ fontSize: '12.5px', padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                        style={{ fontSize: '12.5px', padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. reams, pcs, lots"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        required
                        style={{ fontSize: '12.5px', padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="PHP"
                        value={item.estimated_unit_cost || ''}
                        onChange={(e) => handleItemChange(idx, 'estimated_unit_cost', e.target.value)}
                        style={{ fontSize: '12.5px', padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                        title="Remove row"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="btn btn-secondary btn-sm"
            >
              + Add Line Item Row
            </button>
          </div>
        </fieldset>

        {/* Submit Actions */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link to="/chr/procurements" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving to Database...' : isEditMode ? 'Update Procurement Record' : 'Save Procurement Project'}
          </button>
        </div>
      </form>
    </article>
  );
}
