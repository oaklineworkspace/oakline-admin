import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function LinkedBankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [statistics, setStatistics] = useState({ total: 0, pending: 0, active: 0, rejected: 0 });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/linked-bank-accounts?${params.toString()}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      setAccounts(data.accounts || []);
      setStatistics(data.statistics || { total: 0, pending: 0, active: 0, rejected: 0 });
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [filter]);

  const handleAction = async (accountId, action, reason = null) => {
    setActionLoading(prev => ({ ...prev, [accountId]: action }));
    setError('');
    setSuccess('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/linked-bank-accounts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ account_id: accountId, action, rejection_reason: reason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform action');
      }

      setSuccess(`Account ${action}ed successfully`);
      fetchAccounts();
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedAccount(null);
    } catch (err) {
      console.error('Error performing action:', err);
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [accountId]: null }));
    }
  };

  const openRejectModal = (account) => {
    setSelectedAccount(account);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAccounts();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskAccountNumber = (num) => {
    if (!num) return 'N/A';
    return '****' + num.slice(-4);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
      active: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      suspended: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      deleted: { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }
    };
    return (
      <span style={{
        ...styles[status] || styles.pending,
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Link href="/admin" style={styles.backLink}>← Back to Admin</Link>
            <h1 style={styles.title}>🔗 Linked Bank Accounts</h1>
            <p style={styles.subtitle}>Manage user external bank account connections</p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{statistics.total}</div>
            <div style={styles.statLabel}>Total Accounts</div>
          </div>
          <div style={{ ...styles.statCard, borderColor: '#fcd34d' }}>
            <div style={{ ...styles.statValue, color: '#92400e' }}>{statistics.pending}</div>
            <div style={styles.statLabel}>Pending Review</div>
          </div>
          <div style={{ ...styles.statCard, borderColor: '#6ee7b7' }}>
            <div style={{ ...styles.statValue, color: '#065f46' }}>{statistics.active}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={{ ...styles.statCard, borderColor: '#fca5a5' }}>
            <div style={{ ...styles.statValue, color: '#991b1b' }}>{statistics.rejected}</div>
            <div style={styles.statLabel}>Rejected/Deleted</div>
          </div>
        </div>

        <div style={styles.filterSection}>
          <div style={styles.tabs}>
            {['all', 'pending', 'active', 'suspended', 'deleted'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  ...styles.tab,
                  ...(filter === tab ? styles.activeTab : {})
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              placeholder="Search by name, email, bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchButton}>Search</button>
          </form>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🔗</p>
            <p style={styles.emptyText}>No linked bank accounts found</p>
            <p style={styles.emptySubtext}>Accounts will appear here when users link their external banks</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Bank Details</th>
                  <th style={styles.th}>Account Info</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>
                          {account.users?.profiles?.first_name || ''} {account.users?.profiles?.last_name || 'Unknown'}
                        </div>
                        <div style={styles.userEmail}>{account.users?.email || 'No email'}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.bankInfo}>
                        <div style={styles.bankName}>{account.bank_name || 'N/A'}</div>
                        <div style={styles.bankDetail}>Holder: {account.account_holder_name || 'N/A'}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.accountInfo}>
                        <div>Account: {maskAccountNumber(account.account_number)}</div>
                        <div style={styles.accountType}>{account.account_type || 'checking'}</div>
                        {account.routing_number && <div style={styles.routingNum}>Routing: {account.routing_number}</div>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {getStatusBadge(account.status)}
                      {account.is_primary && (
                        <span style={styles.primaryBadge}>Primary</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.dateInfo}>
                        {formatDate(account.created_at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {account.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(account.id, 'approve')}
                              disabled={actionLoading[account.id]}
                              style={styles.approveBtn}
                            >
                              {actionLoading[account.id] === 'approve' ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => openRejectModal(account)}
                              disabled={actionLoading[account.id]}
                              style={styles.rejectBtn}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {account.status === 'active' && (
                          <button
                            onClick={() => handleAction(account.id, 'suspend')}
                            disabled={actionLoading[account.id]}
                            style={styles.suspendBtn}
                          >
                            {actionLoading[account.id] === 'suspend' ? '...' : 'Suspend'}
                          </button>
                        )}
                        {account.status === 'suspended' && (
                          <button
                            onClick={() => handleAction(account.id, 'reactivate')}
                            disabled={actionLoading[account.id]}
                            style={styles.approveBtn}
                          >
                            {actionLoading[account.id] === 'reactivate' ? '...' : 'Reactivate'}
                          </button>
                        )}
                        {account.status !== 'deleted' && (
                          <button
                            onClick={() => handleAction(account.id, 'delete')}
                            disabled={actionLoading[account.id]}
                            style={styles.deleteBtn}
                          >
                            {actionLoading[account.id] === 'delete' ? '...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showRejectModal && selectedAccount && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Reject Bank Account</h3>
              <p style={styles.modalText}>
                Rejecting account for: <strong>{selectedAccount.account_holder_name}</strong>
              </p>
              <textarea
                placeholder="Enter rejection reason (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={styles.textarea}
              />
              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedAccount(null);
                    setRejectionReason('');
                  }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(selectedAccount.id, 'reject', rejectionReason)}
                  disabled={actionLoading[selectedAccount.id]}
                  style={styles.confirmRejectBtn}
                >
                  {actionLoading[selectedAccount.id] === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
                </button>
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
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    marginBottom: '24px'
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },
  filterSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  },
  searchForm: {
    display: 'flex',
    gap: '8px'
  },
  searchInput: {
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '250px'
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fca5a5'
  },
  successAlert: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #6ee7b7'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 16px'
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px'
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb'
  },
  tr: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '16px',
    verticalAlign: 'top'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  userName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  bankInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  bankName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  bankDetail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px'
  },
  accountType: {
    textTransform: 'capitalize',
    color: '#6b7280',
    fontSize: '13px'
  },
  routingNum: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  primaryBadge: {
    display: 'inline-block',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: '600',
    marginLeft: '8px'
  },
  dateInfo: {
    fontSize: '13px',
    color: '#6b7280'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  approveBtn: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  rejectBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  suspendBtn: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
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
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 12px'
  },
  modalText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    marginBottom: '16px',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  confirmRejectBtn: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
};
