
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';

export default function ApproveAccounts() {
  const [error, setError] = useState('');
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPendingAccounts();
  }, []);

  const fetchPendingAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both 'approve' and 'approved' status accounts
      const [approveResponse, approvedResponse] = await Promise.all([
        fetch('/api/admin/get-accounts?status=approve'),
        fetch('/api/admin/get-accounts?status=approved')
      ]);

      const [approveResult, approvedResult] = await Promise.all([
        approveResponse.json(),
        approvedResponse.json()
      ]);

      const errors = [];
      if (!approveResponse.ok) {
        console.error('Failed to fetch "approve" status accounts:', approveResult.error);
        errors.push('"approve" status accounts');
      }
      if (!approvedResponse.ok) {
        console.error('Failed to fetch "approved" status accounts:', approvedResult.error);
        errors.push('"approved" status accounts');
      }

      if (errors.length > 0) {
        setError(`Warning: Failed to fetch ${errors.join(' and ')}. Showing partial results.`);
      }

      const approveAccounts = approveResponse.ok ? (approveResult.accounts || []) : [];
      const approvedAccounts = approvedResponse.ok ? (approvedResult.accounts || []) : [];
      
      const allAccounts = [...approveAccounts, ...approvedAccounts];
      
      allAccounts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setPendingAccounts(allAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountStatus = async (accountId, accountNumber, newStatus, actionName) => {
    setProcessing(accountId);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${actionName} account`);
      }

      const statusEmojis = {
        active: '✅',
        suspended: '⏸️',
        closed: '🔒',
        rejected: '❌'
      };

      setMessage(`${statusEmojis[newStatus]} Account ${accountNumber} has been ${actionName} successfully!`);
      setTimeout(() => setMessage(''), 5000);

      await fetchPendingAccounts();
    } catch (error) {
      console.error(`Error ${actionName} account:`, error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const activateAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'active', 'activated');
  };

  const suspendAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'suspended', 'suspended');
  };

  const closeAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'closed', 'closed');
  };

  const rejectAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'rejected', 'rejected');
  };

  const handleLogout = async () => {
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      await supabase.auth.signOut();
      router.push('/admin');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.headerContent}>
              <h1 style={styles.title}>✅ Activate Approved Accounts</h1>
              <p style={styles.subtitle}>Activate accounts that have been approved</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchPendingAccounts} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {message && (
          <div style={styles.successMessage}>{message}</div>
        )}
        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        <div style={styles.accountsSection}>
          <h2 style={styles.sectionTitle}>
            Approved Accounts Ready for Activation ({pendingAccounts.length})
          </h2>
          <p style={{color: '#64748b', fontSize: '14px', marginBottom: '20px'}}>
            💡 These accounts have been approved and are ready to be activated. Click "Activate" to change the status to "active" and enable full account access.
          </p>

          {loading ? (
            <div style={styles.loading}>Loading pending accounts...</div>
          ) : pendingAccounts.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No Approved Accounts Waiting</h3>
              <p>All approved accounts have been activated. Check the "Approve Applications" page for pending applications.</p>
            </div>
          ) : (
            <div style={styles.accountsGrid}>
              {pendingAccounts.map(account => (
                <div key={account.id} style={styles.accountCard}>
                  <div style={styles.accountHeader}>
                    <div style={styles.accountInfo}>
                      <h3 style={styles.accountNumber}>Account: {account.account_number}</h3>
                      <span style={styles.accountType}>{account.account_type?.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: account.status === 'approved' ? '#f59e0b' : '#8b5cf6'
                    }}>
                      {account.status?.toUpperCase()}
                    </div>
                  </div>

                  <div style={styles.accountDetails}>
                    {account.applications && (
                      <>
                        <div style={styles.detail}>
                          <span style={styles.detailLabel}>Name:</span>
                          <span style={styles.detailValue}>{account.applications.first_name} {account.applications.last_name}</span>
                        </div>
                        <div style={styles.detail}>
                          <span style={styles.detailLabel}>Email:</span>
                          <span style={styles.detailValue}>{account.applications.email}</span>
                        </div>
                        <div style={styles.detail}>
                          <span style={styles.detailLabel}>Phone:</span>
                          <span style={styles.detailValue}>{account.applications.phone || 'Not provided'}</span>
                        </div>
                        <div style={styles.detail}>
                          <span style={styles.detailLabel}>Address:</span>
                          <span style={styles.detailValue}>{account.applications.address || 'Not provided'}</span>
                        </div>
                      </>
                    )}
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Current Balance:</span>
                      <span style={styles.detailValue}>${parseFloat(account.balance || 0).toFixed(2)}</span>
                    </div>
                    {account.min_deposit > 0 && (
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Minimum Deposit Required:</span>
                        <span style={{...styles.detailValue, color: '#64748b', fontWeight: '600'}}>${parseFloat(account.min_deposit).toFixed(2)}</span>
                      </div>
                    )}
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Status:</span>
                      <span style={{...styles.detailValue, color: '#f59e0b', fontWeight: '700'}}>{account.status?.toUpperCase()}</span>
                    </div>
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Applied:</span>
                      <span style={styles.detailValue}>{new Date(account.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => activateAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.activateButton}
                      title="Activate account and enable full access"
                    >
                      {processing === account.id ? '⏳ Processing...' : '🚀 Activate Account'}
                    </button>
                    <button
                      onClick={() => suspendAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.suspendButton}
                      title="Temporarily suspend this account"
                    >
                      {processing === account.id ? '⏳' : '⏸️'} Suspend
                    </button>
                    <button
                      onClick={() => closeAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.closeButton}
                      title="Permanently close this account"
                    >
                      {processing === account.id ? '⏳' : '🔒'} Close
                    </button>
                    <button
                      onClick={() => rejectAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.rejectButton}
                      title="Reject this account"
                    >
                      {processing === account.id ? '⏳' : '❌'} Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: 'clamp(1rem, 3vw, 1.5rem)'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
    background: 'white',
    padding: 'clamp(1rem, 4vw, 1.5rem)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
    fontWeight: '700',
    color: '#1e3c72',
    margin: 0,
    lineHeight: '1.2'
  },
  subtitle: {
    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  backButton: {
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)'
  },
  logoutButton: {
    background: 'linear-gradient(135deg, #dc3545 0%, #b91c1c 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
  },
  errorMessage: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: 'clamp(1rem, 3vw, 1.25rem)',
    borderRadius: '12px',
    margin: '0 0 1.5rem 0',
    border: '1px solid #fecaca',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '500'
  },
  successMessage: {
    background: '#d1fae5',
    color: '#065f46',
    padding: 'clamp(1rem, 3vw, 1.25rem)',
    borderRadius: '12px',
    margin: '0 0 1.5rem 0',
    border: '1px solid #a7f3d0',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '500'
  },
  accountsSection: {
    background: 'white',
    padding: 'clamp(1rem, 4vw, 1.5rem)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
    fontWeight: '700',
    color: '#1e3c72',
    marginBottom: '1.5rem',
    lineHeight: '1.2'
  },
  loading: {
    textAlign: 'center',
    padding: 'clamp(2rem, 6vw, 3rem)',
    color: '#6b7280',
    fontSize: 'clamp(1rem, 3vw, 1.125rem)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(2rem, 6vw, 3rem)',
    color: '#6b7280'
  },
  accountsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 1.5rem)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))'
  },
  accountCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    padding: 'clamp(1rem, 4vw, 1.5rem)',
    backgroundColor: '#fafbfc',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: '1'
  },
  accountNumber: {
    fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.2'
  },
  accountType: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    fontWeight: '600',
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  statusBadge: {
    color: 'white',
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
  },
  accountDetails: {
    marginBottom: '1.5rem',
    display: 'grid',
    gap: '0.5rem'
  },
  detail: {
    margin: 0,
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    color: '#64748b',
    lineHeight: '1.4',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
    borderBottom: '1px solid #f1f5f9'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#374151'
  },
  detailValue: {
    fontWeight: '500',
    textAlign: 'right'
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '0.5rem'
  },
  activateButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    gridColumn: '1 / -1'
  },
  suspendButton: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  closeButton: {
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  rejectButton: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  }
};
