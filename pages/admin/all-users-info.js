
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function AllUsersInfoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchAllUsersInfo();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchAllUsersInfo();
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const fetchAllUsersInfo = async () => {
    setLoading(true);
    try {
      // Fetch profiles which contain user information
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch cards
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      // Combine all data
      const combinedData = profiles.map(profile => {
        const userAccounts = accounts?.filter(a => a.user_id === profile.id) || [];
        
        return {
          user_id: profile.id,
          user_email: profile.email,
          created_at: profile.created_at,
          ...profile,
          accounts: userAccounts.map(acc => ({
            ...acc,
            cards: cards?.filter(c => c.account_id === acc.id) || []
          }))
        };
      });

      setUsersData(combinedData);
    } catch (error) {
      console.error('Error fetching users info:', error);
      setError('Failed to load users data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersData.filter(user => {
    const matchesSearch = user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'enrolled') return matchesSearch && user.enrollment_completed;
    if (filterStatus === 'pending') return matchesSearch && !user.enrollment_completed;
    
    return matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🔐 All Users Information</h1>
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
              Access Users Info
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
          <h1 style={styles.title}>👥 All Users Information</h1>
          <p style={styles.subtitle}>Comprehensive view of all users, accounts, and cards</p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilterStatus('all')}
            style={{...styles.filterButton, ...(filterStatus === 'all' ? styles.filterButtonActive : {})}}
          >
            All ({usersData.length})
          </button>
          <button
            onClick={() => setFilterStatus('enrolled')}
            style={{...styles.filterButton, ...(filterStatus === 'enrolled' ? styles.filterButtonActive : {})}}
          >
            Enrolled ({usersData.filter(u => u.enrollment_completed).length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            style={{...styles.filterButton, ...(filterStatus === 'pending' ? styles.filterButtonActive : {})}}
          >
            Pending ({usersData.filter(u => !u.enrollment_completed).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading users data...</div>
      ) : (
        <div style={styles.usersGrid}>
          {filteredUsers.map(user => (
            <div key={user.user_id} style={styles.userCard}>
              <div style={styles.userHeader}>
                <div>
                  <h3 style={styles.userName}>
                    {user.first_name || ''} {user.last_name || ''} {!user.first_name && !user.last_name && 'Unknown User'}
                  </h3>
                  <p style={styles.userEmail}>{user.user_email}</p>
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
                <p><strong>User ID:</strong> {user.user_id?.substring(0, 8)}...</p>
                <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                <p><strong>DOB:</strong> {user.date_of_birth || 'N/A'}</p>
                <p><strong>Country:</strong> {user.country || 'N/A'}</p>
              </div>

              {user.accounts && user.accounts.length > 0 ? (
                <div style={styles.accountsSection}>
                  <h4 style={styles.sectionTitle}>💳 Accounts ({user.accounts.length})</h4>
                  {user.accounts.map(account => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountHeader}>
                        <span style={styles.accountType}>
                          {account.account_type?.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{...styles.statusBadge, backgroundColor: account.status === 'active' ? '#10b981' : '#6b7280'}}>
                          {account.status}
                        </span>
                      </div>
                      <p style={styles.accountNumber}>Account: {account.account_number}</p>
                      <p style={styles.balance}>Balance: ${parseFloat(account.balance || 0).toFixed(2)}</p>
                      <p style={styles.accountDate}>
                        Created: {new Date(account.created_at).toLocaleDateString()}
                      </p>

                      {account.cards && account.cards.length > 0 && (
                        <div style={styles.cardsSection}>
                          <h5 style={styles.cardsTitle}>🏦 Cards ({account.cards.length})</h5>
                          {account.cards.map(card => (
                            <div key={card.id} style={styles.cardInfo}>
                              <div style={styles.cardHeader}>
                                <span style={styles.cardType}>{card.card_type?.toUpperCase()}</span>
                                <span style={{...styles.statusBadge, backgroundColor: card.status === 'active' ? '#10b981' : card.status === 'blocked' ? '#ef4444' : '#6b7280'}}>
                                  {card.status}
                                </span>
                              </div>
                              <p style={styles.cardDetail}>**** **** **** {card.card_number?.slice(-4)}</p>
                              <p style={styles.cardDetail}>Expires: {card.expiry_date}</p>
                              <p style={styles.cardDetail}>Daily Limit: ${card.daily_limit || 0}</p>
                              <p style={styles.cardDetail}>Daily Spent: ${card.daily_spent || 0}</p>
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
            </div>
          ))}

          {filteredUsers.length === 0 && (
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
    gap: '10px'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
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
  controls: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchInput: {
    flex: '1',
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '10px 20px',
    border: '2px solid #e2e8f0',
    background: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    background: '#1e3c72',
    color: 'white',
    borderColor: '#1e3c72'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '18px'
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
    marginTop: '20px'
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
  accountDate: {
    fontSize: '12px',
    color: '#94a3b8',
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
