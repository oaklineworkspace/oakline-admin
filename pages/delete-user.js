
<new_str>import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function DeleteUser() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users from profiles table with account information
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          is_active
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch account counts for each user
      if (profilesData && profilesData.length > 0) {
        const userIds = profilesData.map(user => user.id);
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('user_id, account_number, balance')
          .in('user_id', userIds);

        if (accountsError) {
          console.warn('Error fetching accounts:', accountsError);
        }

        // Map accounts to users
        const usersWithAccounts = profilesData.map(user => ({
          ...user,
          accounts: accountsData?.filter(acc => acc.user_id === user.id) || []
        }));

        setUsers(usersWithAccounts);
      } else {
        setUsers(profilesData || []);
      }

    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    try {
      setDeleteLoading(userId);
      
      // Delete related records first (cascade)
      // Delete transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      // Delete cards
      await supabase
        .from('cards')
        .delete()
        .eq('user_id', userId);

      // Delete accounts
      await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'user_deleted',
          target_type: 'profile',
          target_id: userId,
          details: {
            email: userEmail,
            deleted_at: new Date().toISOString()
          }
        });

      setMessage({ type: 'success', text: `User ${userEmail} deleted successfully` });
      setUsers(users.filter(u => u.id !== userId));

    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Failed to delete user: ' + error.message });
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleDeleteByEmail = async () => {
    if (!searchTerm.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    try {
      setDeleteLoading('email-search');
      
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', searchTerm.trim())
        .single();

      if (userError || !userData) {
        throw new Error('User not found with that email address');
      }

      // Delete the user
      await handleDeleteUser(userData.id, userData.email);
      setSearchTerm('');

    } catch (error) {
      console.error('Error deleting user by email:', error);
      setMessage({ type: 'error', text: error.message });
      setDeleteLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🗑️ Delete Users</h1>
            <p style={styles.subtitle}>Remove user accounts and all associated data</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            ...styles.messageBox,
            ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
          }}>
            {message.text}
          </div>
        )}

        {/* Search and Quick Delete */}
        <div style={styles.searchSection}>
          <h3>Quick Delete by Email</h3>
          <div style={styles.searchBar}>
            <input
              type="email"
              placeholder="Enter user email to delete..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <button
              onClick={handleDeleteByEmail}
              disabled={deleteLoading === 'email-search' || !searchTerm.trim()}
              style={{
                ...styles.deleteButton,
                opacity: deleteLoading === 'email-search' || !searchTerm.trim() ? 0.6 : 1,
                cursor: deleteLoading === 'email-search' || !searchTerm.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {deleteLoading === 'email-search' ? 'Deleting...' : '🗑️ Delete by Email'}
            </button>
          </div>
        </div>

        {/* Users List */}
        <div style={styles.usersSection}>
          <div style={styles.sectionHeader}>
            <h2>All Users ({filteredUsers.length})</h2>
            <button onClick={fetchUsers} style={styles.refreshButton} disabled={loading}>
              {loading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {loading ? (
            <div style={styles.loading}>Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.noData}>
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Accounts</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{user.full_name || 'N/A'}</td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>{user.phone || 'N/A'}</td>
                      <td style={styles.tableCell}>{user.accounts?.length || 0}</td>
                      <td style={styles.tableCell}>
                        <span style={user.is_active ? styles.activeStatus : styles.inactiveStatus}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {formatDate(user.created_at)}
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={deleteLoading === user.id}
                          style={{
                            ...styles.deleteButton,
                            opacity: deleteLoading === user.id ? 0.6 : 1,
                            cursor: deleteLoading === user.id ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            padding: '6px 12px'
                          }}
                        >
                          {deleteLoading === user.id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmDelete && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>⚠️ Confirm Deletion</h3>
              <p style={styles.modalText}>
                Are you sure you want to delete the user <strong>{confirmDelete.full_name}</strong> ({confirmDelete.email})?
              </p>
              <div style={styles.warningBox}>
                <p><strong>⚠️ This action will permanently:</strong></p>
                <ul>
                  <li>Delete the user profile</li>
                  <li>Delete all associated accounts ({confirmDelete.accounts?.length || 0})</li>
                  <li>Delete all transaction history</li>
                  <li>Delete all associated cards</li>
                </ul>
                <p><strong>This action cannot be undone!</strong></p>
              </div>
              <div style={styles.modalActions}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(confirmDelete.id, confirmDelete.email)}
                  disabled={deleteLoading === confirmDelete.id}
                  style={{
                    ...styles.confirmDeleteButton,
                    opacity: deleteLoading === confirmDelete.id ? 0.6 : 1,
                    cursor: deleteLoading === confirmDelete.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleteLoading === confirmDelete.id ? 'Deleting...' : '🗑️ Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

export default DeleteUser;

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #a7f3d0'
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  searchSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  searchBar: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px'
  },
  deleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  usersSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontStyle: 'italic'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    fontWeight: 'bold',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6'
  },
  tableCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '14px'
  },
  activeStatus: {
    background: '#d4edda',
    color: '#155724',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  inactiveStatus: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto'
  },
  modalTitle: {
    color: '#dc3545',
    marginTop: 0,
    marginBottom: '15px'
  },
  modalText: {
    marginBottom: '20px',
    fontSize: '16px'
  },
  warningBox: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  confirmDeleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
};
</new_str>
