import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminNavDropdown from '../../components/AdminNavDropdown';
import AdminStickyDropdown from '../../components/AdminStickyDropdown';
import Link from 'next/link';

export default function LoanTypes() {
  const [loanTypes, setLoanTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    default_interest_rate: '',
    min_interest_rate: '',
    max_interest_rate: '',
    min_term_months: '',
    max_term_months: '',
    min_amount: '',
    max_amount: '',
    min_credit_score: '',
    required_documents: [],
    is_active: true
  });
  const [documentInput, setDocumentInput] = useState('');

  useEffect(() => {
    fetchLoanTypes();
  }, [includeInactive]);

  const fetchLoanTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/admin/get-loan-types?includeInactive=${includeInactive}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loan types');

      const data = await response.json();
      setLoanTypes(data.loanTypes || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching loan types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loanType) => {
    setEditingType(loanType);
    setFormData({
      name: loanType.name,
      code: loanType.code,
      description: loanType.description || '',
      default_interest_rate: loanType.default_interest_rate,
      min_interest_rate: loanType.min_interest_rate,
      max_interest_rate: loanType.max_interest_rate,
      min_term_months: loanType.min_term_months,
      max_term_months: loanType.max_term_months,
      min_amount: loanType.min_amount,
      max_amount: loanType.max_amount || '',
      min_credit_score: loanType.min_credit_score || '',
      required_documents: loanType.required_documents || [],
      is_active: loanType.is_active
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      default_interest_rate: '',
      min_interest_rate: '',
      max_interest_rate: '',
      min_term_months: '12',
      max_term_months: '60',
      min_amount: '',
      max_amount: '',
      min_credit_score: '580',
      required_documents: [],
      is_active: true
    });
    setDocumentInput('');
    setShowModal(true);
  };

  const handleAddDocument = () => {
    if (documentInput.trim() && !formData.required_documents.includes(documentInput.trim())) {
      setFormData({
        ...formData,
        required_documents: [...formData.required_documents, documentInput.trim()]
      });
      setDocumentInput('');
    }
  };

  const handleRemoveDocument = (doc) => {
    setFormData({
      ...formData,
      required_documents: formData.required_documents.filter(d => d !== doc)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const payload = {
        ...formData,
        id: editingType?.id
      };

      const response = await fetch('/api/admin/save-loan-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save loan type');
      }

      setSuccess(result.message);
      setShowModal(false);
      fetchLoanTypes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error saving loan type:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/delete-loan-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to delete loan type');
      }

      setSuccess('Loan type deleted successfully');
      fetchLoanTypes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting loan type:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id, currentStatus, name) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} "${name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const loanType = loanTypes.find(lt => lt.id === id);
      const response = await fetch('/api/admin/save-loan-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...loanType,
          is_active: !currentStatus
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      setSuccess(`Loan type ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchLoanTypes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>💼 Loan Types Configuration</h1>
            <p style={styles.subtitle}>Manage loan types, interest rates, and requirements</p>
          </div>
          <AdminNavDropdown />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            <strong>Success:</strong> {success}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.toolbar}>
            <button onClick={handleAddNew} style={styles.addButton}>
              ➕ Add New Loan Type
            </button>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                style={styles.checkbox}
              />
              Show Inactive
            </label>
          </div>

          {loading && !showModal ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading loan types...</p>
            </div>
          ) : loanTypes.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>No loan types found</h3>
              <p style={styles.emptyDescription}>
                Click "Add New Loan Type" to create your first loan type configuration
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Interest Rate Range</th>
                    <th style={styles.th}>Term Range</th>
                    <th style={styles.th}>Amount Range</th>
                    <th style={styles.th}>Min Credit Score</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loanTypes.map((loanType) => (
                    <tr key={loanType.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          <strong>{loanType.name}</strong>
                          {loanType.description && (
                            <div style={styles.description}>{loanType.description}</div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.code}>{loanType.code}</code>
                      </td>
                      <td style={styles.td}>
                        <div>{loanType.min_interest_rate}% - {loanType.max_interest_rate}%</div>
                        <div style={styles.defaultRate}>Default: {loanType.default_interest_rate}%</div>
                      </td>
                      <td style={styles.td}>
                        {loanType.min_term_months} - {loanType.max_term_months} months
                      </td>
                      <td style={styles.td}>
                        ${loanType.min_amount.toLocaleString()} - 
                        {loanType.max_amount ? ` $${loanType.max_amount.toLocaleString()}` : ' No limit'}
                      </td>
                      <td style={styles.td}>
                        {loanType.min_credit_score || 'None'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          ...(loanType.is_active ? styles.statusActive : styles.statusInactive)
                        }}>
                          {loanType.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleEdit(loanType)}
                            style={styles.editButton}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => toggleActive(loanType.id, loanType.is_active, loanType.name)}
                            style={styles.toggleButton}
                            title={loanType.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {loanType.is_active ? '🔴' : '🟢'}
                          </button>
                          <button
                            onClick={() => handleDelete(loanType.id, loanType.name)}
                            style={styles.deleteButton}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingType ? 'Edit Loan Type' : 'Add New Loan Type'}
                </h2>
                <button onClick={() => setShowModal(false)} style={styles.closeButton}>✕</button>
              </div>

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Loan Type Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., Personal Loan"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., personal"
                      required
                    />
                    <small style={styles.hint}>Lowercase, no spaces (use underscores)</small>
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={styles.textarea}
                      placeholder="Brief description of this loan type"
                      rows="2"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Default Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.default_interest_rate}
                      onChange={(e) => setFormData({ ...formData, default_interest_rate: e.target.value })}
                      style={styles.input}
                      placeholder="5.50"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Min Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_interest_rate}
                      onChange={(e) => setFormData({ ...formData, min_interest_rate: e.target.value })}
                      style={styles.input}
                      placeholder="3.50"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Max Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.max_interest_rate}
                      onChange={(e) => setFormData({ ...formData, max_interest_rate: e.target.value })}
                      style={styles.input}
                      placeholder="12.00"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Min Term (months) *</label>
                    <input
                      type="number"
                      value={formData.min_term_months}
                      onChange={(e) => setFormData({ ...formData, min_term_months: e.target.value })}
                      style={styles.input}
                      placeholder="12"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Max Term (months) *</label>
                    <input
                      type="number"
                      value={formData.max_term_months}
                      onChange={(e) => setFormData({ ...formData, max_term_months: e.target.value })}
                      style={styles.input}
                      placeholder="60"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Min Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                      style={styles.input}
                      placeholder="1000"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Max Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                      style={styles.input}
                      placeholder="50000 (optional)"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Min Credit Score</label>
                    <input
                      type="number"
                      value={formData.min_credit_score}
                      onChange={(e) => setFormData({ ...formData, min_credit_score: e.target.value })}
                      style={styles.input}
                      placeholder="580 (optional)"
                      min="300"
                      max="850"
                    />
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Required Documents</label>
                    <div style={styles.documentInput}>
                      <input
                        type="text"
                        value={documentInput}
                        onChange={(e) => setDocumentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocument())}
                        style={styles.input}
                        placeholder="Add required document"
                      />
                      <button
                        type="button"
                        onClick={handleAddDocument}
                        style={styles.addDocButton}
                      >
                        Add
                      </button>
                    </div>
                    <div style={styles.documentList}>
                      {formData.required_documents.map((doc, idx) => (
                        <div key={idx} style={styles.documentTag}>
                          {doc}
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc)}
                            style={styles.removeDocButton}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        style={styles.checkbox}
                      />
                      Active (available for new loans)
                    </label>
                  </div>
                </div>

                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.saveButton}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (editingType ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={styles.bottomNav}>
          <Link href="/admin/approve-applications" style={styles.navButton}>
            <div style={styles.navIcon}>✅</div>
            <div style={styles.navText}>Approve</div>
          </Link>
          <Link href="/admin" style={styles.navButton}>
            <div style={styles.navIcon}>🏠</div>
            <div style={styles.navText}>Hub</div>
          </Link>
          <Link href="/admin/manage-accounts" style={styles.navButton}>
            <div style={styles.navIcon}>🏦</div>
            <div style={styles.navText}>Accounts</div>
          </Link>
          <Link href="/admin/admin-transactions" style={styles.navButton}>
            <div style={styles.navIcon}>💸</div>
            <div style={styles.navText}>Transactions</div>
          </Link>
          <AdminStickyDropdown />
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingBottom: '80px'
  },
  header: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  backButton: {
    display: 'inline-block',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: '500'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  errorBox: {
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#c00'
  },
  successBox: {
    background: '#efe',
    border: '1px solid #cfc',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#0a0'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '25px',
    minHeight: '400px'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  addButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666'
  },
  checkbox: {
    cursor: 'pointer'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#666'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0'
  },
  emptyDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    background: '#f8fafc',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#1e3c72',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '12px',
    color: '#334155'
  },
  nameCell: {
    minWidth: '150px'
  },
  description: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px'
  },
  code: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  defaultRate: {
    fontSize: '11px',
    color: '#667eea',
    marginTop: '4px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  statusActive: {
    background: '#d1fae5',
    color: '#065f46'
  },
  statusInactive: {
    background: '#fee2e2',
    color: '#991b1b'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    padding: '20px 25px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    background: 'white',
    zIndex: 10
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0',
    width: '30px',
    height: '30px'
  },
  form: {
    padding: '25px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e3c72'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  hint: {
    fontSize: '11px',
    color: '#64748b'
  },
  documentInput: {
    display: 'flex',
    gap: '8px'
  },
  addDocButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  documentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  documentTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#334155'
  },
  removeDocButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ef4444',
    fontSize: '14px',
    padding: '0',
    marginLeft: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1e3c72',
    fontWeight: '500'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTop: '2px solid #e2e8f0',
    padding: '6px 3px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    gap: '2px'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#1A3E6F',
    padding: '4px 2px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '70px',
    minWidth: '50px'
  },
  navIcon: {
    fontSize: '16px',
    marginBottom: '2px'
  },
  navText: {
    fontSize: '9px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1.1'
  }
};
