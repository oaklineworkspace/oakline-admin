import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

function AdminDashboard() {
  const [bankStats, setBankStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, signOut } = useAuth();

  // State for dashboard statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    pendingApplications: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch statistics in parallel
      const [usersResult, accountsResult, transactionsResult, pendingResult] = await Promise.allSettled([
        // Get total users count from profiles table
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        // Get total accounts count from accounts table
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        // Get total transactions count from transactions table
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        // Get pending applications count from applications table
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      const newStats = {
        totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
        totalAccounts: accountsResult.status === 'fulfilled' ? (accountsResult.value.count || 0) : 0,
        totalTransactions: transactionsResult.status === 'fulfilled' ? (transactionsResult.value.count || 0) : 0,
        pendingApplications: pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0
      };

      setStats(newStats);

      // Fetch recent users from profiles table (last 5)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (usersError) {
        console.warn('Users fetch error:', usersError);
      } else {
        setRecentUsers(usersData || []);
      }

      // Fetch recent transactions from transactions table (last 10)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, type, amount, status, created_at, description')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.warn('Transactions fetch error:', transactionsError);
      } else {
        setRecentTransactions(transactionsData || []);
      }

      // Calculate bank statistics from real data
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('balance, status');

      if (!accountsError && accountsData) {
        const totalBalance = accountsData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
        const activeAccounts = accountsData.filter(acc => acc.status === 'active').length;

        setBankStats({
          totalUsers: newStats.totalUsers,
          totalAccounts: newStats.totalAccounts,
          totalBalance: totalBalance,
          activeAccounts: activeAccounts,
          totalTransactions: newStats.totalTransactions,
          pendingApplications: newStats.pendingApplications
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Some features may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.title}>🏦 Admin Dashboard</h1>
          <p style={styles.subtitle}>Oakline Bank Management System</p>
          <p style={styles.welcomeText}>Welcome back, {user?.email}</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchDashboardData} style={styles.refreshButton} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>{stats.totalUsers.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Users</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏦</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>{stats.totalAccounts.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Accounts</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>{stats.totalTransactions.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Transactions</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statInfo}>
            <h3 style={styles.statNumber}>{stats.pendingApplications.toLocaleString()}</h3>
            <p style={styles.statLabel}>Pending Applications</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <button style={styles.actionButton} onClick={() => router.push('/users')}>
          👥 Manage Users
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/approve-accounts')}>
          ✅ Approve Accounts
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/manual-transactions')}>
          💰 Manual Transactions
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/balance')}>
          💳 Balance Management
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/cards-dashboard')}>
          💳 Cards Dashboard
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/create-user')}>
          ➕ Create User
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/reports')}>
          📊 Reports
        </button>
        <button style={styles.actionButton} onClick={() => router.push('/audit')}>
          🔍 Audit Logs
        </button>
      </div>

      {/* Recent Activity */}
      <div style={styles.activityGrid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p style={styles.noData}>No recent users</p>
          ) : (
            <ul style={styles.activityList}>
              {recentUsers.map((user) => (
                <li key={user.id} style={styles.activityItem}>
                  <span>{user.full_name || user.email}</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💸 Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p style={styles.noData}>No recent transactions</p>
          ) : (
            <ul style={styles.activityList}>
              {recentTransactions.map((tx) => (
                <li key={tx.id} style={styles.activityItem}>
                  <span>{tx.type} - ${parseFloat(tx.amount || 0).toFixed(2)}</span>
                  <span style={{
                    color: tx.status === 'completed' ? '#10b981' : 
                           tx.status === 'pending' ? '#f59e0b' : '#ef4444'
                  }}>
                    {tx.status}
                  </span>
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
            <Link href="/users" style={styles.adminButton}>
              👤 Manage Users
            </Link>
            <Link href="/users-management" style={styles.adminButton}>
              👨‍💼 Admin Users
            </Link>
            <Link href="/create-user" style={styles.adminButton}>
              ➕ Create User
            </Link>
            <Link href="/delete-user" style={styles.adminButton}>
              🗑️ Delete User
            </Link>
            <Link href="/roles" style={styles.adminButton}>
              🔐 User Roles
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💰 Financial Management</h2>
          <div style={styles.buttonGrid}>
            <Link href="/balance" style={styles.adminButton}>
              💳 Balance Management
            </Link>
            <Link href="/transactions" style={styles.adminButton}>
              📊 All Transactions
            </Link>
            <Link href="/manual-transactions" style={styles.adminButton}>
              ✍️ Manual Transactions
            </Link>
            <Link href="/bulk-transactions" style={styles.adminButton}>
              📦 Bulk Transactions
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏦 Banking Operations</h2>
          <div style={styles.buttonGrid}>
            <Link href="/loans" style={styles.adminButton}>
              🏠 Loan Management
            </Link>
            <Link href="/crypto" style={styles.adminButton}>
              ₿ Crypto Operations
            </Link>
            <Link href="/investments" style={styles.adminButton}>
              📈 Investment Management
            </Link>
            <Link href="/approvals" style={styles.adminButton}>
              ✅ Approvals Queue
            </Link>
            <Link href="/approve-accounts" style={styles.adminButton}>
              ✅ Approve Accounts
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💳 Card Management</h2>
          <div style={styles.buttonGrid}>
            <Link href="/cards-dashboard" style={styles.adminButton}>
              💳 All Cards Dashboard
            </Link>
            <Link href="/card-applications" style={styles.adminButton}>
              📄 Card Applications
            </Link>
            <Link href="/assign-card" style={styles.adminButton}>
              🎯 Assign Cards
            </Link>
            <Link href="/issue-debit-card" style={styles.adminButton}>
              🆕 Issue Debit Card
            </Link>
            <Link href="/test-card-transactions" style={styles.adminButton}>
              🧪 Test Card Transactions
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Reports & Compliance</h2>
          <div style={styles.buttonGrid}>
            <Link href="/reports" style={styles.adminButton}>
              📊 Financial Reports
            </Link>
            <Link href="/audit" style={styles.adminButton}>
              🔍 Audit Logs
            </Link>
            <Link href="/logs" style={styles.adminButton}>
              📝 System Logs
            </Link>
            <Link href="/notifications" style={styles.adminButton}>
              🔔 Send Notifications
            </Link>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ System Settings</h2>
          <div style={styles.buttonGrid}>
            <Link href="/settings" style={styles.adminButton}>
              ⚙️ System Settings
            </Link>
            <Link href="/resend-enrollment" style={styles.adminButton}>
              📧 Resend Enrollment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
    padding: '20px',
    paddingBottom: '80px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
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
  welcomeText: {
    fontSize: '14px',
    color: '#666',
    margin: 0
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
  errorMessage: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
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
    transition: 'transform 0.2s, box-shadow 0.2s'
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
  noData: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
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
    transition: 'transform 0.2s, box-shadow 0.2s'
  }
};