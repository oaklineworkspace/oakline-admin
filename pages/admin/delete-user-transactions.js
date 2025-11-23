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
  headerContent: {
    flex: 1
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
    maxWidth: '600px',
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
  successAlert: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
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
  fieldGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  required: {
    color: '#e53e3e'
  },
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
  statsBox: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  statItemLast: {
    borderBottom: 'none'
  },
  statLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    fontSize: 'clamp(1rem, 2.5vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#991b1b'
  },
  warningTitle: {
    fontWeight: '700',
    marginBottom: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)'
  },
  warningText: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.5',
    margin: 0
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
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  deleteButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
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
  modal: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: 'clamp(1.2rem, 3vw, 22px)',
    color: '#dc2626',
    fontWeight: '700'
  },
  modalText: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#4a5568',
    lineHeight: '1.6'
  },
  modalButtons: {
    display: 'flex',
    gap: '12px'
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  rejectButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#e5e7eb',
    color: '#1f2937',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default function DeleteUserTransactions() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [transactionCount, setTransactionCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Missing authorization token');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const usersRes = await fetch('/api/admin/get-users', { headers });
      const usersData = await usersRes.json();

      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users');

      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to load users: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = async (e) => {
    const userId = e.target.value;
    const userName = e.target.options[e.target.selectedIndex].text;

    setSelectedUser(userId);
    setTransactionCount(0);
    setShowConfirmModal(false);
    setMessage('');

    if (!userId) {
      setSelectedUserName('');
      return;
    }

    setSelectedUserName(userName);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Missing authorization token');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(`/api/admin/get-user-transaction-count?userId=${userId}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch transaction count');

      setTransactionCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching transaction count:', error);
      setMessage('Failed to load transaction count: ' + error.message);
      setMessageType('error');
    }
  };

  const handleDeleteClick = () => {
    if (transactionCount === 0) {
      setMessage('No transactions to delete for this user');
      setMessageType('error');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmModal(false);

    setLoadingBanner({
      visible: true,
      current: 0,
      total: 1,
      action: 'Deleting Transactions',
      message: 'Removing all transactions for this user...'
    });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessage('Authentication session expired');
        setMessageType('error');
        setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch('/api/admin/delete-user-transactions', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ userId: selectedUser })
      });

      const result = await response.json();

      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${result.deleted} transactions!`);
        setMessageType('success');
        setTransactionCount(0);
        setSelectedUser('');
        setSelectedUserName('');
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`❌ ${result.error || 'Deletion failed'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error deleting transactions:', error);
      setMessage('Failed to delete transactions: ' + error.message);
      setMessageType('error');
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
            <p style={{ color: '#718096' }}>Loading...</p>
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
            <p style={styles.subtitle}>Remove all transaction history for a user</p>
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

          {selectedUser && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Transaction Summary</h2>

              <div style={styles.statsBox}>
                <div style={{ ...styles.statItem, ...styles.statItemLast }}>
                  <span style={styles.statLabel}>Total Transactions to Delete</span>
                  <span style={styles.statValue}>{transactionCount}</span>
                </div>
              </div>

              {transactionCount > 0 && (
                <div style={styles.warningBox}>
                  <div style={styles.warningTitle}>⚠️ Warning: This Action Cannot Be Undone</div>
                  <p style={styles.warningText}>
                    You are about to permanently delete <strong>{transactionCount} transaction(s)</strong> for{' '}
                    <strong>{selectedUserName}</strong>. This operation is irreversible and will be logged in audit trails.
                  </p>
                </div>
              )}

              <div style={styles.buttonGroup}>
                <button
                  onClick={handleDeleteClick}
                  disabled={transactionCount === 0}
                  style={{
                    ...styles.deleteButton,
                    ...(transactionCount === 0 ? styles.deleteButtonDisabled : {})
                  }}
                >
                  🗑️ Delete All Transactions ({transactionCount})
                </button>
                <button
                  onClick={() => {
                    setSelectedUser('');
                    setSelectedUserName('');
                    setTransactionCount(0);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div style={{ ...styles.modal, display: 'flex' }}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Confirm Delete?</h2>
              <p style={styles.modalText}>
                Are you absolutely sure you want to delete <strong>{transactionCount} transaction(s)</strong> for{' '}
                <strong>{selectedUserName}</strong>?
              </p>
              <p style={{ ...styles.modalText, color: '#991b1b', fontWeight: '600' }}>
                ⚠️ This cannot be undone. This action will be logged and audited.
              </p>
              <div style={styles.modalButtons}>
                <button onClick={handleConfirmDelete} style={styles.confirmButton}>
                  Yes, Delete All
                </button>
                <button onClick={() => setShowConfirmModal(false)} style={styles.rejectButton}>
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
