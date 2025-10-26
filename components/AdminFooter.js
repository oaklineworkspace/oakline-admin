
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AdminFooter() {
  const router = useRouter();

  const adminLinks = [
    {
      name: 'Approve Apps',
      path: '/admin/approve-applications',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      name: 'Transactions',
      path: '/admin/manual-transactions',
      icon: '💰',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      name: 'Admin Hub',
      path: '/admin',
      icon: '🏦',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      name: 'Manage Accounts',
      path: '/admin/manage-accounts',
      icon: '🏦',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
  ];

  const isActive = (path) => router.pathname === path;

  return (
    <div style={styles.footerContainer}>
      <div style={styles.footer}>
        {adminLinks.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            style={{
              ...styles.footerButton,
              background: isActive(link.path) ? link.gradient : 'transparent',
              color: isActive(link.path) ? '#ffffff' : '#64748b',
              border: isActive(link.path) ? 'none' : '2px solid #e2e8f0'
            }}
          >
            <span style={styles.footerIcon}>{link.icon}</span>
            <span style={styles.footerLabel}>{link.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const styles = {
  footerContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#ffffff',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
    borderTop: '2px solid #e2e8f0'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0.75rem 0.5rem',
    maxWidth: '100%',
    margin: '0 auto'
  },
  footerButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '12px',
    margin: '0 0.25rem',
    maxWidth: '120px'
  },
  footerIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.25rem',
    display: 'inline-block'
  },
  footerLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    lineHeight: '1.2',
    textAlign: 'center'
  }
};
