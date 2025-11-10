import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function ManageAccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processing, setProcessing] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    fetchAccountRequests();
  }, [filterStatus]);

  const fetchAccountRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const url = filterStatus 
        ? `/api/admin/account-requests?status=${filterStatus}`
        : '/api/admin/account-requests';
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch account requests');
      }

      setRequests(result.data || []);
    } catch (error) {
      console.error('Error fetching account requests:', error);
      setError('Failed to load account requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (!confirm(`Approve ${request.user_name}'s request for ${request.account_type_name}?`)) {
      return;
    }

    setProcessing(request.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          action: 'approve',
          admin_id: null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve request');
      }

      setSuccessMessage(`Successfully approved ${request.user_name}'s request. Account and card created.`);
      await fetchAccountRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setProcessing(selectedRequest.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          action: 'reject',
          rejection_reason: rejectionReason,
          admin_id: null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject request');
      }

      setSuccessMessage(`Request rejected. User has been notified.`);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchAccountRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Failed to reject request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badgeStyles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' },
      approved: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' }
    };

    return (
      <span style={{ ...styles.badge, ...badgeStyles[status] }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📋 Account Requests</h1>
            <p style={styles.subtitle}>Manage additional account requests from existing users</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchAccountRequests} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Filter by status:</label>
          <div style={styles.filterButtons}>
            <button
              onClick={() => setFilterStatus('pending')}
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'pending' ? styles.filterButtonActive : {})
              }}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'approved' ? styles.filterButtonActive : {})
              }}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'rejected' ? styles.filterButtonActive : {})
              }}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus('')}
              style={{
                ...styles.filterButton,
                ...(filterStatus === '' ? styles.filterButtonActive : {})
              }}
            >
              All
            </button>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        <div style={styles.content}>
          {loading && <p style={styles.loadingText}>Loading account requests...</p>}

          {!loading && requests.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateIcon}>📭</p>
              <p style={styles.emptyStateText}>
                {filterStatus ? `No ${filterStatus} requests found` : 'No account requests found'}
              </p>
            </div>
          )}

          {!loading && requests.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Account Type</th>
                    <th style={styles.th}>Request Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>{request.user_name}</div>
                          <div style={styles.userEmail}>{request.user_email}</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.accountType}>
                          {request.account_type?.icon && (
                            <span style={{ marginRight: '8px' }}>{request.account_type.icon}</span>
                          )}
                          {request.account_type_name}
                        </div>
                        {request.account_type?.min_deposit > 0 && (
                          <div style={styles.minDeposit}>
                            Min. deposit: ${request.account_type.min_deposit}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {new Date(request.request_date || request.created_at).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        {getStatusBadge(request.status)}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <div style={styles.rejectionReason}>
                            Reason: {request.rejection_reason}
                          </div>
                        )}
                        {request.status === 'approved' && request.reviewed_date && (
                          <div style={styles.reviewDate}>
                            Approved: {new Date(request.reviewed_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {request.status === 'pending' && (
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => handleApprove(request)}
                              style={styles.approveButton}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? '⏳' : '✓'} Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              style={styles.rejectButton}
                              disabled={processing === request.id}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <span style={styles.processedText}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showRejectModal && (
          <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Reject Account Request</h2>
              <p style={styles.modalText}>
                User: <strong>{selectedRequest?.user_name}</strong><br />
                Account Type: <strong>{selectedRequest?.account_type_name}</strong>
              </p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={styles.textarea}
                  placeholder="Provide a clear explanation for the rejection..."
                  rows={4}
                />
              </div>
              <div style={styles.modalActions}>
                <button
                  onClick={handleReject}
                  style={styles.confirmRejectButton}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  style={styles.cancelButton}
                  disabled={processing}
                >
                  Cancel
                </button>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  refreshButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '10px',
    display: 'block',
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyStateIcon: {
    fontSize: '64px',
    margin: '0 0 16px 0',
  },
  emptyStateText: {
    fontSize: '18px',
    color: '#6b7280',
    margin: 0,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '16px 12px',
    fontSize: '14px',
    color: '#1f2937',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userName: {
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: '12px',
    color: '#6b7280',
  },
  accountType: {
    fontWeight: '500',
    color: '#111827',
  },
  minDeposit: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  rejectionReason: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  approveButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  processedText: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '16px',
  },
  modalText: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  confirmRejectButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};
