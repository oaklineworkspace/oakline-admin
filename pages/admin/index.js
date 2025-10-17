
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminNavigationHub() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  const adminPages = [
    {
      category: '📊 Dashboard & Overview',
      pages: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏦', description: 'Main admin dashboard with stats' },
        { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥', description: 'Complete user management panel' },
        { name: 'All Users Info', path: '/admin/all-users-info', icon: '📋', description: 'View all user information' },
      ]
    },
    {
      category: '👤 User Management',
      pages: [
        { name: 'Admin Users', path: '/admin/admin-users', icon: '👨‍💼', description: 'Manage customer users' },
        { name: 'Admin Users Management', path: '/admin/admin-users-management', icon: '🔐', description: 'Manage admin users & permissions' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕', description: 'Create new user account' },
        { name: 'Delete User', path: '/admin/delete-user', icon: '🗑️', description: 'Delete user accounts' },
      ]
    },
    {
      category: '💳 Card Management',
      pages: [
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝', description: 'Review card applications' },
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '💳', description: 'Manage all cards' },
        { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫', description: 'Issue new debit cards' },
        { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗', description: 'Assign cards to users' },
        { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪', description: 'Test card transaction processing' },
      ]
    },
    {
      category: '💰 Financial Operations',
      pages: [
        { name: 'Transactions', path: '/admin/admin-transactions', icon: '💸', description: 'View all transactions' },
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✍️', description: 'Create manual transactions' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦', description: 'Process bulk transactions' },
        { name: 'Admin Balance', path: '/admin/admin-balance', icon: '💵', description: 'Manage account balances' },
      ]
    },
    {
      category: '✅ Approvals & Applications',
      pages: [
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️', description: 'Approve new accounts' },
        { name: 'Admin Approvals', path: '/admin/admin-approvals', icon: '👍', description: 'Review pending approvals' },
        { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '📧', description: 'Resend enrollment links' },
      ]
    },
    {
      category: '🏦 Banking Services',
      pages: [
        { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠', description: 'Manage loan applications' },
        { name: 'Investments', path: '/admin/admin-investments', icon: '📈', description: 'Manage investments' },
        { name: 'Crypto Management', path: '/admin/admin-crypto', icon: '₿', description: 'Cryptocurrency operations' },
      ]
    },
    {
      category: '🔧 System & Security',
      pages: [
        { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍', description: 'View system audit logs' },
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜', description: 'View system logs' },
        { name: 'Reports', path: '/admin/admin-reports', icon: '📊', description: 'Generate reports' },
        { name: 'Settings', path: '/admin/admin-settings', icon: '⚙️', description: 'System settings' },
        { name: 'Roles & Permissions', path: '/admin/admin-roles', icon: '🎭', description: 'Manage user roles' },
        { name: 'Notifications', path: '/admin/admin-notifications', icon: '🔔', description: 'System notifications' },
      ]
    }
  ];

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Admin Navigation Center</h1>
          <p style={styles.subtitle}>Access all admin pages</p>
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
          <h1 style={styles.title}>🏦 Admin Navigation Center</h1>
          <p style={styles.subtitle}>Quick access to all administrative pages</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          🚪 Logout
        </button>
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
    paddingBottom: '60px'
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
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
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
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
    }
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
