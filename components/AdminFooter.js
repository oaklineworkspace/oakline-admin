import Link from 'next/link';
import AdminStickyDropdown from './AdminStickyDropdown';

export default function AdminFooter() {
  return (
    <div style={styles.bottomNav}>
      <Link href="/admin/approve-applications" style={styles.navButton}>
        <div style={styles.navIcon}>✅</div>
        <div style={styles.navText}>Approve</div>
      </Link>
      <Link href="/admin" style={styles.navButton}>
        <div style={styles.navIcon}>🏠</div>
        <div style={styles.navText}>Hub</div>
      </Link>
      <Link href="/admin/manage-accounts" style={styles.navButton}>
        <div style={styles.navIcon}>🏦</div>
        <div style={styles.navText}>Accounts</div>
      </Link>
      <Link href="/admin/admin-transactions" style={styles.navButton}>
        <div style={styles.navIcon}>💸</div>
        <div style={styles.navText}>Transactions</div>
      </Link>
      <AdminStickyDropdown />
    </div>
  );
}

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTop: '2px solid #e2e8f0',
    padding: '6px 3px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    gap: '2px'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#1A3E6F',
    padding: '4px 2px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '70px',
    minWidth: '50px'
  },
  navIcon: {
    fontSize: '16px',
    marginBottom: '2px'
  },
  navText: {
    fontSize: '9px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1.1'
  }
};