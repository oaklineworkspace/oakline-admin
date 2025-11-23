import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

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
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerContent: { flex: 1 },
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
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  alert: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successAlert: { backgroundColor: '#d1fae5', color: '#065f46' },
  errorAlert: { backgroundColor: '#fee2e2', color: '#dc2626' },
  section: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(1.1rem, 2.5vw, 20px)',
    color: '#1A3E6F',
    fontWeight: '700',
    borderBottom: '2px solid #1e40af',
    paddingBottom: '12px'
  },
  fieldGroup: { marginBottom: '20px' },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  required: { color: '#e53e3e' },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  transactionList: {
    display: 'grid',
    gap: '12px'
  },
  transactionCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  transactionCardSelected: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #1e40af',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#1e40af',
    marginTop: '2px',
    flexShrink: 0
  },
  transactionContent: { flex: 1, minWidth: 0 },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '8px'
  },
  transactionDescription: {
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#1A3E6F',
    margin: 0
  },
  transactionAmount: {
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '700',
    color: '#1A3E6F'
  },
  amountCredit: { color: '#059669' },
  amountDebit: { color: '#dc2626' },
  transactionMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: 'clamp(0.8rem, 1.8vw, 13px)',
    color: '#718096'
  },
  selectAllContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0'
  },
  selectAllLabel: {
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  deleteButton: {
    flex: 1,
    minWidth: '150px',
    padding: 'clamp(0.75rem, 2vw, 12px) clamp(1.5rem, 4vw, 24px)',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deleteButtonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  cancelButton: {
    flex: 1,
    minWidth: '150px',
    padding: 'clamp(0.75rem, 2vw, 12px) clamp(1.5rem, 4vw, 24px)',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096'
  },
  statsBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  stat: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: 'clamp(0.8rem, 1.8vw, 13px)',
    color: '#718096',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: 'clamp(1.1rem, 2.5vw, 18px)',
    fontWeight: '700',
    color: '#1A3E6F'
  }
};

export default function DeleteUserTransactions() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const usersRes = await fetch('/api/admin/get-users', { headers });
      const usersData = await usersRes.json();
      if (!usersRes.ok) throw new Error(usersData.error);

      setUsers(usersData.users || []);
    } catch (error) {
      setMessage('Failed to load users: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = async (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    setTransactions([]);
    setSelectedTransactions(new Set());
    setSelectAll(false);
    setMessage('');

    if (!userId) return;

    setLoadingTransactions(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(`/api/admin/get-user-transactions?userId=${userId}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setTransactions(data.transactions || []);
    } catch (error) {
      setMessage('Failed to load transactions: ' + error.message);
      setMessageType('error');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const toggleTransaction = (txId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(txId)) {
      newSelected.delete(txId);
    } else {
      newSelected.add(txId);
    }
    setSelectedTransactions(newSelected);
    setSelectAll(newSelected.size === transactions.length && transactions.length > 0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
      setSelectAll(true);
    } else {
      setSelectedTransactions(new Set());
      setSelectAll(false);
    }
  };

  const handleDelete = async () => {
    if (selectedTransactions.size === 0) {
      setMessage('Please select at least one transaction');
      setMessageType('error');
      return;
    }

    setLoadingBanner({
      visible: true,
      current: 0,
      total: selectedTransactions.size,
      action: 'Deleting Transactions',
      message: 'Removing selected transactions...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch('/api/admin/delete-selected-transactions', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions)
        })
      });

      const result = await response.json();
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${result.deleted} transaction(s)!`);
        setMessageType('success');
        setTransactions(transactions.filter(t => !selectedTransactions.has(t.id)));
        setSelectedTransactions(new Set());
        setSelectAll(false);
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`❌ ${result.error || 'Deletion failed'}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to delete transactions: ' + error.message);
      setMessageType('error');
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
            <p>Loading...</p>
          </div>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <AdminLoadingBanner
          isVisible={loadingBanner.visible}
          current={loadingBanner.current}
          total={loadingBanner.total}
          action={loadingBanner.action}
          message={loadingBanner.message}
        />

        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🗑️ Delete User Transactions</h1>
            <p style={styles.subtitle}>Select and remove specific transactions</p>
          </div>
          <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
            ← Dashboard
          </button>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            ...(messageType === 'success' ? styles.successAlert : styles.errorAlert)
          }}>
            {message}
            <button
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={styles.content}>
          {/* User Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select User</h2>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Choose User <span style={styles.required}>*</span>
              </label>
              <select
                value={selectedUser}
                onChange={handleUserChange}
                style={styles.select}
              >
                <option value="">Choose a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction List */}
          {selectedUser && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                Transactions ({transactions.length})
              </h2>

              {transactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No transactions found for this user</p>
                </div>
              ) : (
                <>
                  <div style={styles.statsBox}>
                    <div style={styles.stat}>
                      <div style={styles.statLabel}>Total</div>
                      <div style={styles.statValue}>{transactions.length}</div>
                    </div>
                    <div style={styles.stat}>
                      <div style={styles.statLabel}>Selected</div>
                      <div style={styles.statValue}>{selectedTransactions.size}</div>
                    </div>
                  </div>

                  <div style={styles.selectAllContainer}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      style={styles.checkbox}
                    />
                    <label style={styles.selectAllLabel}>
                      Select All ({transactions.length})
                    </label>
                  </div>

                  <div style={styles.transactionList}>
                    {transactions.map(tx => (
                      <div
                        key={tx.id}
                        style={{
                          ...styles.transactionCard,
                          ...(selectedTransactions.has(tx.id) ? styles.transactionCardSelected : {})
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(tx.id)}
                          onChange={() => toggleTransaction(tx.id)}
                          style={styles.checkbox}
                        />
                        <div style={styles.transactionContent}>
                          <div style={styles.transactionHeader}>
                            <p style={styles.transactionDescription}>{tx.description}</p>
                            <span style={{
                              ...styles.transactionAmount,
                              ...(tx.type === 'credit' ? styles.amountCredit : styles.amountDebit)
                            }}>
                              {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                            </span>
                          </div>
                          <div style={styles.transactionMeta}>
                            <span>Type: <strong>{tx.type}</strong></span>
                            <span>Status: <strong>{tx.status}</strong></span>
                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ ...styles.buttonGroup, marginTop: '20px' }}>
                    <button
                      onClick={handleDelete}
                      disabled={selectedTransactions.size === 0}
                      style={{
                        ...styles.deleteButton,
                        ...(selectedTransactions.size === 0 ? styles.deleteButtonDisabled : {})
                      }}
                    >
                      🗑️ Delete Selected ({selectedTransactions.size})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser('');
                        setTransactions([]);
                        setSelectedTransactions(new Set());
                        setSelectAll(false);
                      }}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}
