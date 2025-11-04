
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';

export default function CreditScores() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingScore, setEditingScore] = useState(null);
  const [formData, setFormData] = useState({
    score: '',
    reason: '',
    source: 'manual'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCreditScores();
  }, []);

  const fetchCreditScores = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-credit-scores', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch credit scores');

      const data = await response.json();
      setScores(data.scores || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching credit scores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (score) => {
    setEditingScore(score);
    setFormData({
      score: score.score || '',
      reason: score.score_reason || '',
      source: score.score_source || 'manual'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const scoreValue = parseInt(formData.score);
    if (isNaN(scoreValue) || scoreValue < 300 || scoreValue > 850) {
      alert('Credit score must be between 300 and 850');
      return;
    }

    if (!formData.reason.trim()) {
      alert('Please provide a reason for this score update');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/update-credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: editingScore.user_id,
          score: scoreValue,
          reason: formData.reason,
          source: formData.source
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update credit score');
      }

      alert('✅ Credit score updated successfully! User has been notified.');
      setEditingScore(null);
      setFormData({ score: '', reason: '', source: 'manual' });
      fetchCreditScores();
    } catch (err) {
      console.error('Error updating credit score:', err);
      alert('❌ Failed to update credit score: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredScores = scores.filter(score => {
    const searchLower = searchTerm.toLowerCase();
    return (
      score.user_name?.toLowerCase().includes(searchLower) ||
      score.user_email?.toLowerCase().includes(searchLower) ||
      score.score?.toString().includes(searchLower)
    );
  });

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Credit Score Management</h1>
            <p style={styles.subtitle}>Manually manage user credit scores</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchCreditScores} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <AdminBackButton useBrowserHistory={true} />
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.searchSection}>
          <input
            type="text"
            placeholder="🔍 Search by name, email, or score..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading credit scores...</p>
            </div>
          ) : filteredScores.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No credit scores found</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Credit Score</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Last Updated</th>
                  <th style={styles.th}>Updated By</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((score) => (
                  <tr key={score.id} style={styles.tableRow}>
                    <td style={styles.td}>{score.user_name || 'N/A'}</td>
                    <td style={styles.td}>{score.user_email}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.scoreBadge,
                        background: score.score >= 700 ? '#10b981' : score.score >= 600 ? '#f59e0b' : '#ef4444'
                      }}>
                        {score.score || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.sourceBadge}>
                        {score.score_source || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>{score.score_reason || 'N/A'}</td>
                    <td style={styles.td}>
                      {score.updated_at ? new Date(score.updated_at).toLocaleString() : 'N/A'}
                    </td>
                    <td style={styles.td}>{score.updated_by_email || 'System'}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleEditClick(score)}
                        style={styles.editButton}
                      >
                        ✏️ Edit Score
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editingScore && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Edit Credit Score</h2>
                <button
                  onClick={() => setEditingScore(null)}
                  style={styles.closeButton}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.userInfo}>
                  <p><strong>User:</strong> {editingScore.user_name || editingScore.user_email}</p>
                  <p><strong>Current Score:</strong> {editingScore.score || 'Not set'}</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Credit Score (300-850) <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      min="300"
                      max="850"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Source <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      style={styles.select}
                      required
                    >
                      <option value="manual">Manual</option>
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Reason for Update <span style={styles.required}>*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      style={styles.textarea}
                      rows="4"
                      placeholder="Provide a detailed reason for this credit score update..."
                      required
                    />
                  </div>

                  <div style={styles.modalActions}>
                    <button
                      type="button"
                      onClick={() => setEditingScore(null)}
                      style={styles.cancelButton}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Updating...' : 'Update Score'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  searchSection: {
    marginBottom: '24px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.2s'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#4b5563'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px'
  },
  sourceBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: '#e5e7eb',
    color: '#374151',
    fontSize: '12px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  editButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  modalBody: {
    padding: '24px'
  },
  userInfo: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  required: {
    color: '#ef4444'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white'
  },
  textarea: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px'
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    margin: '0 0 16px 0'
  },
  emptyText: {
    fontSize: '18px',
    color: '#9ca3af',
    margin: 0
  },
  errorBanner: {
    padding: '16px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fca5a5'
  }
};
