import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [bankStats, setBankStats] = useState(null);

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  // State to track if the user is an admin, initialized to false
  const [isAdmin, setIsAdmin] = useState(false);
  // State for general error messages
  const [adminError, setAdminError] = useState('');
  // State for dashboard statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    pendingApplications: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User authentication error:', userError);
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Unable to verify admin access. Please try again.');
        setLoading(false);
        return;
      }

      if (!profile || profile.role !== 'admin') {
        console.log('User is not admin, redirecting...');
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      console.error('Admin access error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchBankData();
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const fetchBankData = async () => {
    try {
      setLoading(true);

      // Initialize with default values
      let users = [], accounts = [], transactions = [];

      // Fetch users data from applications table (real bank customers)
      try {
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!appError && applications) {
          users = applications.map(app => ({
            id: app.id,
            email: app.email,
            name: `${app.first_name || ''} ${app.middle_name ? app.middle_name + ' ' : ''}${app.last_name || ''}`.trim(),
            created_at: app.created_at,
            phone: app.phone,
            status: app.status || 'pending'
          }));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }

      // Fetch accounts data
      try {
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!accountsError && accountsData) {
          accounts = accountsData;
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }

      // Fetch transactions data
      try {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!transactionsError && transactionsData) {
          transactions = transactionsData;
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }

      // Calculate stats with safe defaults
      const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
      const todayUsers = users.filter(user => {
        try {
          const userDate = new Date(user.created_at).toDateString();
          const today = new Date().toDateString();
          return userDate === today;
        } catch {
          return false;
        }
      }).length;

      setBankStats({
        totalUsers: users.length,
        totalAccounts: accounts.length,
        totalBalance: totalBalance,
        totalTransactions: transactions.length,
        pendingTransactions: transactions.filter(t => t.status === 'pending').length,
        activeLoans: 0,
        totalDeposits: transactions
          .filter(t => t.type === 'deposit')
          .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
        totalWithdrawals: transactions
          .filter(t => t.type === 'withdrawal')
          .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
        newUsersToday: todayUsers
      });

      setRecentUsers(users.slice(-5));
      setRecentTransactions(transactions.slice(-10));

    } catch (error) {
      console.error('Error fetching bank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel with proper error handling
      const [usersResult, accountsResult, transactionsResult, pendingResult] = await Promise.allSettled([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      const newStats = {
        totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
        totalAccounts: accountsResult.status === 'fulfilled' ? (accountsResult.value.count || 0) : 0,
        totalTransactions: transactionsResult.status === 'fulfilled' ? (transactionsResult.value.count || 0) : 0,
        pendingApplications: pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0
      };

      setStats(newStats);

      // Log any failed requests
      if (usersResult.status === 'rejected') console.warn('Failed to fetch users:', usersResult.reason);
      if (accountsResult.status === 'rejected') console.warn('Failed to fetch accounts:', accountsResult.reason);
      if (transactionsResult.status === 'rejected') console.warn('Failed to fetch transactions:', transactionsResult.reason);
      if (pendingResult.status === 'rejected') console.warn('Failed to fetch pending applications:', pendingResult.reason);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load dashboard statistics. Some features may be unavailable.');
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Oakline Bank Admin</h1>
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
              🔐 Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.title}>🏦 Admin Dashboard</h1>
          <p style={styles.subtitle}>Oakline Bank Management System</p>
          {loading && <p style={styles.loadingText}>Loading bank data...</p>}
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchBankData} style={styles.refreshButton} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statInfo}>
              <h3 style={styles.statNumber}>{stats ? (stats.totalUsers || 0).toLocaleString() : 'Loading...'}</h3>
              <p style={styles.statLabel}>Total Users</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statInfo}>
              <h3 style={styles.statNumber}>{stats ? `$${(stats.totalAccounts || 0).toLocaleString()}` : 'Loading...'}</h3>
              <p style={styles.statLabel}>Total Accounts</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statInfo}>
              <h3 style={styles.statNumber}>{stats ? (stats.totalTransactions || 0).toLocaleString() : 'Loading...'}</h3>
              <p style={styles.statLabel}>Total Transactions</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏦</div>
            <div style={styles.statInfo}>
              <h3 style={styles.statNumber}>{stats ? (stats.pendingApplications || 0).toLocaleString() : 'Loading...'}</h3>
              <p style={styles.statLabel}>Pending Applications</p>
            </div>
          </div>
        </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-users')}
        >
          👥 Manage Users
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/approve-accounts')}
        >
          ✅ Approve Accounts
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/manual-transactions')}
        >
          💰 Manual Transactions
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-balance')}
        >
          💳 Balance Management
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-cards-dashboard')}
        >
          💳 Cards Dashboard
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/create-user')}
        >
          ➕ Create User
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-reports')}
        >
          📊 Reports
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-audit')}
        >
          🔍 Audit Logs
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/bulk-transactions')}
        >
          📦 Bulk Transactions
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-loans')}
        >
          🏠 Loan Management
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-crypto')}
        >
          ₿ Crypto Management
        </button>
        <button
          style={styles.actionButton}
          onClick={() => router.push('/admin/admin-investments')}
        >
          📈 Investments
        </button>
      </div>

      {/* Recent Activity */}
      <div style={styles.activityGrid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p>No recent users</p>
          ) : (
            <ul style={styles.activityList}>
              {recentUsers.map((user) => (
                <li key={user.id} style={styles.activityItem}>
                  <span>{user.name}</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💸 Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p>No recent transactions</p>
          ) : (
            <ul style={styles.activityList}>
              {recentTransactions.map((tx) => (
                <li key={tx.id} style={styles.activityItem}>
                  <span>{tx.type} - ${tx.amount.toLocaleString()}</span>
                  <span>{tx.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Admin Navigation */}
      <div style={styles.adminGrid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 User Management</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-users" style={styles.adminButton}>
              👤 Manage Users
            </Link>
            <Link href="/admin/admin-users-management" style={styles.adminButton}>
              👨‍💼 Admin Users
            </Link>
            <Link href="/admin/create-user" style={styles.adminButton}>
              ➕ Create User
            </Link>
            <Link href="/admin/delete-user" style={styles.adminButton}>
              🗑️ Delete User
            </Link>
            <Link href="/admin/admin-roles" style={styles.adminButton}>
              🔐 User Roles
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💰 Financial Management</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-balance" style={styles.adminButton}>
              💳 Balance Management
            </Link>
            <Link href="/admin/admin-transactions" style={styles.adminButton}>
              📊 All Transactions
            </Link>
            <Link href="/admin/manual-transactions" style={styles.adminButton}>
              ✍️ Manual Transactions
            </Link>
            <Link href="/admin/bulk-transactions" style={styles.adminButton}>
              📦 Bulk Transactions
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏦 Banking Operations</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-loans" style={styles.adminButton}>
              🏠 Loan Management
            </Link>
            <Link href="/admin/admin-crypto" style={styles.adminButton}>
              ₿ Crypto Operations
            </Link>
            <Link href="/admin/admin-investments" style={styles.adminButton}>
              📈 Investment Management
            </Link>
            <Link href="/admin/admin-approvals" style={styles.adminButton}>
              ✅ Approvals Queue
            </Link>
            <Link href="/admin/approve-accounts" style={styles.adminButton}>
              ✅ Approve Accounts
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💳 Card Management</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-cards-dashboard" style={styles.adminButton}>
              💳 All Cards Dashboard
            </Link>
            <Link href="/admin/admin-card-applications" style={styles.adminButton}>
              📄 Card Applications
            </Link>
            <Link href="/admin/admin-assign-card" style={styles.adminButton}>
              🎯 Assign Cards
            </Link>
            <Link href="/admin/issue-debit-card" style={styles.adminButton}>
              🆕 Issue Debit Card
            </Link>
            <Link href="/admin/test-card-transactions" style={styles.adminButton}>
              🧪 Test Card Transactions
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Reports & Compliance</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-reports" style={styles.adminButton}>
              📊 Financial Reports
            </Link>
            <Link href="/admin/admin-audit" style={styles.adminButton}>
              🔍 Audit Logs
            </Link>
            <Link href="/admin/admin-logs" style={styles.adminButton}>
              📝 System Logs
            </Link>
            <Link href="/admin/admin-notifications" style={styles.adminButton}>
              🔔 Send Notifications
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ System Settings</h2>
          <div style={styles.buttonGrid}>
            <Link href="/admin/admin-settings" style={styles.adminButton}>
              ⚙️ System Settings
            </Link>
            <Link href="/admin/resend-enrollment" style={styles.adminButton}>
              📧 Resend Enrollment
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Footer with Buttons */}
      <footer style={styles.stickyFooter}>
        <button
          style={styles.footerButton}
          onClick={() => router.push('/apply')}
        >
          📝 Enroll Now
        </button>
        <button
          style={styles.footerButton}
          onClick={() => router.push('/signin')}
        >
          🔑 Sign In
        </button>
        <button
          style={styles.footerButton}
          onClick={() => router.push('/open-account')}
        >
          🏦 Open Account
        </button>
      </footer>
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
    padding: '20px',
    paddingBottom: '80px', // Add padding to the bottom to make space for the sticky footer
    position: 'relative', // Needed for absolute positioning of the footer
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  welcomeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  loadingText: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    ':disabled': {
      opacity: 0.7,
      cursor: 'not-allowed'
    }
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    padding: '25px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    border: '1px solid rgba(30, 58, 95, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer'
  },
  statIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    display: 'block'
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3a5f',
    margin: '0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    margin: '0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #43cea2 0%, #18b590 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    }
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px',
    marginBottom: '30px'
  },
  section: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  activityList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    maxHeight: '300px',
    overflowY: 'auto'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
    color: '#333'
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '25px'
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  adminButton: {
    display: 'block',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    }
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
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
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
  error: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center'
  },
  stickyFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: '#1e3a5f',
    padding: '15px 0',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.15)',
    zIndex: 1000,
  },
  footerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #43cea2 0%, #18b590 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    }
  }
};