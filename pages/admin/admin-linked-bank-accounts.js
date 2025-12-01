import { useState, useEffect } from 'react';
import AdminAuth from '../../components/AdminAuth';
import AdminBackButton from '../../components/AdminBackButton';
import Link from 'next/link';

export default function LinkedBankAccountsReview() {
  const [accounts, setAccounts] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, [activeTab, searchTerm]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        search: searchTerm
      });

      const response = await fetch(`/api/admin/linked-bank-accounts?${params}`);
      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts);
        setStatistics(data.statistics);
      } else {
        setError('Failed to fetch accounts');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setShowDetailModal(true);
    setRejectionReason('');
  };

  const handleAction = async (action, accountId = null) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(accountId || (selectedAccount && selectedAccount.id));

    try {
      const response = await fetch('/api/admin/linked-bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId || (selectedAccount ? selectedAccount.id : null),
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        const actionText = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : action === 'delete' ? 'deleted' : action === 'suspend' ? 'suspended' : action === 'reactivate' ? 'reactivated' : 'processed';
        setSuccessMessage(`Bank account ${actionText} successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
        setShowDetailModal(false);
        setShowDeleteConfirm(null);
        fetchAccounts();
      } else {
        alert(data.error || `Failed to ${action} account`);
      }
    } catch (error) {
      console.error(`Error processing account (${action}):`, error);
      alert(`Error processing account. Please try again.`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleExpanded = (accountId) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesTab = activeTab === 'all' || account.status === activeTab;
    const matchesSearch = account.account_holder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.account_number?.slice(-4).includes(searchTerm) ||
                         account.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: statistics.total || 0,
    pending: statistics.pending || 0,
    active: statistics.active || 0,
    rejected: statistics.rejected || 0
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      active: { backgroundColor: '#d1fae5', color: '#065f46' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
      suspended: { backgroundColor: '#fef3c7', color: '#92400e' }
    };
    return statusStyles[status] || statusStyles.pending;
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <AdminBackButton />
            <h1 style={styles.title}>🏦 Linked Bank Account Review System</h1>
            <p style={styles.subtitle}>Review and approve user-submitted linked bank accounts with verification</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchAccounts} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Accounts</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Review</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Verified</h3>
            <p style={styles.statValue}>{stats.active}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Rejected</h3>
            <p style={styles.statValue}>{stats.rejected}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'active', 'rejected', 'suspended'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by holder name, bank, email, or last 4 digits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Accounts Grid */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No linked bank accounts found</p>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {filteredAccounts.map((account) => (
                <div key={account.id} style={styles.cardItem}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.accountholderName}>{account.account_holder_name}</h3>
                      <p style={styles.userEmail}>{account.users?.email || 'No email'}</p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        account.status === 'pending' ? '#fef3c7' :
                        account.status === 'active' ? '#d1fae5' :
                        account.status === 'suspended' ? '#fef3c7' :
                        account.status === 'deleted' ? '#fee2e2' : '#f3f4f6',
                      color:
                        account.status === 'pending' ? '#92400e' :
                        account.status === 'active' ? '#065f46' :
                        account.status === 'suspended' ? '#92400e' :
                        account.status === 'deleted' ? '#991b1b' : '#4b5563'
                    }}>
                      {account.status === 'pending' && '⏳'}
                      {account.status === 'active' && '✅'}
                      {account.status === 'suspended' && '⏸️'}
                      {account.status === 'deleted' && '❌'}
                      {' '}{account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                    </span>
                  </div>

                  {/* Bank Account Display */}
                  <div style={styles.bankCard}>
                    <div style={styles.bankLogo}>{account.bank_name.charAt(0).toUpperCase()}</div>
                    <div style={styles.bankInfo}>
                      <div style={styles.bankName}>{account.bank_name}</div>
                      <div style={styles.accountNumber}>•••• •••• •••• {account.account_number.slice(-4)}</div>
                    </div>
                    <div style={styles.accountType}>{account.account_type === 'checking' ? '💳' : '💰'} {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}</div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Routing Number:</span>
                      <span style={styles.infoValue}>{account.routing_number}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Account Type:</span>
                      <span style={styles.infoValue}>{account.account_type}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Verified:</span>
                      <span style={styles.infoValue}>{account.is_verified ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Submitted:</span>
                      <span style={styles.infoValue}>{new Date(account.created_at).toLocaleDateString()}</span>
                    </div>

                    {expandedAccount === account.id && (
                      <div style={styles.expandedDetails}>
                        <div style={styles.detailsGrid}>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>User Name:</span>
                            <span style={styles.detailValue}>
                              {account.users?.profiles?.first_name} {account.users?.profiles?.last_name}
                            </span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Phone:</span>
                            <span style={styles.detailValue}>{account.users?.profiles?.phone || 'N/A'}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Bank Address:</span>
                            <span style={styles.detailValue}>{account.bank_address || 'Not provided'}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Primary Account:</span>
                            <span style={styles.detailValue}>{account.is_primary ? '✅ Yes' : '❌ No'}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>IBAN:</span>
                            <span style={styles.detailValue}>{account.iban || 'Not provided'}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>SWIFT Code:</span>
                            <span style={styles.detailValue}>{account.swift_code || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleExpanded(account.id)}
                      style={styles.detailsButton}
                    >
                      {expandedAccount === account.id ? '⬆️ Hide' : '⬇️ Show'} Details
                    </button>
                    <button
                      onClick={() => handleViewDetails(account)}
                      style={styles.viewFullButton}
                    >
                      👁️ Full Review
                    </button>
                    {account.status === 'pending' && (
                      <button
                        onClick={() => {
                          setProcessing(account.id);
                          handleAction('approve', account.id);
                        }}
                        disabled={processing === account.id}
                        style={{
                          ...styles.approveButton,
                          opacity: processing === account.id ? 0.7 : 1,
                          cursor: processing === account.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {processing === account.id ? '⏳ Processing...' : '✅ Verify'}
                      </button>
                    )}
                    {account.status === 'active' && (
                      <>
                        <button
                          onClick={() => {
                            setProcessing(account.id);
                            handleAction('suspend', account.id);
                          }}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#f59e0b',
                            marginLeft: '8px',
                            opacity: processing === account.id ? 0.7 : 1,
                            cursor: processing === account.id ? 'not-allowed' : 'pointer'
                          }}
                          disabled={processing === account.id}
                        >
                          {processing === account.id ? '⏳ Suspending...' : '⏸️ Suspend'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
                              setProcessing(account.id);
                              handleAction('delete', account.id);
                            }
                          }}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#dc2626',
                            marginLeft: '8px',
                            opacity: processing === account.id ? 0.7 : 1,
                            cursor: processing === account.id ? 'not-allowed' : 'pointer'
                          }}
                          disabled={processing === account.id}
                        >
                          {processing === account.id ? '⏳ Deleting...' : '🗑️ Delete'}
                        </button>
                      </>
                    )}

                    {account.status === 'suspended' && (
                      <button
                        onClick={() => {
                          setProcessing(account.id);
                          handleAction('reactivate', account.id);
                        }}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#10b981',
                          marginLeft: '8px',
                          opacity: processing === account.id ? 0.7 : 1,
                          cursor: processing === account.id ? 'not-allowed' : 'pointer'
                        }}
                        disabled={processing === account.id}
                      >
                        {processing === account.id ? '⏳ Reactivating...' : '✅ Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedAccount && (
          <div style={styles.modalOverlay} onClick={() => { if (!processing) setShowDetailModal(false); }}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>🏦 Bank Account Review - Full Details</h2>
                <button onClick={() => { if (!processing) setShowDetailModal(false); }} style={styles.closeButton} disabled={processing === selectedAccount.id}>×</button>
              </div>

              <div style={styles.modalBody}>
                {/* User Info */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>👤 User Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Name:</strong> {selectedAccount.users?.profiles?.first_name} {selectedAccount.users?.profiles?.last_name}</div>
                    <div><strong>Email:</strong> {selectedAccount.users?.email}</div>
                    <div><strong>Phone:</strong> {selectedAccount.users?.profiles?.phone || 'N/A'}</div>
                  </div>
                </div>

                {/* Bank Account Information */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🏦 Complete Bank Account Information</h3>
                  <div style={styles.infoGrid}>
                    <div><strong>Account Holder Name:</strong> {selectedAccount.account_holder_name}</div>
                    <div><strong>Bank Name:</strong> {selectedAccount.bank_name || 'Not provided'}</div>
                    <div><strong>Account Number:</strong> ****{selectedAccount.account_number.slice(-4)}</div>
                    <div><strong>Routing Number:</strong> {selectedAccount.routing_number}</div>
                    <div><strong>Account Type:</strong> {selectedAccount.account_type}</div>
                    <div><strong>Primary Account:</strong> {selectedAccount.is_primary ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>Verified:</strong> {selectedAccount.is_verified ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>Status:</strong> {selectedAccount.status}</div>
                  </div>
                </div>

                {/* International Details */}
                {(selectedAccount.iban || selectedAccount.swift_code) && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>🌍 International Banking Details</h3>
                    <div style={styles.infoGrid}>
                      {selectedAccount.iban && <div><strong>IBAN:</strong> {selectedAccount.iban}</div>}
                      {selectedAccount.swift_code && <div><strong>SWIFT Code:</strong> {selectedAccount.swift_code}</div>}
                      {selectedAccount.bank_address && <div><strong>Bank Address:</strong> {selectedAccount.bank_address}</div>}
                    </div>
                  </div>
                )}

                {/* Verification Status */}
                {selectedAccount.verification_deposits_sent_at && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>✅ Verification Status</h3>
                    <div style={styles.infoGrid}>
                      <div><strong>Deposits Sent:</strong> {new Date(selectedAccount.verification_deposits_sent_at).toLocaleDateString()}</div>
                      {selectedAccount.verification_amount_1 && <div><strong>First Deposit:</strong> ${parseFloat(selectedAccount.verification_amount_1).toFixed(2)}</div>}
                      {selectedAccount.verification_amount_2 && <div><strong>Second Deposit:</strong> ${parseFloat(selectedAccount.verification_amount_2).toFixed(2)}</div>}
                      {selectedAccount.verified_at && <div><strong>Verified At:</strong> {new Date(selectedAccount.verified_at).toLocaleDateString()}</div>}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedAccount.status === 'pending' && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>❌ Rejection Reason (if rejecting)</h3>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      style={styles.selectInput}
                      disabled={processing === selectedAccount.id}
                    >
                      <option value="">Select a reason...</option>
                      <option value="Account information is incomplete">Account information is incomplete</option>
                      <option value="Routing number format is invalid">Routing number format is invalid</option>
                      <option value="Bank verification failed">Bank verification failed</option>
                      <option value="Account holder name does not match">Account holder name does not match</option>
                      <option value="Suspicious account activity detected">Suspicious account activity detected</option>
                      <option value="Account does not exist at specified bank">Account does not exist at specified bank</option>
                      <option value="Other verification failure">Other verification failure</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={styles.modalFooter}>
                <button
                  onClick={() => { if (!processing) setShowDetailModal(false); }}
                  style={styles.cancelButton}
                  disabled={processing === selectedAccount.id}
                >
                  Close
                </button>
                {selectedAccount.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={processing === selectedAccount.id}
                      style={{
                        ...styles.modalApproveButton,
                        opacity: processing === selectedAccount.id ? 0.7 : 1,
                        cursor: processing === selectedAccount.id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processing === selectedAccount.id ? '⏳ Processing...' : '✅ Verify Account'}
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={processing === selectedAccount.id || !rejectionReason.trim()}
                      style={{
                        ...styles.modalRejectButton,
                        opacity: (processing === selectedAccount.id || !rejectionReason.trim()) ? 0.7 : 1,
                        cursor: (processing === selectedAccount.id || !rejectionReason.trim()) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processing === selectedAccount.id ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                  </>
                )}
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
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    gap: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
    margin: '0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '0',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  refreshButton: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  backButton: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#6b7280',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
  },
  filtersSection: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  tableContainer: {
    marginBottom: '40px',
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '8px 0 0 0',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  cardItem: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountholderName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  bankCard: {
    margin: '16px',
    padding: '16px',
    backgroundColor: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '8px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  bankLogo: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  accountNumber: {
    fontSize: '13px',
    opacity: 0.9,
  },
  accountType: {
    fontSize: '12px',
    fontWeight: '600',
  },
  cardBody: {
    padding: '16px',
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    color: '#1f2937',
    textAlign: 'right',
  },
  expandedDetails: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  detailItem: {
    fontSize: '12px',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#6b7280',
    display: 'block',
    marginBottom: '2px',
  },
  detailValue: {
    color: '#1f2937',
  },
  cardFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #f3f4f6',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  detailsButton: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '80px',
  },
  viewFullButton: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#8b5cf6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '80px',
  },
  approveButton: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '80px',
  },
  actionButton: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    flex: '1',
    minWidth: '80px',
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
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  closeButton: {
    fontSize: '24px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#6b7280',
  },
  modalBody: {
    padding: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    fontSize: '13px',
  },
  selectInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  modalFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  modalApproveButton: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  modalRejectButton: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  successBanner: {
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
};
