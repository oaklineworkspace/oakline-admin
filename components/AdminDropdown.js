
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    setIsAuthenticated(adminAuth === 'true');
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-dropdown-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const adminPages = [
    {
      category: '📊 Dashboard & Overview',
      links: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏠' },
        { name: 'Admin Reports', path: '/admin/admin-reports', icon: '📈' },
        { name: 'Admin Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
      ]
    },
    {
      category: '👥 User Management',
      links: [
        { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥' },
        { name: 'User Enrollment', path: '/admin/manage-user-enrollment', icon: '📝' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕' },
        { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️' },
      ]
    },
    {
      category: '📋 Applications',
      links: [
        { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅' },
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '💳' },
      ]
    },
    {
      category: '🏦 Account Management',
      links: [
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Manage Accounts', path: '/admin/manage-accounts', icon: '🏦' },
        { name: 'Account Balance', path: '/admin/admin-balance', icon: '💰' },
      ]
    },
    {
      category: '💳 Card Management',
      links: [
        { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳' },
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '📊' },
        { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪' },
      ]
    },
    {
      category: '💸 Transactions',
      links: [
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✏️' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Admin Transactions', path: '/admin/admin-transactions', icon: '💸' },
      ]
    },
    {
      category: '💼 Financial Services',
      links: [
        { name: 'Admin Loans', path: '/admin/admin-loans', icon: '💼' },
        { name: 'Admin Investments', path: '/admin/admin-investments', icon: '📈' },
        { name: 'Admin Crypto', path: '/admin/admin-crypto', icon: '₿' },
      ]
    },
    {
      category: '⚙️ Settings & Security',
      links: [
        { name: 'Admin Settings', path: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Admin Roles', path: '/admin/admin-roles', icon: '👑' },
        { name: 'Admin Logs', path: '/admin/admin-logs', icon: '📝' },
        { name: 'Notifications', path: '/admin/admin-notifications', icon: '🔔' },
      ]
    }
  ];

  if (!isAuthenticated) {
    return (
      <div style={styles.container} className="admin-dropdown-container">
        <Link href="/admin" style={styles.button}>
          <span style={styles.icon}>🔐</span>
          Admin Login
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container} className="admin-dropdown-container">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          ...styles.button,
          ...(isOpen ? styles.buttonActive : {})
        }}
      >
        <span style={styles.icon}>🔐</span>
        Admin Panel
        <span style={{
          ...styles.arrow,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)}></div>
          <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}>
              <h3 style={styles.dropdownTitle}>Admin Navigation</h3>
              <Link href="/admin/admin-dashboard" style={styles.viewAllLink} onClick={() => setIsOpen(false)}>
                Dashboard Home
              </Link>
            </div>

            <div style={styles.dropdownContent}>
              {adminPages.map((section, index) => (
                <div key={index} style={styles.section}>
                  <h4 style={styles.sectionTitle}>{section.category}</h4>
                  <div style={styles.linkList}>
                    {section.links.map((link, linkIndex) => (
                      <Link
                        key={linkIndex}
                        href={link.path}
                        style={styles.link}
                        onClick={() => setIsOpen(false)}
                      >
                        <span style={styles.linkIcon}>{link.icon}</span>
                        <span style={styles.linkText}>{link.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none'
  },
  buttonActive: {
    backgroundColor: '#1e3a8a',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  icon: {
    fontSize: '1.1rem'
  },
  arrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.2s ease',
    marginLeft: '0.25rem'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998
  },
  dropdown: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    border: '2px solid #e2e8f0',
    width: '90vw',
    maxWidth: '1200px',
    maxHeight: '85vh',
    overflowY: 'auto',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease-out'
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1
  },
  dropdownTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '0.5rem 1rem',
    backgroundColor: '#dbeafe',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  },
  dropdownContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    padding: '1.5rem'
  },
  section: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: '0 0 0.75rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    backgroundColor: 'white'
  },
  linkIcon: {
    fontSize: '1.1rem',
    width: '24px',
    textAlign: 'center'
  },
  linkText: {
    flex: 1
  }
};
