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

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modals and Banners
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
  }, [statusFilter, methodFilter, searchTerm, dateRange, userFilter]);

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
          dateRange,
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

  const handleApprove = (withdrawal) => {
    setActionModal({ show: true, type: 'approve', withdrawal });
  };

  const handleReject = (withdrawal) => {
    setActionModal({ show: true, type: 'reject', withdrawal });
  };

  const handleComplete = (withdrawal) => {
    setActionModal({ show: true, type: 'complete', withdrawal });
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

      setActionModal({ show: false, type: '', withdrawal: null });
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      await fetchWithdrawals();
      setSuccessMessage(`Withdrawal ${type}d successfully.`);
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

  const getStatusBadge = (status) => {
    const badgeStyles = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      approved: { bg: '#dbeafe', color: '#1e40af' },
      processing: { bg: '#e0f2fe', color: '#075985' },
      completed: { bg: '#d1fae5', color: '#065f46' },
      failed: { bg: '#fee2e2', color: '#991b1b' },
      cancelled: { bg: '#f3f4f6', color: '#6b7280' },
      rejected: { bg: '#fee2e2', color: '#991b1b' }
    };
    const style = badgeStyles[status] || badgeStyles.pending;
    return {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: style.bg,
      color: style.color,
      textTransform: 'uppercase'
    };
  };

  const getMethodBadge = (method) => {
    return {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: '#f0f9ff',
      color: '#0369a1',
      textTransform: 'capitalize'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredWithdrawals = withdrawals;
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWithdrawals = filteredWithdrawals.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminAuth>
      <div style={styles.container}>
        {/* Loading Banner */}
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

        {/* Error Message */}
        {error && (
          <div style={styles.errorBox}>
            <p>{error}</p>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filterSection}>
          <div style={styles.filterControls}>
            <input
              type="text"
              placeholder="Search by reference, account, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={() => { setLoading(true); fetchWithdrawals(); }}
              style={styles.refreshButton}
              title="Refresh data"
            >
              🔄 Refresh
            </button>
          </div>
          <div style={styles.filterGrid}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="check">Check</option>
              <option value="ach">ACH</option>
            </select>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Users</option>
              {allUsers.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableWrapper}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading withdrawals...</p>
          ) : paginatedWithdrawals.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>No withdrawals found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Reference</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.refNumber}>{withdrawal.reference_number}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.userName}>
                          {withdrawal.applications?.first_name} {withdrawal.applications?.last_name}
                        </div>
                        <div style={styles.userEmail}>{withdrawal.applications?.email}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '600', color: '#065f46' }}>
                        {formatCurrency(withdrawal.amount)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={getMethodBadge(withdrawal.withdrawal_method)}>
                        {withdrawal.withdrawal_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={getStatusBadge(withdrawal.status)}>
                        {withdrawal.status}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(withdrawal.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(withdrawal)}
                              style={{ ...styles.button, background: '#10b981' }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(withdrawal)}
                              style={{ ...styles.button, background: '#ef4444' }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {withdrawal.status === 'approved' && (
                          <button
                            onClick={() => handleComplete(withdrawal)}
                            style={{ ...styles.button, background: '#3b82f6' }}
                          >
                            ✓ Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              ← Previous
            </button>
            <span style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
                  {actionModal.type === 'approve' ? '✓ Approve' : actionModal.type === 'reject' ? '✕ Reject' : '✓ Complete'} Withdrawal
                </h2>
                <button
                  onClick={() => setActionModal({ show: false, type: '', withdrawal: null })}
                  style={styles.closeBtn}
                >
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                <p><strong>Reference:</strong> {actionModal.withdrawal.reference_number}</p>
                <p><strong>User:</strong> {actionModal.withdrawal.applications?.first_name} {actionModal.withdrawal.applications?.last_name}</p>
                <p><strong>Amount:</strong> {formatCurrency(actionModal.withdrawal.amount)}</p>
                <p><strong>Method:</strong> {actionModal.withdrawal.withdrawal_method}</p>
                <p><strong>Status:</strong> {actionModal.withdrawal.status}</p>

                {actionModal.type === 'reject' && (
                  <div style={{ marginTop: '20px' }}>
                    <label style={styles.label}>Rejection Reason *</label>
                    <textarea
                      id="rejection-reason"
                      style={styles.textarea}
                      rows={3}
                      placeholder="Enter reason for rejection..."
                      required
                    />
                  </div>
                )}

                <div style={{ marginTop: '20px' }}>
                  <label style={styles.label}>Admin Notes (Optional)</label>
                  <textarea
                    id="admin-notes"
                    style={styles.textarea}
                    rows={2}
                    placeholder="Additional notes..."
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
                  style={{
                    ...styles.confirmButton,
                    background: actionModal.type === 'approve' ? '#10b981' : actionModal.type === 'reject' ? '#ef4444' : '#3b82f6'
                  }}
                >
                  {actionModal.type === 'approve' ? 'Approve' : actionModal.type === 'reject' ? 'Reject' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {showSuccessBanner && (
          <div style={styles.successBannerOverlay}>
            <div style={styles.successBannerContainer}>
              <div style={styles.successBannerHeader}>
                <span style={styles.successBannerLogo}>Notification</span>
                <div style={styles.successBannerActions}>
                  <button onClick={() => setShowSuccessBanner(false)} style={styles.successBannerClose}>✕</button>
                </div>
              </div>
              <div style={styles.successBannerContent}>
                <p style={styles.successBannerAction}>Success!</p>
                <p style={styles.successBannerMessage}>{successMessage}</p>
              </div>
              <div style={styles.successBannerFooter}>
                <span style={styles.successBannerCheckmark}>✓ Action completed</span>
                <button onClick={() => setShowSuccessBanner(false)} style={styles.successBannerOkButton}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {showErrorBanner && (
          <div style={styles.errorBannerOverlay}>
            <div style={styles.errorBannerContainer}>
              <div style={styles.errorBannerHeader}>
                <span style={styles.errorBannerLogo}>Error</span>
                <div style={styles.errorBannerActions}>
                  <button onClick={() => setShowErrorBanner(false)} style={styles.errorBannerClose}>✕</button>
                </div>
              </div>
              <div style={styles.errorBannerContent}>
                <p style={styles.errorBannerAction}>Oops!</p>
                <p style={styles.errorBannerMessage}>{errorMessage}</p>
              </div>
              <div style={styles.errorBannerFooter}>
                <span style={styles.errorBannerWarning}>⚠️ An error occurred</span>
                <button onClick={() => setShowErrorBanner(false)} style={styles.errorBannerOkButton}>OK</button>
              </div>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c'
  },
  subtitle: {
    margin: '0',
    fontSize: '14px',
    color: '#718096'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #dc2626'
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filterControls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  refreshButton: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'system-ui'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'system-ui'
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  thead: {
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    borderBottom: '1px solid #e2e8f0'
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#475569'
  },
  refNumber: {
    fontWeight: '600',
    color: '#0f172a'
  },
  userName: {
    fontWeight: '600',
    color: '#0f172a'
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  button: {
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
    padding: '8px 12px',
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
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a'
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
  successBannerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2000'
  },
  successBannerContainer: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
  },
  successBannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #dcfce7'
  },
  successBannerLogo: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#16a34a'
  },
  successBannerActions: {
    display: 'flex',
    gap: '8px'
  },
  successBannerClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#16a34a'
  },
  successBannerContent: {
    padding: '16px 20px'
  },
  successBannerAction: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#15803d'
  },
  successBannerMessage: {
    margin: '0',
    fontSize: '14px',
    color: '#16a34a'
  },
  successBannerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderTop: '1px solid #dcfce7',
    backgroundColor: '#f9fdf7'
  },
  successBannerCheckmark: {
    fontSize: '13px',
    color: '#16a34a',
    fontWeight: '500'
  },
  successBannerOkButton: {
    padding: '6px 16px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  errorBannerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2000'
  },
  errorBannerContainer: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
  },
  errorBannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #fee2e2'
  },
  errorBannerLogo: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#dc2626'
  },
  errorBannerActions: {
    display: 'flex',
    gap: '8px'
  },
  errorBannerClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#dc2626'
  },
  errorBannerContent: {
    padding: '16px 20px'
  },
  errorBannerAction: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#991b1b'
  },
  errorBannerMessage: {
    margin: '0',
    fontSize: '14px',
    color: '#dc2626'
  },
  errorBannerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderTop: '1px solid #fee2e2',
    backgroundColor: '#fdf7f7'
  },
  errorBannerWarning: {
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '500'
  },
  errorBannerOkButton: {
    padding: '6px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
