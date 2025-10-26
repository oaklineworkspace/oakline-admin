
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';

export default function ManageUserEnrollmentPage() {
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/applications');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setUsers(result.applications || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPassword = async (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setActionLoading({ ...actionLoading, [`password_${selectedUser.id}`]: true });

    try {
      const response = await fetch('/api/admin/assign-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          password: newPassword,
          sendEmail: true
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Password assigned and sent to ${selectedUser.email}`);
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
        await fetchUsers();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`password_${selectedUser.id}`]: false });
    }
  };

  const handleConfirmEmail = async (user) => {
    if (!confirm(`Confirm email for ${user.email}?\n\nThis will allow the user to log in.`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [`confirm_${user.id}`]: true });

    try {
      const response = await fetch('/api/admin/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Email confirmed for ${user.email}`);
        await fetchUsers();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`confirm_${user.id}`]: false });
    }
  };

  const handleCompleteEnrollment = async (user) => {
    if (!confirm(`Mark enrollment as completed for ${user.email}?\n\nThis will:\n- Set enrollment_completed = true\n- Set password_set = true\n- Update application_status to completed`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [`enroll_${user.id}`]: true });

    try {
      const response = await fetch('/api/admin/complete-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          applicationId: user.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Enrollment marked as completed for ${user.email}`);
        await fetchUsers();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`enroll_${user.id}`]: false });
    }
  };

  

  return (
    <AdminAuth>
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔑 Manage User Enrollment & Passwords</h1>
          <p style={styles.subtitle}>Assign passwords and complete enrollment for users</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchUsers} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div style={styles.usersGrid}>
          {users.map(user => (
            <div key={user.id} style={styles.userCard}>
              <div style={styles.userHeader}>
                <div>
                  <h3 style={styles.userName}>
                    {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}
                  </h3>
                  <p style={styles.userEmail}>{user.email}</p>
                </div>
                <div style={styles.badges}>
                  {user.enrollment_completed ? (
                    <span style={styles.badgeSuccess}>✓ Enrolled</span>
                  ) : (
                    <span style={styles.badgePending}>⏳ Pending</span>
                  )}
                  {user.password_set && <span style={styles.badgeInfo}>🔑 Password Set</span>}
                </div>
              </div>

              <div style={styles.userInfo}>
                <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                <p><strong>DOB:</strong> {user.date_of_birth || 'N/A'}</p>
                <p><strong>Country:</strong> {user.country || 'N/A'}</p>
                <p><strong>Application Status:</strong> {user.application_status}</p>
              </div>

              <div style={styles.actionButtons}>
                <button
                  onClick={() => handleAssignPassword(user)}
                  disabled={actionLoading[`password_${user.id}`]}
                  style={styles.actionButton}
                >
                  {actionLoading[`password_${user.id}`] ? '⏳ Assigning...' : '🔑 Assign Password'}
                </button>
                <button
                  onClick={() => handleConfirmEmail(user)}
                  disabled={actionLoading[`confirm_${user.id}`]}
                  style={styles.actionButtonTertiary}
                >
                  {actionLoading[`confirm_${user.id}`] ? '⏳ Confirming...' : '✉️ Confirm Email'}
                </button>
                <button
                  onClick={() => handleCompleteEnrollment(user)}
                  disabled={actionLoading[`enroll_${user.id}`] || user.enrollment_completed}
                  style={{
                    ...styles.actionButtonSecondary,
                    opacity: user.enrollment_completed ? 0.5 : 1,
                    cursor: user.enrollment_completed ? 'not-allowed' : 'pointer'
                  }}
                >
                  {user.enrollment_completed ? '✅ Already Enrolled' : 
                   actionLoading[`enroll_${user.id}`] ? '⏳ Processing...' : '✓ Complete Enrollment'}
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div style={styles.noData}>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Password Assignment Modal */}
      {showPasswordModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Assign Password</h2>
            <p style={styles.modalSubtitle}>
              Assign login password for: <strong>{selectedUser.email}</strong>
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={handlePasswordSubmit} style={styles.submitButton}>
                ✅ Assign Password
              </button>
              <button onClick={() => setShowPasswordModal(false)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  
    </AdminAuth>
  );
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    background: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '18px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  usersGrid: {
    display: 'grid',
    gap: '20px'
  },
  userCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  userName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  userEmail: {
    color: '#64748b',
    margin: 0,
    fontSize: '14px'
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  badgeSuccess: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgePending: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgeInfo: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  userInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '20px',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #e2e8f0'
  },
  actionButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  actionButtonSecondary: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  actionButtonTertiary: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center'
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
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
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0'
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  submitButton: {
    flex: 1,
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
