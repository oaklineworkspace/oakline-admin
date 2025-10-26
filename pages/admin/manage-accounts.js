
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function ManageAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchUsersWithAccounts();
  }, []);

  const fetchUsersWithAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/get-users-with-accounts');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users and accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccountNumber = (account) => {
    setEditingAccount(account);
    setNewAccountNumber(account.account_number);
  };

  const saveAccountNumber = async () => {
    if (!editingAccount) return;
    
    setProcessing(editingAccount.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/update-account-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: editingAccount.id,
          newAccountNumber: newAccountNumber
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update account number');
      }

      setSuccessMessage(`Account number updated successfully for ${editingAccount.account_type}`);
      setEditingAccount(null);
      setNewAccountNumber('');
      await fetchUsersWithAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      setError('Failed to update account number: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspendAccount = async (account) => {
    if (!confirm(`Are you sure you want to suspend this ${account.account_type} account?`)) {
      return;
    }

    setProcessing(account.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          status: 'suspended'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to suspend account');
      }

      setSuccessMessage(`Account suspended successfully`);
      await fetchUsersWithAccounts();
    } catch (error) {
      console.error('Error suspending account:', error);
      setError('Failed to suspend account: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleCloseAccount = async (account) => {
    if (!confirm(`Are you sure you want to CLOSE this ${account.account_type} account? This action cannot be undone.`)) {
      return;
    }

    setProcessing(account.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          status: 'closed'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to close account');
      }

      setSuccessMessage(`Account closed successfully`);
      await fetchUsersWithAccounts();
    } catch (error) {
      console.error('Error closing account:', error);
      setError('Failed to close account: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleActivateAccount = async (account) => {
    setProcessing(account.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          status: 'active'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate account');
      }

      setSuccessMessage(`Account activated successfully`);
      await fetchUsersWithAccounts();
    } catch (error) {
      console.error('Error activating account:', error);
      setError('Failed to activate account: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏦 Manage User Accounts</h1>
            <p style={styles.subtitle}>Edit, suspend, or close user accounts</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchUsersWithAccounts} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        <div style={styles.content}>
          {loading && <p style={styles.loadingText}>Loading users and accounts...</p>}

          {!loading && users.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateIcon}>👥</p>
              <p style={styles.emptyStateText}>No users found</p>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div style={styles.usersGrid}>
              {users.map((user) => (
                <div key={user.id} style={styles.userCard}>
                  <div style={styles.userHeader}>
                    <h3 style={styles.userName}>
                      {user.first_name} {user.last_name}
                    </h3>
                    <p style={styles.userEmail}>{user.email}</p>
                  </div>

                  <div style={styles.accountsSection}>
                    <h4 style={styles.accountsTitle}>Accounts ({user.accounts?.length || 0})</h4>
                    {user.accounts && user.accounts.length > 0 ? (
                      user.accounts.map((account) => (
                        <div key={account.id} style={styles.accountCard}>
                          <div style={styles.accountHeader}>
                            <div>
                              <p style={styles.accountType}>
                                {account.account_type.replace(/_/g, ' ').toUpperCase()}
                              </p>
                              {editingAccount?.id === account.id ? (
                                <div style={styles.editContainer}>
                                  <input
                                    type="text"
                                    value={newAccountNumber}
                                    onChange={(e) => setNewAccountNumber(e.target.value)}
                                    style={styles.input}
                                    placeholder="Account Number"
                                  />
                                  <div style={styles.editButtons}>
                                    <button
                                      onClick={saveAccountNumber}
                                      style={styles.saveButton}
                                      disabled={processing === account.id}
                                    >
                                      ✓ Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingAccount(null);
                                        setNewAccountNumber('');
                                      }}
                                      style={styles.cancelEditButton}
                                    >
                                      ✕ Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={styles.accountNumber}>
                                  <strong>Account:</strong> {account.account_number}
                                </p>
                              )}
                            </div>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: 
                                account.status === 'active' ? '#10b981' :
                                account.status === 'suspended' ? '#f59e0b' :
                                account.status === 'closed' ? '#ef4444' :
                                '#6b7280'
                            }}>
                              {account.status.toUpperCase()}
                            </span>
                          </div>

                          <div style={styles.accountInfo}>
                            <p style={styles.infoItem}>
                              <strong>Balance:</strong> ${parseFloat(account.balance || 0).toFixed(2)}
                            </p>
                            <p style={styles.infoItem}>
                              <strong>Routing:</strong> {account.routing_number}
                            </p>
                          </div>

                          <div style={styles.accountActions}>
                            {editingAccount?.id !== account.id && account.status !== 'closed' && (
                              <button
                                onClick={() => handleEditAccountNumber(account)}
                                style={styles.editButton}
                                disabled={processing === account.id}
                              >
                                ✏️ Edit Number
                              </button>
                            )}

                            {account.status === 'active' && (
                              <button
                                onClick={() => handleSuspendAccount(account)}
                                style={styles.suspendButton}
                                disabled={processing === account.id}
                              >
                                {processing === account.id ? '⏳' : '⏸️'} Suspend
                              </button>
                            )}

                            {account.status === 'suspended' && (
                              <button
                                onClick={() => handleActivateAccount(account)}
                                style={styles.activateButton}
                                disabled={processing === account.id}
                              >
                                {processing === account.id ? '⏳' : '▶️'} Activate
                              </button>
                            )}

                            {account.status !== 'closed' && (
                              <button
                                onClick={() => handleCloseAccount(account)}
                                style={styles.closeButton}
                                disabled={processing === account.id}
                              >
                                {processing === account.id ? '⏳' : '🔒'} Close
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={styles.noAccounts}>No accounts found</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  errorBanner: {
    background: '#fed7d7',
    color: '#c53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
  },
  successBanner: {
    background: '#c6f6d5',
    color: '#2f855a',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loadingText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    padding: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(2rem, 6vw, 60px) 20px',
  },
  emptyStateIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px',
  },
  emptyStateText: {
    fontSize: 'clamp(1.1rem, 3vw, 20px)',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  usersGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))',
  },
  userCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 20px)',
    background: '#f9fafb',
  },
  userHeader: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  userName: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.1rem, 3vw, 20px)',
    color: '#1a202c',
    fontWeight: '600',
  },
  userEmail: {
    margin: 0,
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
  },
  accountsSection: {
    marginTop: '16px',
  },
  accountsTitle: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '600',
  },
  accountCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px',
  },
  accountType: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#1f2937',
    fontWeight: '600',
  },
  accountNumber: {
    margin: 0,
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  statusBadge: {
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  accountInfo: {
    marginBottom: '12px',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  infoItem: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#4b5563',
  },
  accountActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  suspendButton: {
    padding: '8px 16px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  activateButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  closeButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editContainer: {
    marginTop: '8px',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    marginBottom: '8px',
  },
  editButtons: {
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelEditButton: {
    padding: '8px 16px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  noAccounts: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    padding: '20px',
  },
};
