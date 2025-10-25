import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    pendingApplications: 0,
    totalBalance: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth !== 'true') {
      router.push('/admin');
      return;
    }
    fetchStats();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    router.push('/admin');
  };

  // -------------------
  // Fetch Stats & Data
  // -------------------
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch total users from applications table
      const { data: usersData, error: usersError } = await supabase
        .from('applications')
        .select('*, profiles(*)')
        .order('submitted_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      const users = usersData || [];

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*');

      if (accountsError) console.error('Error fetching accounts:', accountsError);

      const accounts = accountsData || [];

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionsError) console.error('Error fetching transactions:', transactionsError);

      const transactions = transactionsData || [];

      // Calculate total balance
      const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

      // Recent users
      const recentUsersList = users.slice(0, 5).map(user => ({
        id: user.id,
        name: `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}`.trim(),
        email: user.email,
        created_at: user.submitted_at,
        status: user.application_status || 'pending'
      }));

      // Recent transactions
      const recentTxList = transactions.slice(0, 10);

      // Pending applications
      const pendingApplications = users.filter(u => u.application_status === 'pending').length;

      setStats({
        totalUsers: users.length,
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        pendingApplications,
        totalBalance,
      });

      setRecentUsers(recentUsersList);
      setRecentTransactions(recentTxList);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '20px' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏦 Admin Dashboard</h1>
          <p style={styles.subtitle}>Oakline Bank Administrative Control Panel</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/admin" style={styles.backButton}>
            ← Back to Menu
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Users" value={stats.totalUsers} icon="👥" color="#3b82f6" />
        <StatCard label="Total Accounts" value={stats.totalAccounts} icon="🏦" color="#10b981" />
        <StatCard label="Transactions" value={stats.totalTransactions} icon="💸" color="#8b5cf6" />
        <StatCard label="Pending Applications" value={stats.pendingApplications} icon="⏳" color="#f59e0b" />
        <StatCard label="Total Balance" value={`$${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="💰" color="#06b6d4" />
      </div>

      {/* Content Grid */}
      <div style={styles.contentGrid}>
        {/* Recent Users */}
        <div style={styles.contentCard}>
          <h2 style={styles.contentCardTitle}>👥 Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p style={styles.emptyMessage}>No recent users</p>
          ) : (
            <div style={styles.table}>
              {recentUsers.map(user => (
                <div key={user.id} style={styles.tableRow}>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.name}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                  <div style={styles.userMeta}>
                    <span style={{ ...styles.statusBadge, ...(user.status === 'approved' ? styles.statusApproved : styles.statusPending) }}>
                      {user.status}
                    </span>
                    <span style={styles.dateText}>{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div style={styles.contentCard}>
          <h2 style={styles.contentCardTitle}>💸 Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p style={styles.emptyMessage}>No recent transactions</p>
          ) : (
            <div style={styles.table}>
              {recentTransactions.slice(0, 5).map(tx => (
                <div key={tx.id} style={styles.tableRow}>
                  <div style={styles.txInfo}>
                    <div style={styles.txType}>{tx.type || 'Transaction'}</div>
                    <div style={styles.txAmount}>${parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <span style={{ ...styles.statusBadge, ...(tx.status === 'completed' ? styles.statusApproved : styles.statusPending) }}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActionsSection}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.quickActionsGrid}>
          <Link href="/admin/manage-all-users" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' } }}>
            <div style={styles.quickActionIcon}>👥</div>
            <div style={styles.quickActionText}>Manage Users</div>
          </Link>
          <Link href="/admin/approve-applications" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' } }}>
            <div style={styles.quickActionIcon}>✅</div>
            <div style={styles.quickActionText}>Approve Applications</div>
          </Link>
          <Link href="/admin/approve-accounts" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' } }}>
            <div style={styles.quickActionIcon}>✔️</div>
            <div style={styles.quickActionText}>Approve Accounts</div>
          </Link>
          <Link href="/admin/admin-transactions" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' } }}>
            <div style={styles.quickActionIcon}>💰</div>
            <div style={styles.quickActionText}>Transactions</div>
          </Link>
          <Link href="/admin/admin-card-applications" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' } }}>
            <div style={styles.quickActionIcon}>💳</div>
            <div style={styles.quickActionText}>Card Applications</div>
          </Link>
          <Link href="/admin/delete-users" style={{ ...styles.quickActionCard, ...{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' } }}>
            <div style={styles.quickActionIcon}>🗑️</div>
            <div style={styles.quickActionText}>Delete Users</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// -------------------
// Stat Card Component
// -------------------
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '32px' }}>{icon}</div>
        <div style={{
          backgroundColor: `${color}15`,
          color: color,
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          Live
        </div>
      </div>
      <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: '4px 0 0 0'
  },
  backButton: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
  },
  logoutButton: {
    background: '#ef4444',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '30px'
  },
  contentCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.05)'
  },
  contentCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '20px'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
    padding: '20px 0'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
    marginBottom: '4px'
  },
  userEmail: {
    fontSize: '13px',
    color: '#64748b'
  },
  userMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  statusApproved: {
    background: '#dcfce7',
    color: '#166534'
  },
  statusPending: {
    background: '#fef3c7',
    color: '#92400e'
  },
  dateText: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  txInfo: {
    flex: 1
  },
  txType: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
    marginBottom: '4px',
    textTransform: 'capitalize'
  },
  txAmount: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  quickActionsSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'white',
    marginBottom: '20px'
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  quickActionCard: {
    padding: '24px',
    borderRadius: '12px',
    color: 'white',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  quickActionIcon: {
    fontSize: '36px'
  },
  quickActionText: {
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
};

