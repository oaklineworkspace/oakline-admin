
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function DeleteUserById() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [searchMethod, setSearchMethod] = useState('email');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [message, setMessage] = useState(null);
  const [userFound, setUserFound] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

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
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setUserFound(null);

    try {
      const response = await fetch('/api/admin/find-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchMethod === 'email' ? email : null,
          userId: searchMethod === 'userId' ? userId : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUserFound(data.user);
        setMessage({ type: 'success', text: '✅ User found successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'User not found in system' });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setMessage({ type: 'error', text: 'Error searching for user' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/delete-user-complete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userFound.email,
          userId: userFound.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: '✅ User and all dependencies deleted successfully!' 
        });
        
        // Refresh user list
        await fetchAllUsers();
        
        setUserFound(null);
        setConfirmDelete(false);
        setUserId('');
        setEmail('');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setUserFound(user);
    setEmail(user.email);
    setUserId(user.id);
    setMessage({ type: 'success', text: '✅ User selected from list' });
  };

  const handleFilterChange = (searchTerm) => {
    if (!searchTerm) {
      setFilteredUsers(allUsers);
      return;
    }

    const filtered = allUsers.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🗑️ Delete User Management</h1>
          <p style={styles.subtitle}>Permanently remove users and all associated data from the system</p>
        </div>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {message && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          <div style={styles.messageContent}>
            <span style={styles.messageIcon}>
              {message.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div style={styles.contentGrid}>
        {/* User List Section */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>👥 All Users</h2>
            <span style={styles.userCount}>{filteredUsers.length} users</span>
          </div>

          <input
            type="text"
            placeholder="🔍 Filter by email, name, or ID..."
            onChange={(e) => handleFilterChange(e.target.value)}
            style={styles.filterInput}
          />

          {fetchingUsers ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📭</span>
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      ...styles.userItem,
                      ...(userFound?.id === user.id ? styles.userItemSelected : {})
                    }}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div style={styles.userInfo}>
                      <div style={styles.userName}>{user.name || 'Unknown User'}</div>
                      <div style={styles.userEmail}>{user.email}</div>
                      <div style={styles.userId}>ID: {user.id}</div>
                    </div>
                    {userFound?.id === user.id && (
                      <span style={styles.selectedBadge}>Selected</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Search & Delete Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔍 Search & Delete User</h2>

          <div style={styles.searchMethodToggle}>
            <button
              onClick={() => setSearchMethod('email')}
              style={{
                ...styles.toggleButton,
                ...(searchMethod === 'email' ? styles.toggleButtonActive : {})
              }}
            >
              📧 Email
            </button>
            <button
              onClick={() => setSearchMethod('userId')}
              style={{
                ...styles.toggleButton,
                ...(searchMethod === 'userId' ? styles.toggleButtonActive : {})
              }}
            >
              🆔 User ID
            </button>
          </div>

          <form onSubmit={handleSearch} style={styles.form}>
            {searchMethod === 'email' ? (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  style={styles.input}
                  required
                />
              </div>
            ) : (
              <div style={styles.inputGroup}>
                <label style={styles.label}>User ID (UUID)</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="f6017868-af40-4337-98b9-90d6b57395ca"
                  style={styles.input}
                  required
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.findButton}>
              {loading ? '🔄 Searching...' : '🔍 Find User'}
            </button>
          </form>

          {userFound && (
            <div style={styles.userDetails}>
              <h3 style={styles.userDetailsTitle}>User Details</h3>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>ID:</span>
                  <span style={styles.detailValue}>{userFound.id}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Email:</span>
                  <span style={styles.detailValue}>{userFound.email}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Name:</span>
                  <span style={styles.detailValue}>
                    {userFound.first_name} {userFound.last_name}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Created:</span>
                  <span style={styles.detailValue}>
                    {new Date(userFound.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={styles.deleteButton}
                >
                  🗑️ Delete This User
                </button>
              ) : (
                <div style={styles.confirmSection}>
                  <div style={styles.warningBox}>
                    <h4 style={styles.warningTitle}>⚠️ Permanent Deletion Warning</h4>
                    <p style={styles.warningText}>
                      This will permanently delete all data including:
                    </p>
                    <ul style={styles.warningList}>
                      <li>Card transactions and cards</li>
                      <li>Zelle transactions and settings</li>
                      <li>Loan payments and loans</li>
                      <li>Accounts and transactions</li>
                      <li>Applications and enrollments</li>
                      <li>Notifications and audit logs</li>
                      <li>Profile and authentication</li>
                    </ul>
                    <p style={styles.warningFooter}>
                      <strong>This action cannot be undone!</strong>
                    </p>
                  </div>

                  <div style={styles.confirmButtons}>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={loading}
                      style={styles.confirmDeleteButton}
                    >
                      {loading ? '🔄 Deleting...' : '✅ Confirm Deletion'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    background: 'white',
    padding: '28px 32px',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '8px 0 0 0',
    fontWeight: '400',
  },
  backButton: {
    padding: '12px 24px',
    background: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  message: {
    padding: '16px 20px',
    marginBottom: '20px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '500',
    animation: 'slideDown 0.3s ease',
  },
  messageContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  messageIcon: {
    fontSize: '20px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: '28px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  userCount: {
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: '600',
  },
  filterInput: {
    width: '100%',
    padding: '14px 20px',
    paddingLeft: '44px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '20px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'%3E%3C/circle%3E%3Cpath d=\'m21 21-4.35-4.35\'%3E%3C/path%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '16px center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  userList: {
    maxHeight: '520px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  userItem: {
    padding: '18px',
    background: '#f8fafc',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userItemSelected: {
    background: '#eff6ff',
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '15px',
    marginBottom: '4px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
  },
  userId: {
    fontSize: '11px',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  selectedBadge: {
    background: '#3b82f6',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  searchMethodToggle: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  toggleButton: {
    flex: 1,
    padding: '12px',
    background: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#64748b',
  },
  toggleButtonActive: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
  },
  input: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  findButton: {
    padding: '14px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  userDetails: {
    marginTop: '24px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
  },
  userDetailsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  detailsGrid: {
    display: 'grid',
    gap: '12px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#64748b',
    fontSize: '14px',
  },
  detailValue: {
    color: '#1e293b',
    fontSize: '14px',
    fontWeight: '500',
  },
  deleteButton: {
    width: '100%',
    padding: '14px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmSection: {
    marginTop: '16px',
  },
  warningBox: {
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  },
  warningTitle: {
    color: '#92400e',
    margin: '0 0 12px 0',
    fontSize: '16px',
  },
  warningText: {
    color: '#92400e',
    marginBottom: '8px',
    fontSize: '14px',
  },
  warningList: {
    color: '#92400e',
    marginLeft: '20px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  warningFooter: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginBottom: 0,
    fontSize: '14px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    background: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: '14px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
