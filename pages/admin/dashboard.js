
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminPageDropdown from '../../components/AdminPageDropdown';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccounts: 0,
    pendingApplications: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !adminProfile) {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setCurrentAdmin(adminProfile);
      await Promise.all([fetchAdmins(), fetchStats()]);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAdmins(data);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, accountsRes, appsRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('application_status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalAccounts: accountsRes.count || 0,
        pendingApplications: appsRes.count || 0,
        totalTransactions: transactionsRes.count || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDeleteAdmin = async (adminId, email) => {
    if (!confirm(`Are you sure you want to delete admin: ${email}?`)) return;

    setDeletingId(adminId);
    try {
      const response = await fetch('/api/admin/delete-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId })
      });

      if (response.ok) {
        await fetchAdmins();
        alert('Admin deleted successfully');
      } else {
        const result = await response.json();
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert(`Error deleting admin: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin':
        return { bg: '#FFC857', text: '#1A3E6F', border: '#FFD687' };
      case 'manager':
        return { bg: '#E0F2FE', text: '#1A3E6F', border: '#BAE6FD' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin': return '👑';
      case 'manager': return '📊';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Professional Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <div style={styles.logoSection}>
              <img 
                src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
                alt="Oakline Bank" 
                style={styles.logo}
              />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <p style={styles.brandTagline}>Admin Control Center</p>
              </div>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.adminInfo}>
              <div style={styles.adminAvatar}>
                {currentAdmin?.email.charAt(0).toUpperCase()}
              </div>
              <div style={styles.adminDetails}>
                <p style={styles.adminEmail}>{currentAdmin?.email}</p>
                <div style={{
                  ...styles.roleBadge,
                  backgroundColor: getRoleBadgeClass(currentAdmin?.role).bg,
                  color: getRoleBadgeClass(currentAdmin?.role).text,
                  border: `1px solid ${getRoleBadgeClass(currentAdmin?.role).border}`
                }}>
                  {getRoleIcon(currentAdmin?.role)} {currentAdmin?.role?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
            
            <div style={styles.headerActions}>
              <AdminPageDropdown />
              <button onClick={handleLogout} style={styles.logoutButton}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.mainContent}>
        {/* Welcome Banner */}
        <div style={styles.welcomeBanner}>
          <div>
            <h2 style={styles.welcomeTitle}>Welcome Back, Administrator</h2>
            <p style={styles.welcomeSubtitle}>Here's what's happening with your banking platform today</p>
          </div>
          <Link href="/admin" style={styles.allPagesButton}>
            📋 All Admin Pages
          </Link>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, ...styles.statCard1 }}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Users</p>
              <p style={styles.statValue}>{stats.totalUsers.toLocaleString()}</p>
              <p style={styles.statChange}>Active customers</p>
            </div>
          </div>

          <div style={{ ...styles.statCard, ...styles.statCard2 }}>
            <div style={styles.statIcon}>🏦</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Accounts</p>
              <p style={styles.statValue}>{stats.totalAccounts.toLocaleString()}</p>
              <p style={styles.statChange}>All account types</p>
            </div>
          </div>

          <div style={{ ...styles.statCard, ...styles.statCard3 }}>
            <div style={styles.statIcon}>📝</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Pending Applications</p>
              <p style={styles.statValue}>{stats.pendingApplications.toLocaleString()}</p>
              <p style={styles.statChange}>Awaiting review</p>
            </div>
          </div>

          <div style={{ ...styles.statCard, ...styles.statCard4 }}>
            <div style={styles.statIcon}>💳</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Transactions</p>
              <p style={styles.statValue}>{stats.totalTransactions.toLocaleString()}</p>
              <p style={styles.statChange}>All time</p>
            </div>
          </div>
        </div>

        {/* Admin Team Section */}
        <div style={styles.adminSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Admin Team Management</h2>
              <p style={styles.sectionSubtitle}>Manage administrator accounts and permissions</p>
            </div>
            {currentAdmin?.role === 'super_admin' && (
              <Link href="/admin/register" style={styles.createAdminButton}>
                ➕ Create New Admin
              </Link>
            )}
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  <th style={styles.tableHeader}>Administrator</th>
                  <th style={styles.tableHeader}>Role & Permissions</th>
                  <th style={styles.tableHeader}>Created</th>
                  {currentAdmin?.role === 'super_admin' && (
                    <th style={styles.tableHeaderRight}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const roleColors = getRoleBadgeClass(admin.role);
                  return (
                    <tr key={admin.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.adminCell}>
                          <div style={styles.adminCellAvatar}>
                            {admin.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={styles.adminCellEmail}>{admin.email}</p>
                            {admin.id === currentAdmin?.id && (
                              <span style={styles.youBadge}>You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{
                          ...styles.tableBadge,
                          backgroundColor: roleColors.bg,
                          color: roleColors.text,
                          border: `1px solid ${roleColors.border}`
                        }}>
                          {getRoleIcon(admin.role)} {admin.role.replace('_', ' ').toUpperCase()}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.dateText}>
                          {new Date(admin.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      {currentAdmin?.role === 'super_admin' && (
                        <td style={styles.tableCellRight}>
                          {admin.id !== currentAdmin?.id && (
                            <button
                              onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                              disabled={deletingId === admin.id}
                              style={{
                                ...styles.deleteButton,
                                ...(deletingId === admin.id ? styles.deleteButtonDisabled : {})
                              }}
                            >
                              {deletingId === admin.id ? '⏳ Deleting...' : '🗑️ Delete'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {admins.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyStateText}>No administrators found</p>
              </div>
            )}
          </div>
        </div>

        {/* Role Information Cards */}
        <div style={styles.roleInfoSection}>
          <h3 style={styles.roleInfoTitle}>Administrator Role Permissions</h3>
          <div style={styles.roleInfoGrid}>
            <div style={styles.roleCard}>
              <div style={styles.roleCardHeader}>
                <span style={styles.roleCardIcon}>👑</span>
                <h4 style={styles.roleCardTitle}>Super Admin</h4>
              </div>
              <ul style={styles.roleCardList}>
                <li style={styles.roleCardItem}>✅ Create and delete admins</li>
                <li style={styles.roleCardItem}>✅ Full system access</li>
                <li style={styles.roleCardItem}>✅ All manager permissions</li>
                <li style={styles.roleCardItem}>✅ Override any action</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleCardHeader}>
                <span style={styles.roleCardIcon}>📊</span>
                <h4 style={styles.roleCardTitle}>Manager</h4>
              </div>
              <ul style={styles.roleCardList}>
                <li style={styles.roleCardItem}>✅ View and approve users</li>
                <li style={styles.roleCardItem}>✅ Manage applications</li>
                <li style={styles.roleCardItem}>✅ Process transactions</li>
                <li style={styles.roleCardItem}>✅ All admin permissions</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleCardHeader}>
                <span style={styles.roleCardIcon}>👤</span>
                <h4 style={styles.roleCardTitle}>Admin</h4>
              </div>
              <ul style={styles.roleCardList}>
                <li style={styles.roleCardItem}>✅ View transactions</li>
                <li style={styles.roleCardItem}>✅ View user information</li>
                <li style={styles.roleCardItem}>✅ Generate reports</li>
                <li style={styles.roleCardItem}>✅ Basic operations</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#F5F6F8',
    paddingBottom: '2rem'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #FFC857',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1.5rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1.25rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: 0,
    lineHeight: '1.2'
  },
  brandTagline: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  adminAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: '700'
  },
  adminDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  adminEmail: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem'
  },
  welcomeBanner: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  welcomeTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0'
  },
  welcomeSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  allPagesButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
    transition: 'all 0.3s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.75rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    transition: 'all 0.3s ease'
  },
  statCard1: {
    borderLeft: '4px solid #3B82F6'
  },
  statCard2: {
    borderLeft: '4px solid #10B981'
  },
  statCard3: {
    borderLeft: '4px solid #F59E0B'
  },
  statCard4: {
    borderLeft: '4px solid #8B5CF6'
  },
  statIcon: {
    fontSize: '2.5rem',
    width: '70px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '0 0 0.25rem 0'
  },
  statChange: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  adminSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    marginBottom: '2rem'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0'
  },
  sectionSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  },
  createAdminButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #FFC857 0%, #FFD687 100%)',
    color: '#1A3E6F',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 200, 87, 0.3)',
    transition: 'all 0.3s ease'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    backgroundColor: '#F8FAFC'
  },
  tableHeader: {
    padding: '1rem 1.5rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1A3E6F',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e2e8f0'
  },
  tableHeaderRight: {
    padding: '1rem 1.5rem',
    textAlign: 'right',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1A3E6F',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e2e8f0'
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s ease'
  },
  tableCell: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.95rem',
    color: '#1e293b'
  },
  tableCellRight: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.95rem',
    color: '#1e293b',
    textAlign: 'right'
  },
  adminCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  adminCellAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    fontWeight: '700',
    flexShrink: 0
  },
  adminCellEmail: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  youBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#D1FAE5',
    color: '#059669',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  tableBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  dateText: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  deleteButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center'
  },
  emptyStateText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  roleInfoSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  },
  roleInfoTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  roleInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  roleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0'
  },
  roleCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0'
  },
  roleCardIcon: {
    fontSize: '1.75rem'
  },
  roleCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: 0
  },
  roleCardList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  roleCardItem: {
    fontSize: '0.9rem',
    color: '#475569',
    fontWeight: '500',
    lineHeight: '1.5'
  }
};
