import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function ApproveAccounts() {
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Ensure user is authenticated before fetching data
    if (user) {
      fetchPendingAccounts();
    } else {
      // If not authenticated, redirect to login or show an appropriate message
      // For now, we assume AdminRoute handles redirection, but this check is good practice
      setPendingAccounts([]); // Clear any old data if auth state changes
    }
  }, [user]); // Re-fetch when user authentication status changes

  const fetchPendingAccounts = async () => {
    if (!user) return; // Do not fetch if no user
    setLoading(true);
    setError('');
    try {
      // Fetch pending accounts with associated profile data
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select(`
          *,
          profiles!inner(
            id,
            email,
            full_name,
            phone,
            address,
            date_of_birth
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending accounts:', error);
        throw new Error(`Failed to load pending accounts: ${error.message}`);
      }

      setPendingAccounts(accounts || []);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveAccount = async (accountId, accountNumber) => {
    if (!user) return; // Ensure user is logged in
    setProcessing(accountId);
    setError('');
    setMessage('');

    try {
      // Update account status to active
      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to approve account: ${updateError.message}`);
      }

      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: 'account_approved',
          target_type: 'account',
          target_id: accountId,
          details: {
            account_number: accountNumber,
            approved_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('Audit log error:', auditError); // Use warn for non-critical errors
      }

      setMessage(`✅ Account ${accountNumber} has been approved successfully!`);
      setTimeout(() => setMessage(''), 5000);

      // Refresh the pending accounts list
      await fetchPendingAccounts();
    } catch (error) {
      console.error('Error approving account:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const rejectAccount = async (accountId, accountNumber) => {
    if (!user) return; // Ensure user is logged in
    setProcessing(accountId);
    setError('');
    setMessage('');

    try {
      // Update account status to rejected
      const { error } = await supabase
        .from('accounts')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) {
        console.error('Error rejecting account:', error);
        throw new Error(`Failed to reject account: ${error.message}`);
      }

      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: 'account_rejected',
          target_type: 'account',
          target_id: accountId,
          details: {
            account_number: accountNumber,
            rejected_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('Audit log error:', auditError); // Use warn for non-critical errors
      }

      setMessage(`❌ Account ${accountNumber} has been rejected.`);
      setTimeout(() => setMessage(''), 5000);

      // Remove from pending list
      setPendingAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  // If not authenticated, AdminRoute will handle redirection.
  // If user is present, render the component.
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>✅ Account Approval</h1>
          <p style={styles.subtitle}>Approve or reject pending account applications</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchPendingAccounts} style={styles.refreshButton} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <Link href="/dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
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
          Pending Accounts ({pendingAccounts.length})
        </h2>

        {loading ? (
          <div style={styles.loading}>Loading pending accounts...</div>
        ) : pendingAccounts.length === 0 ? (
          <div style={styles.emptyState}>
            <h3>No Pending Accounts</h3>
            <p>All accounts have been processed or no applications have been submitted yet.</p>
          </div>
        ) : (
          <div style={styles.accountsGrid}>
            {pendingAccounts.map(account => (
              <div key={account.id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <div style={styles.accountInfo}>
                    <h3 style={styles.accountNumber}>Account: {account.account_number}</h3>
                    <span style={styles.accountType}>
                      {account.account_type?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.statusBadge}>
                    PENDING
                  </div>
                </div>

                <div style={styles.accountDetails}>
                  {account.profiles && (
                    <>
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Name:</span>
                        <span style={styles.detailValue}>{account.profiles.full_name}</span>
                      </div>
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Email:</span>
                        <span style={styles.detailValue}>{account.profiles.email}</span>
                      </div>
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Phone:</span>
                        <span style={styles.detailValue}>{account.profiles.phone || 'Not provided'}</span>
                      </div>
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Address:</span>
                        <span style={styles.detailValue}>{account.profiles.address || 'Not provided'}</span>
                      </div>
                    </>
                  )}
                  <div style={styles.detail}>
                    <span style={styles.detailLabel}>Initial Balance:</span>
                    <span style={styles.detailValue}>${parseFloat(account.balance || 0).toFixed(2)}</span>
                  </div>
                  <div style={styles.detail}>
                    <span style={styles.detailLabel}>Applied:</span>
                    <span style={styles.detailValue}>{new Date(account.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={styles.actionButtons}>
                  <button
                    onClick={() => approveAccount(account.id, account.account_number)}
                    disabled={processing === account.id}
                    style={styles.approveButton}
                  >
                    {processing === account.id ? '⏳ Processing...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => rejectAccount(account.id, account.account_number)}
                    disabled={processing === account.id}
                    style={styles.rejectButton}
                  >
                    {processing === account.id ? '⏳ Processing...' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApproveAccountsPage() {
  return (
    <AdminRoute>
      <ApproveAccounts />
    </AdminRoute>
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
    backgroundColor: '#f59e0b',
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
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  approveButton: {
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