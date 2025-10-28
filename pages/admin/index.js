import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminFooter from '../../components/AdminFooter';
import AdminNavDropdown from '../../components/AdminNavDropdown';

export default function AdminNavigationHub() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await verifyAdminUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await verifyAdminUser(session.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAdminUser = async (authUser) => {
    try {
      const { data: adminProfile, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (adminError || !adminProfile) {
        setError('Access denied. You are not authorized as an admin.');
        setIsAuthenticated(false);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }

      setIsAuthenticated(true);
      setUser({ ...authUser, role: adminProfile.role });
      setError('');
    } catch (err) {
      console.error('Error verifying admin:', err);
      setError('Error verifying admin access');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        await verifyAdminUser(data.user);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const adminPages = [
    {
      category: '📊 Dashboard & Overview',
      pages: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏦', description: 'Main admin dashboard with analytics and stats' },
        { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥', description: 'Comprehensive user management with full details' },
        { name: 'Admin Reports', path: '/admin/admin-reports', icon: '📊', description: 'Generate financial and system reports' },
        { name: 'Admin Audit', path: '/admin/admin-audit', icon: '🔍', description: 'Review system audit trails' },
      ]
    },
    {
      category: '👤 User Management',
      pages: [
        { name: 'Customer Users', path: '/admin/admin-users', icon: '👨‍💼', description: 'View and manage customer accounts' },
        { name: 'User Enrollment', path: '/admin/manage-user-enrollment', icon: '🔑', description: 'Complete user enrollment and password setup' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕', description: 'Add new user accounts' },
        { name: 'Delete User By ID', path: '/admin/delete-user-by-id', icon: '🗑️', description: 'Remove user accounts and all dependencies' },
        { name: 'Delete Users', path: '/admin/delete-users', icon: '🗑️', description: 'Bulk delete user accounts' },
      ]
    },
    {
      category: '💳 Card Management',
      pages: [
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝', description: 'Review and process card applications' },
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '💳', description: 'Manage all issued cards' },
        { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳', description: 'View and manage all cards' },
        { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫', description: 'Issue new debit cards to users' },
        { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗', description: 'Link cards to user accounts' },
        { name: 'Test Transactions', path: '/admin/test-card-transactions', icon: '🧪', description: 'Test card payment processing' },
      ]
    },
    {
      category: '💰 Financial Operations',
      pages: [
        { name: 'All Transactions', path: '/admin/admin-transactions', icon: '💸', description: 'View and monitor all transactions' },
        { name: 'Mobile Check Deposits', path: '/admin/mobile-check-deposits', icon: '📱', description: 'Review and approve mobile check deposits' },
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✍️', description: 'Create manual transactions' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦', description: 'Process multiple transactions at once' },
        { name: 'Account Balances', path: '/admin/admin-balance', icon: '💵', description: 'Manage and adjust account balances' },
      ]
    },
    {
      category: '✅ Approvals & Applications',
      pages: [
        { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅', description: 'Review and approve user applications' },
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️', description: 'Approve pending account requests' },
        { name: 'Manage Accounts', path: '/admin/manage-accounts', icon: '🏦', description: 'Manage all bank accounts' },
        { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '📧', description: 'Resend enrollment emails to users' },
      ]
    },
    {
      category: '🏦 Banking Services',
      pages: [
        { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠', description: 'Manage loan applications and approvals' },
        { name: 'Investments', path: '/admin/admin-investments', icon: '📈', description: 'Handle investment accounts' },
        { name: 'Crypto Management', path: '/admin/admin-crypto', icon: '₿', description: 'Manage cryptocurrency operations' },
      ]
    },
    {
      category: '🔧 System & Security',
      pages: [
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜', description: 'View detailed system logs' },
        { name: 'Settings', path: '/admin/admin-settings', icon: '⚙️', description: 'Configure system settings' },
        { name: 'Roles & Permissions', path: '/admin/admin-roles', icon: '🎭', description: 'Manage access control and roles' },
        { name: 'Notifications', path: '/admin/admin-notifications', icon: '🔔', description: 'System-wide notifications' },
        { name: 'Broadcast Messages', path: '/admin/broadcast-messages', icon: '📢', description: 'Send messages to all users' },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div style={styles.loginContainer}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Admin Navigation Center</h1>
          <p style={styles.subtitle}>Access all admin pages</p>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter password"
                required
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton} disabled={isLoading}>
              {isLoading ? 'Logging in...' : '🔓 Access Admin Panel'}
            </button>
          </form>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
            Only authorized admin users can access this area
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏦 Admin Navigation Center</h1>
          <p style={styles.subtitle}>Quick access to all administrative pages</p>
          {user && <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
            Logged in as: {user.email} ({user.role})
          </p>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AdminNavDropdown />
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {adminPages.map((section, index) => (
          <div key={index} style={styles.section}>
            <h2 style={styles.categoryTitle}>{section.category}</h2>
            <div style={styles.cardsGrid}>
              {section.pages.map((page, pageIndex) => (
                <Link key={pageIndex} href={page.path} style={styles.card}>
                  <div style={styles.cardIcon}>{page.icon}</div>
                  <h3 style={styles.cardTitle}>{page.name}</h3>
                  <p style={styles.cardDescription}>{page.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Total Admin Pages: <strong>{adminPages.reduce((acc, section) => acc + section.pages.length, 0)}</strong>
        </p>
      </div>

      <AdminFooter />
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
    background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '35px'
  },
  section: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  categoryTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid rgba(255,255,255,0.2)'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '25px',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'white',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 10px 0',
    color: 'white'
  },
  cardDescription: {
    fontSize: '14px',
    margin: 0,
    opacity: 0.9,
    color: 'white'
  },
  footer: {
    marginTop: '40px',
    padding: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  footerText: {
    color: 'white',
    fontSize: '16px',
    margin: 0
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
    outline: 'none'
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
    padding: '14px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};
