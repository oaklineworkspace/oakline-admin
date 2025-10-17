
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function ManageAllUsersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchAllUsersData();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchAllUsersData();
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const fetchAllUsersData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch all applications (use submitted_at instead of created_at)
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (appsError) throw appsError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*');

      if (accountsError) throw accountsError;

      // Fetch all cards
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*');

      if (cardsError) throw cardsError;

      // Fetch all enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('*');

      if (enrollError) throw enrollError;

      // Combine all data (match by email only since application_id doesn't exist in profiles)
      const combinedData = applications.map(app => {
        const profile = profiles?.find(p => p.email === app.email);
        const userAccounts = accounts?.filter(a => a.application_id === app.id) || [];
        const enrollment = enrollments?.find(e => e.email === app.email);
        
        return {
          ...app,
          user_id: app.user_id || profile?.id,
          enrollment_completed: profile?.enrollment_completed || false,
          password_set: profile?.password_set || false,
          enrollment_data: enrollment,
          profile_data: profile,
          accounts: userAccounts.map(acc => ({
            ...acc,
            cards: cards?.filter(c => c.account_id === acc.id) || []
          }))
        };
      });

      setUsersData(combinedData);
    } catch (error) {
      console.error('Error fetching users data:', error);
      setError('Failed to load users data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async (user) => {
    setActionLoading({ ...actionLoading, [`resend_${user.id}`]: true });
    
    try {
      const response = await fetch('/api/resend-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: user.id,
          email: user.email,
          firstName: user.first_name,
          middleName: user.middle_name,
          lastName: user.last_name,
          country: user.country
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Enrollment link sent to ${user.email}`);
        await fetchAllUsersData();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`resend_${user.id}`]: false });
    }
  };

  const handleForcePasswordReset = async (user) => {
    if (!confirm(`Send password reset link to ${user.email}?`)) return;
    
    setActionLoading({ ...actionLoading, [`reset_${user.id}`]: true });
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      alert(`✅ Password reset link sent to ${user.email}`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`reset_${user.id}`]: false });
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`⚠️ DELETE USER: ${user.email}?\n\nThis will permanently delete:\n- User account\n- All accounts\n- All cards\n- All transactions\n- All enrollments\n- All related data\n\nThis action CANNOT be undone!`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [`delete_${user.id}`]: true });
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.user_id,
          email: user.email
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
        await fetchAllUsersData();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`delete_${user.id}`]: false });
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🔐 Admin Access Required</h1>
          <p style={styles.subtitle}>Manage All Users</p>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter admin password"
                required
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              🔓 Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Manage All Users</h1>
          <p style={styles.subtitle}>Complete user management with accounts, cards, and actions</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchAllUsersData} style={styles.refreshButton}>
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

      {error && <div style={styles.errorMessage}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading all users data...</p>
        </div>
      ) : (
        <div style={styles.usersGrid}>
          {usersData.map(user => (
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

              {user.accounts && user.accounts.length > 0 ? (
                <div style={styles.accountsSection}>
                  <h4 style={styles.sectionTitle}>💳 Accounts ({user.accounts.length})</h4>
                  {user.accounts.map(account => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountHeader}>
                        <span style={styles.accountType}>
                          {account.account_type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: account.status === 'active' ? '#10b981' : '#6b7280'
                        }}>
                          {account.status}
                        </span>
                      </div>
                      <p style={styles.accountNumber}>Account: {account.account_number}</p>
                      <p style={styles.balance}>Balance: ${parseFloat(account.balance || 0).toFixed(2)}</p>

                      {account.cards && account.cards.length > 0 && (
                        <div style={styles.cardsSection}>
                          <h5 style={styles.cardsTitle}>🏦 Cards ({account.cards.length})</h5>
                          {account.cards.map(card => (
                            <div key={card.id} style={styles.cardInfo}>
                              <div style={styles.cardHeader}>
                                <span style={styles.cardType}>{card.card_type?.toUpperCase()}</span>
                                <span style={{
                                  ...styles.statusBadge,
                                  backgroundColor: card.status === 'active' ? '#10b981' : card.status === 'blocked' ? '#ef4444' : '#6b7280'
                                }}>
                                  {card.status}
                                </span>
                              </div>
                              <p style={styles.cardDetail}>**** **** **** {card.card_number?.slice(-4)}</p>
                              <p style={styles.cardDetail}>Expires: {card.expiry_date}</p>
                              {card.is_locked && <span style={styles.badgeWarning}>🔒 Locked</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noAccounts}>No accounts found</p>
              )}

              <div style={styles.actionButtons}>
                <button
                  onClick={() => handleResendEnrollment(user)}
                  disabled={actionLoading[`resend_${user.id}`]}
                  style={styles.actionButton}
                >
                  {actionLoading[`resend_${user.id}`] ? '⏳ Sending...' : '📧 Resend Enrollment'}
                </button>
                <button
                  onClick={() => handleForcePasswordReset(user)}
                  disabled={actionLoading[`reset_${user.id}`]}
                  style={styles.actionButtonSecondary}
                >
                  {actionLoading[`reset_${user.id}`] ? '⏳ Sending...' : '🔑 Reset Password'}
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  disabled={actionLoading[`delete_${user.id}`]}
                  style={styles.actionButtonDanger}
                >
                  {actionLoading[`delete_${user.id}`] ? '⏳ Deleting...' : '🗑️ Delete User'}
                </button>
              </div>
            </div>
          ))}

          {usersData.length === 0 && (
            <div style={styles.noData}>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
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
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
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
  badgeWarning: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block',
    marginTop: '8px'
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
  accountsSection: {
    marginTop: '20px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '15px'
  },
  accountCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '15px',
    background: '#fafafa'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  accountType: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af'
  },
  statusBadge: {
    color: 'white',
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600'
  },
  accountNumber: {
    fontSize: '13px',
    color: '#475569',
    margin: '5px 0'
  },
  balance: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#059669',
    margin: '5px 0'
  },
  cardsSection: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e2e8f0'
  },
  cardsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '10px'
  },
  cardInfo: {
    background: 'white',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  cardType: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#7c3aed'
  },
  cardDetail: {
    fontSize: '12px',
    color: '#64748b',
    margin: '3px 0'
  },
  noAccounts: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '20px',
    fontStyle: 'italic'
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
  actionButtonDanger: {
    background: '#ef4444',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px'
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
  }
};
