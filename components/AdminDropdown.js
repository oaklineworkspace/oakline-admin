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

  const coreAdminFunctions = [
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
        { name: 'Customer Users', path: '/admin/admin-users', icon: '👨‍💼' },
        { name: 'User Enrollment', path: '/admin/manage-user-enrollment', icon: '🔑' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕' },
        { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '📧' },
        { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️' },
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
      category: '📋 Applications',
      links: [
        { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅' },
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '💳' },
      ]
    },
  ];

  const advancedFeatures = [
    {
      category: '💳 Card Management',
      links: [
        { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳' },
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '📊' },
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝' },
        { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪' },
        { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫' },
        { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗' },
      ]
    },
    {
      category: '💸 Transactions',
      links: [
        { name: 'All Transactions', path: '/admin/admin-transactions', icon: '💸' },
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✏️' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Mobile Check Deposits', path: '/admin/mobile-check-deposits', icon: '📱' },
        { name: 'Transaction Reports', path: '/admin/admin-reports', icon: '📊' },
        { name: 'Account Balances', path: '/admin/admin-balance', icon: '💵' },
      ]
    },
    {
      category: '💼 Financial Services',
      links: [
        { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠' },
        { name: 'Investments', path: '/admin/admin-investments', icon: '📈' },
        { name: 'Crypto Management', path: '/admin/admin-crypto', icon: '₿' },
      ]
    },
    {
      category: '⚙️ Settings & Security',
      links: [
        { name: 'Admin Settings', path: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜' },
        { name: 'Reports', path: '/admin/admin-reports', icon: '📊' },
        { name: 'Roles & Permissions', path: '/admin/admin-roles', icon: '🎭' },
        { name: 'Notifications', path: '/admin/admin-notifications', icon: '🔔' },
        { name: 'Broadcast Messages', path: '/admin/broadcast-messages', icon: '📢' },
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
              <h3 style={styles.dropdownTitle}>🏦 Admin Navigation Center</h3>
              <Link href="/admin" style={styles.viewAllLink} onClick={() => setIsOpen(false)}>
                Admin Hub →
              </Link>
            </div>

            <div style={styles.twoColumnLayout}>
              <div style={styles.columnSection}>
                <div style={styles.columnHeader}>
                  <span style={styles.columnHeaderIcon}>🎯</span>
                  <h4 style={styles.columnHeaderTitle}>Core Admin Functions</h4>
                </div>
                <div style={styles.columnContent}>
                  {coreAdminFunctions.map((section, index) => (
                    <div key={index} style={styles.section}>
                      <h5 style={styles.sectionTitle}>{section.category}</h5>
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
                            <span style={styles.linkArrow}>→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.columnDivider}></div>

              <div style={styles.columnSection}>
                <div style={styles.columnHeader}>
                  <span style={styles.columnHeaderIcon}>⚡</span>
                  <h4 style={styles.columnHeaderTitle}>Advanced Features</h4>
                </div>
                <div style={styles.columnContent}>
                  {advancedFeatures.map((section, index) => (
                    <div key={index} style={styles.section}>
                      <h5 style={styles.sectionTitle}>{section.category}</h5>
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
                            <span style={styles.linkArrow}>→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.dropdownFooter}>
              <p style={styles.footerText}>
                Manage your banking platform with full administrative control
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    boxShadow: '0 8px 20px rgba(30, 64, 175, 0.4)',
    position: 'relative',
    overflow: 'hidden'
  },
  buttonActive: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 28px rgba(30, 64, 175, 0.5)'
  },
  icon: {
    fontSize: '1.25rem'
  },
  arrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease',
    marginLeft: '0.25rem'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 9998,
    animation: 'fadeIn 0.2s ease'
  },
  dropdown: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
    border: '2px solid #e2e8f0',
    width: '92vw',
    maxWidth: '1400px',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease'
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.75rem 2rem',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderBottom: '3px solid #1e40af',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderRadius: '20px 20px 0 0'
  },
  dropdownTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '700',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderRadius: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)'
  },
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2px 1fr',
    gap: '2rem',
    padding: '2rem'
  },
  columnSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)'
  },
  columnHeaderIcon: {
    fontSize: '1.75rem'
  },
  columnHeaderTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  columnDivider: {
    width: '2px',
    background: 'linear-gradient(180deg, transparent 0%, #cbd5e1 20%, #cbd5e1 80%, transparent 100%)',
    borderRadius: '1px'
  },
  columnContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  section: {
    backgroundColor: '#f8fafc',
    padding: '1.25rem',
    borderRadius: '14px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 1rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #dbeafe'
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb'
  },
  linkIcon: {
    fontSize: '1.15rem',
    width: '26px',
    textAlign: 'center'
  },
  linkText: {
    flex: 1
  },
  linkArrow: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    transition: 'all 0.2s ease'
  },
  dropdownFooter: {
    padding: '1.5rem 2rem',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderTop: '2px solid #e2e8f0',
    borderRadius: '0 0 20px 20px',
    textAlign: 'center'
  },
  footerText: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: '500'
  }
};