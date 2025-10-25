
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function DeleteUserById() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [message, setMessage] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setFetchingUsers(true);
    try {
      const response = await fetch('/api/admin/get-users');
      const data = await response.json();
      
      if (response.ok && data.users) {
        setAllUsers(data.users);
        setFilteredUsers(data.users);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error loading users' });
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleFilterChange = (value) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter(user => 
      user.email?.toLowerCase().includes(value.toLowerCase()) ||
      user.name?.toLowerCase().includes(value.toLowerCase()) ||
      user.id?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeletingUserId(userToDelete.id);
      setLoading(true);

      const response = await fetch('/api/admin/delete-user-complete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userToDelete.email,
          userId: userToDelete.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `✅ User ${userToDelete.email} deleted successfully!` 
        });
        
        await fetchAllUsers();
        setUserToDelete(null);
        
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setLoading(false);
      setDeletingUserId(null);
    }
  };

  const handleCancelDelete = () => {
    setUserToDelete(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>🗑️</div>
          <div>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.subtitle}>Delete users and all associated data permanently</p>
          </div>
        </div>
        <Link href="/admin" style={styles.backButton}>
          ← Back
        </Link>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{
          ...styles.alert,
          ...(message.type === 'success' ? styles.alertSuccess : styles.alertError)
        }}>
          <span style={styles.alertIcon}>
            {message.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.card}>
        {/* Search Bar */}
        <div style={styles.searchSection}>
          <div style={styles.searchInputWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.userCount}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </div>
        </div>

        {/* Users List */}
        {fetchingUsers ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p style={styles.emptyText}>No users found</p>
            <p style={styles.emptySubtext}>
              {searchTerm ? 'Try adjusting your search' : 'No users available'}
            </p>
          </div>
        ) : (
          <div style={styles.usersList}>
            {filteredUsers.map((user) => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userInfo}>
                  <div style={styles.userAvatar}>
                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user.name || 'Unknown User'}
                    </div>
                    <div style={styles.userEmail}>{user.email}</div>
                    <div style={styles.userId}>ID: {user.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClick(user)}
                  disabled={deletingUserId === user.id}
                  style={{
                    ...styles.deleteBtn,
                    ...(deletingUserId === user.id ? styles.deleteBtnLoading : {})
                  }}
                >
                  {deletingUserId === user.id ? (
                    <>
                      <span style={styles.btnSpinner}></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      Delete
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {userToDelete && (
        <div style={styles.modalOverlay} onClick={handleCancelDelete}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>⚠️</span>
              <h2 style={styles.modalTitle}>Confirm Deletion</h2>
            </div>
            
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                You are about to permanently delete:
              </p>
              <div style={styles.modalUserInfo}>
                <div><strong>Name:</strong> {userToDelete.name || 'N/A'}</div>
                <div><strong>Email:</strong> {userToDelete.email}</div>
                <div><strong>ID:</strong> {userToDelete.id}</div>
              </div>
              
              <div style={styles.warningBox}>
                <p style={styles.warningTitle}>This will permanently delete:</p>
                <ul style={styles.warningList}>
                  <li>All user accounts and balances</li>
                  <li>Card transactions and cards</li>
                  <li>Zelle transactions and settings</li>
                  <li>Loan payments and loans</li>
                  <li>Applications and enrollments</li>
                  <li>Notifications and logs</li>
                  <li>User profile and authentication</li>
                </ul>
                <p style={styles.warningFooter}>
                  <strong>⚠️ This action cannot be undone!</strong>
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={handleCancelDelete}
                disabled={loading}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                style={styles.confirmBtn}
              >
                {loading ? (
                  <>
                    <span style={styles.btnSpinner}></span>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete User'
                )}
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    background: 'white',
    padding: '20px 24px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: '200px',
  },
  headerIcon: {
    fontSize: '36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  backButton: {
    padding: '12px 24px',
    background: '#64748b',
    color: 'white',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  alert: {
    padding: '16px 20px',
    marginBottom: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: '500',
    animation: 'slideDown 0.3s ease',
  },
  alertSuccess: {
    background: '#d1fae5',
    color: '#065f46',
    border: '2px solid #10b981',
  },
  alertError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '2px solid #ef4444',
  },
  alertIcon: {
    fontSize: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: 'clamp(16px, 3vw, 28px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  searchSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '14px 20px 14px 48px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  userCount: {
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '600px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'clamp(12px, 2vw, 20px)',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s ease',
    gap: '16px',
    flexWrap: 'wrap',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(12px, 2vw, 16px)',
    flex: 1,
    minWidth: '200px',
  },
  userAvatar: {
    width: 'clamp(40px, 8vw, 56px)',
    height: 'clamp(40px, 8vw, 56px)',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: '700',
    flexShrink: 0,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
    wordBreak: 'break-word',
  },
  userEmail: {
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#64748b',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },
  userId: {
    fontSize: 'clamp(10px, 1.8vw, 12px)',
    color: '#94a3b8',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  deleteBtn: {
    padding: 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px)',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(13px, 2vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  deleteBtnLoading: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  btnSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease',
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  modalIcon: {
    fontSize: '32px',
  },
  modalTitle: {
    fontSize: 'clamp(18px, 3vw, 22px)',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: '1 1 auto',
  },
  modalText: {
    fontSize: '15px',
    color: '#475569',
    marginBottom: '16px',
  },
  modalUserInfo: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    wordBreak: 'break-all',
  },
  warningBox: {
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
  },
  warningTitle: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '12px',
  },
  warningList: {
    color: '#92400e',
    fontSize: '13px',
    marginLeft: '20px',
    marginBottom: '12px',
  },
  warningFooter: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  cancelBtn: {
    padding: '12px 24px',
    background: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: 1,
    minWidth: '100px',
  },
  confirmBtn: {
    padding: '12px 24px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flex: 1,
    minWidth: '100px',
  },
};
