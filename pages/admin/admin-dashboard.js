import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminNavDropdown from '../../components/AdminNavDropdown';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    pendingApplications: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const [usersRes, accountsRes, appsRes, transactionsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalAccounts: accountsRes.count || 0,
        pendingApplications: appsRes.count || 0,
        totalTransactions: transactionsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Admin Dashboard</h1>
          </div>
          <AdminNavDropdown />
        </div>

        {loading ? (
          <div style={styles.loading}>Loading dashboard...</div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👥</div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalUsers}</h3>
                  <p style={styles.statLabel}>Total Users</p>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>💳</div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalAccounts}</h3>
                  <p style={styles.statLabel}>Total Accounts</p>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>📝</div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.pendingApplications}</h3>
                  <p style={styles.statLabel}>Pending Applications</p>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalTransactions}</h3>
                  <p style={styles.statLabel}>Total Transactions</p>
                </div>
              </div>
            </div>

            <div style={styles.adminPagesGrid}>
              <Link href="/admin/manage-all-users" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>👥</div>
                <h3 style={styles.cardTitle}>Manage All Users</h3>
                <p style={styles.cardDescription}>View and manage all users</p>
              </Link>

              <Link href="/admin/admin-users" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>👤</div>
                <h3 style={styles.cardTitle}>Customer Users</h3>
                <p style={styles.cardDescription}>View and manage customer accounts</p>
              </Link>

              <Link href="/admin/approve-applications" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>✅</div>
                <h3 style={styles.cardTitle}>Approve Applications</h3>
                <p style={styles.cardDescription}>Review and approve applications</p>
              </Link>

              <Link href="/admin/approve-accounts" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>🏦</div>
                <h3 style={styles.cardTitle}>Approve Accounts</h3>
                <p style={styles.cardDescription}>Review and approve accounts</p>
              </Link>

              <Link href="/admin/issue-debit-card" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>💳</div>
                <h3 style={styles.cardTitle}>Issue Debit Cards</h3>
                <p style={styles.cardDescription}>Issue new debit cards</p>
              </Link>

              <Link href="/admin/admin-cards-dashboard" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>🃏</div>
                <h3 style={styles.cardTitle}>Cards Dashboard</h3>
                <p style={styles.cardDescription}>Manage all cards</p>
              </Link>

              <Link href="/admin/admin-transactions" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>💸</div>
                <h3 style={styles.cardTitle}>Transactions</h3>
                <p style={styles.cardDescription}>View all transactions</p>
              </Link>

              <Link href="/admin/manual-transactions" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>✏️</div>
                <h3 style={styles.cardTitle}>Manual Transactions</h3>
                <p style={styles.cardDescription}>Create manual transactions</p>
              </Link>

              <Link href="/admin/bulk-transactions" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>📦</div>
                <h3 style={styles.cardTitle}>Bulk Transactions</h3>
                <p style={styles.cardDescription}>Perform bulk operations</p>
              </Link>

              <Link href="/admin/admin-balance" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>💰</div>
                <h3 style={styles.cardTitle}>Balance Management</h3>
                <p style={styles.cardDescription}>Manage account balances</p>
              </Link>

              <Link href="/admin/resend-enrollment" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>📧</div>
                <h3 style={styles.cardTitle}>Resend Enrollment</h3>
                <p style={styles.cardDescription}>Resend enrollment emails</p>
              </Link>

              <Link href="/admin/delete-users" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>🗑️</div>
                <h3 style={styles.cardTitle}>Delete Users</h3>
                <p style={styles.cardDescription}>Remove users from system</p>
              </Link>

              <Link href="/admin/admin-audit" style={styles.adminPageCard}>
                <div style={styles.cardIcon}>📋</div>
                <h3 style={styles.cardTitle}>Audit Logs</h3>
                <p style={styles.cardDescription}>View system audit logs</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  header: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    fontSize: '18px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  statIcon: {
    fontSize: '48px'
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  adminPagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  adminPageCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0'
  },
  cardDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  }
};