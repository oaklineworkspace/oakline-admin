
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ManageUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch from auth.users via admin API
      const response = await fetch('/api/admin/get-auth-users');
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        console.error('Error fetching users:', data.error);
        setMessage({ type: 'error', text: 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error loading users' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      setDeleteLoading(user.id);
      const response = await fetch('/api/admin/delete-user-complete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: user.email,
          userId: user.id 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ User deleted successfully' });
        setUsers(users.filter(u => u.id !== user.id));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Manage All Users</h1>
          <p style={styles.subtitle}>View and manage all registered users</p>
        </div>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          borderColor: message.type === 'success' ? '#10b981' : '#ef4444'
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Search by email or user ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>
              All Registered Users ({filteredUsers.length})
            </h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>👤</p>
              <p style={styles.emptyText}>
                {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
              </p>
            </div>
          ) : (
            <div style={styles.scrollContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>User ID</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Created At</th>
                    <th style={styles.th}>Email Confirmed</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span style={styles.userId} title={user.id}>
                          {user.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.email}>{user.email}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.date}>{formatDate(user.created_at)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={user.email_confirmed_at ? styles.badgeSuccess : styles.badgeWarning}>
                          {user.email_confirmed_at ? '✓ Confirmed' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={deleteLoading === user.id}
                          style={styles.deleteButton}
                        >
                          {deleteLoading === user.id ? '⏳ Deleting...' : '🗑️ Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚠️ Confirm Complete Deletion</h3>
            <p style={styles.modalText}>
              Are you sure you want to permanently delete user:
            </p>
            <div style={styles.userInfo}>
              <p><strong>Email:</strong> {confirmDelete.email}</p>
              <p><strong>ID:</strong> {confirmDelete.id}</p>
            </div>
            <p style={styles.warningText}>
              ⚠️ This will permanently delete:
            </p>
            <ul style={styles.deleteList}>
              <li>🏦 All accounts and transactions</li>
              <li>💳 All cards and card transactions</li>
              <li>💰 All Zelle transactions and contacts</li>
              <li>📋 All loan applications and payments</li>
              <li>📧 All notifications and emails</li>
              <li>📊 All audit logs and system logs</li>
              <li>👤 Profile and authentication data</li>
            </ul>
            <p style={styles.dangerText}>
              ⛔ This action cannot be undone!
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                disabled={deleteLoading === confirmDelete.id}
                style={styles.confirmDeleteButton}
              >
                {deleteLoading === confirmDelete.id ? '⏳ Deleting...' : '🗑️ Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  backButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  message: {
    padding: '15px 20px',
    marginBottom: '20px',
    borderRadius: '12px',
    border: '2px solid',
    fontSize: '14px',
    fontWeight: '500',
  },
  searchBar: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '15px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    color: '#64748b',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '20px 25px',
    borderBottom: '2px solid #e2e8f0',
  },
  tableTitle: {
    margin: 0,
    color: '#1e3c72',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  scrollContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    background: '#f8fafc',
  },
  th: {
    padding: '15px 20px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '15px 20px',
    fontSize: '14px',
    color: '#334155',
  },
  userId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#64748b',
    cursor: 'help',
  },
  email: {
    color: '#1e3c72',
    fontWeight: '500',
  },
  date: {
    color: '#64748b',
    fontSize: '13px',
  },
  badgeSuccess: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#d1fae5',
    color: '#065f46',
    display: 'inline-block',
  },
  badgeWarning: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fef3c7',
    color: '#92400e',
    display: 'inline-block',
  },
  deleteButton: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'transform 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    margin: '0 0 20px 0',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '550px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    color: '#dc2626',
    marginTop: 0,
    fontSize: '24px',
    marginBottom: '15px',
  },
  modalText: {
    color: '#475569',
    fontSize: '15px',
    marginBottom: '15px',
  },
  userInfo: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #667eea',
  },
  warningText: {
    color: '#dc2626',
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  deleteList: {
    color: '#64748b',
    fontSize: '14px',
    marginLeft: '20px',
    marginBottom: '15px',
  },
  dangerText: {
    color: '#dc2626',
    fontSize: '15px',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '15px',
    background: '#fee2e2',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};
