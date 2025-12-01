import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

export default function AdminWithdrawals() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionModal, setActionModal] = useState({ show: false, type: '', withdrawal: null });
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter, methodFilter, searchTerm, userFilter]);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/withdrawals/get-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAllUsers(result.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/withdrawals/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          statusFilter,
          methodFilter,
          searchTerm,
          userFilter
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch withdrawals');
      }

      setWithdrawals(result.withdrawals || []);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message || 'Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationEmail = async (withdrawal, newStatus, reason = '') => {
    try {
      const response = await fetch('/api/email/send-withdrawal-status-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: withdrawal.applications?.email,
          userName: `${withdrawal.applications?.first_name} ${withdrawal.applications?.last_name}`,
          status: newStatus,
          amount: withdrawal.amount,
          method: withdrawal.withdrawal_method,
          reference: withdrawal.reference_number,
          reason: reason
        })
      });

      if (!response.ok) {
        console.warn('Failed to send notification email:', response.statusText);
      }
    } catch (err) {
      console.error('Error sending notification email:', err);
    }
  };

  const executeAction = async () => {
    const { type, withdrawal } = actionModal;

    try {
      setLoadingBanner({
        visible: true,
        current: 1,
        total: 1,
        action: type.toUpperCase(),
        message: `${type.charAt(0).toUpperCase() + type.slice(1)}ing withdrawal...`
      });

      const { data: { session } } = await supabase.auth.getSession();

      const body = {
        withdrawalId: withdrawal.id,
        action: type,
        adminNotes: document.getElementById('admin-notes')?.value || '',
        ...(type === 'reject' && {
          rejectionReason: document.getElementById('rejection-reason')?.value || 'Not specified'
        })
      };

      const response = await fetch('/api/admin/withdrawal-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to process withdrawal');
      }

      const result = await response.json();

      // Send notification email
      await sendNotificationEmail(withdrawal, result.withdrawal.status, body.rejectionReason);

      setActionModal({ show: false, type: '', withdrawal: null });
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      await fetchWithdrawals();
      setSuccessMessage(`Withdrawal ${type}d successfully. Notification sent to user.`);
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 3000);
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setErrorMessage(err.message || 'Failed to process withdrawal.');
      setShowErrorBanner(true);
      setTimeout(() => setShowErrorBanner(false), 3000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#3b82f6',
      processing: '#06b6d4',
      completed: '#10b981',
      failed: '#ef4444',
      hold: '#f59e0b',
      cancelled: '#6b7280',
      rejected: '#ef4444',
      reversed: '#3b82f6'
    };
    return colors[status] || '#64748b';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskAccountNumber = (account) => {
    if (!account) return 'N/A';
    const str = String(account);
    return str.slice(-4).padStart(str.length, '*');
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (methodFilter !== 'all' && w.withdrawal_method !== methodFilter) return false;
    if (userFilter !== 'all' && w.user_id !== userFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWithdrawals = filteredWithdrawals.slice(startIndex, startIndex + itemsPerPage);

  const canComplete = (status) => ['approved'].includes(status);
  const canReverse = (status) => ['completed'].includes(status);
  const canHold = (status) => ['pending', 'approved'].includes(status);
  const canApprove = (status) => status === 'pending';
  const canReject = (status) => status === 'pending';

  return (
    <AdminAuth>
      <div style={styles.container}>
        {loadingBanner.visible && (
          <AdminLoadingBanner
            current={loadingBanner.current}
            total={loadingBanner.total}
            action={loadingBanner.action}
            message={loadingBanner.message}
          />
        )}

        <div style={styles.header}>
          <h1 style={styles.title}>💰 Withdrawal Management</h1>
          <p style={styles.subtitle}>Manage and approve user withdrawal requests</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p>{error}</p>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filterSection}>
          <div style={styles.filterRow}>
            <input
              type="text"
              placeholder="Search by reference, account, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{...styles.input, flex: 1}}
            />
            <button
              onClick={() => { setLoading(true); fetchWithdrawals(); }}
              style={styles.refreshButton}
              title="Refresh data"
            >
              🔄
            </button>
          </div>
          <div style={styles.filterRow}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="hold">Hold</option>
              <option value="reversed">Reversed</option>
            </select>
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} style={styles.select}>
              <option value="all">All Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="check">Check</option>
              <option value="ach">ACH</option>
            </select>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={styles.select}>
              <option value="all">All Users</option>
              {allUsers.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Withdrawals Cards */}
        <div style={styles.cardsContainer}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading withdrawals...</p>
          ) : paginatedWithdrawals.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>No withdrawals found</p>
          ) : (
            paginatedWithdrawals.map(withdrawal => (
              <div key={withdrawal.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderContent}>
                    <h3 style={styles.cardTitle}>
                      {withdrawal.applications?.first_name} {withdrawal.applications?.last_name}
                    </h3>
                    <p style={styles.cardEmail}>{withdrawal.applications?.email}</p>
                  </div>
                  <div style={{...styles.statusBadge, backgroundColor: getStatusColor(withdrawal.status)}}>
                    {withdrawal.status.toUpperCase()}
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Amount:</span>
                    <span style={styles.amount}>{formatCurrency(withdrawal.amount)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Reference:</span>
                    <span style={styles.value}>{withdrawal.reference_number}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Method:</span>
                    <span style={styles.value}>{withdrawal.withdrawal_method.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Account:</span>
                    <span style={styles.value}>{maskAccountNumber(withdrawal.accounts?.account_number)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Date:</span>
                    <span style={styles.value}>{formatDateTime(withdrawal.created_at)}</span>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  {canApprove(withdrawal.status) && (
                    <button
                      onClick={() => setActionModal({ show: true, type: 'approve', withdrawal })}
                      style={{...styles.actionButton, backgroundColor: '#3b82f6'}}
                    >
                      ✓ Approve
                    </button>
                  )}
                  {canReject(withdrawal.status) && (
                    <button
                      onClick={() => setActionModal({ show: true, type: 'reject', withdrawal })}
                      style={{...styles.actionButton, backgroundColor: '#ef4444'}}
                    >
                      ✕ Reject
                    </button>
                  )}
                  {canComplete(withdrawal.status) && (
                    <button
                      onClick={() => setActionModal({ show: true, type: 'complete', withdrawal })}
                      style={{...styles.actionButton, backgroundColor: '#10b981'}}
                    >
                      ✓ Complete
                    </button>
                  )}
                  {canHold(withdrawal.status) && (
                    <button
                      onClick={() => setActionModal({ show: true, type: 'hold', withdrawal })}
                      style={{...styles.actionButton, backgroundColor: '#f59e0b'}}
                    >
                      ⏸ Hold
                    </button>
                  )}
                  {canReverse(withdrawal.status) && (
                    <button
                      onClick={() => setActionModal({ show: true, type: 'reverse', withdrawal })}
                      style={{...styles.actionButton, backgroundColor: '#8b5cf6'}}
                    >
                      ↩️ Reverse
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              ← Previous
            </button>
            <span style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={styles.paginationButton}
            >
              Next →
            </button>
          </div>
        )}

        {/* Action Modal */}
        {actionModal.show && actionModal.withdrawal && (
          <div style={styles.modalOverlay} onClick={() => setActionModal({ show: false, type: '', withdrawal: null })}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {actionModal.type === 'approve' && '✓ Approve Withdrawal'}
                  {actionModal.type === 'reject' && '✕ Reject Withdrawal'}
                  {actionModal.type === 'complete' && '✓ Complete Withdrawal'}
                  {actionModal.type === 'hold' && '⏸ Place on Hold'}
                  {actionModal.type === 'reverse' && '↩️ Reverse Withdrawal'}
                </h2>
                <button onClick={() => setActionModal({ show: false, type: '', withdrawal: null })} style={styles.closeBtn}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.infoBox}>
                  <strong>User:</strong> {actionModal.withdrawal.applications?.first_name} {actionModal.withdrawal.applications?.last_name}<br />
                  <strong>Amount:</strong> {formatCurrency(actionModal.withdrawal.amount)}<br />
                  <strong>Reference:</strong> {actionModal.withdrawal.reference_number}
                </div>

                {(actionModal.type === 'reject') && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rejection Reason</label>
                    <textarea
                      id="rejection-reason"
                      placeholder="Provide a reason for rejection..."
                      style={styles.textarea}
                      rows={3}
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Admin Notes (Optional)</label>
                  <textarea
                    id="admin-notes"
                    placeholder="Add internal notes..."
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setActionModal({ show: false, type: '', withdrawal: null })}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  style={{...styles.confirmButton, backgroundColor: getStatusColor(actionModal.type)}}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {showSuccessBanner && (
          <div style={styles.successBanner}>
            <p>✓ {successMessage}</p>
          </div>
        )}

        {/* Error Banner */}
        {showErrorBanner && (
          <div style={styles.errorBanner}>
            <p>✕ {errorMessage}</p>
          </div>
        )}
      </div>
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '200px'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '150px'
  },
  refreshButton: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px'
  },
  cardHeaderContent: {
    flex: 1
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c'
  },
  cardEmail: {
    margin: 0,
    fontSize: '12px',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    minWidth: 'fit-content'
  },
  cardBody: {
    padding: '16px',
    flex: 1
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '13px'
  },
  label: {
    fontWeight: '600',
    color: '#64748b'
  },
  value: {
    color: '#1a202c',
    textAlign: 'right',
    flex: 1,
    marginLeft: '8px'
  },
  amount: {
    color: '#10b981',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: '8px'
  },
  cardFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  actionButton: {
    flex: '1 1 calc(50% - 4px)',
    minWidth: '90px',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px'
  },
  paginationButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#64748b'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b'
  },
  modalBody: {
    padding: '24px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontFamily: 'system-ui',
    fontSize: '14px',
    resize: 'vertical'
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bfdbfe',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#1e40af'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  successBanner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    color: '#065f46',
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '2000'
  },
  errorBanner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '2000'
  }
};
