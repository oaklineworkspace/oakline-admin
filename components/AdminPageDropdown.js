import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminPageDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-page-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const adminSections = [
    {
      title: 'Admin Control',
      icon: '🛡️',
      color: '#8B5CF6',
      items: [
        { name: 'Admin Dashboard', href: '/admin/admin-dashboard', icon: '🏠' },
        { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
        { name: 'Create Admin', href: '/admin/register', icon: '➕' },
        { name: 'Admin Login', href: '/admin/login', icon: '🔐' }
      ]
    },
    {
      title: 'User Management',
      icon: '👥',
      color: '#1A3E6F',
      items: [
        { name: 'All Users', href: '/admin/manage-all-users', icon: '👥' },
        { name: 'Customer Users', href: '/admin/admin-users', icon: '👨‍💼' },
        { name: 'Create User', href: '/admin/create-user', icon: '➕' },
        { name: 'User Enrollment', href: '/admin/manage-user-enrollment', icon: '🔑' },
        { name: 'Resend Enrollment', href: '/admin/resend-enrollment', icon: '📧' },
        { name: 'Delete User by ID', href: '/admin/delete-user-by-id', icon: '🗑️' },
        { name: 'Delete Users', href: '/admin/delete-users', icon: '⚠️' },
        { name: 'Delete User Loans', href: '/admin/delete-user-loans', icon: '🏠' }
      ]
    },
    {
      title: 'Accounts & Applications',
      icon: '🏦',
      color: '#FFC857',
      items: [
        { name: 'Approve Applications', href: '/admin/approve-applications', icon: '✅' },
        { name: 'Approve Accounts', href: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Account Requests', href: '/admin/manage-account-requests', icon: '📋' },
        { name: 'Manage Accounts', href: '/admin/manage-accounts', icon: '🏦' },
        { name: 'Manage Account Types', href: '/admin/manage-account-types', icon: '💳' },
        { name: 'Card Applications', href: '/admin/admin-card-applications', icon: '💳' },
        { name: 'User Details Lookup', href: '/admin/user-details', icon: '🔍' }
      ]
    },
    {
      title: 'Transactions & Cards',
      icon: '💸',
      color: '#059669',
      items: [
        { name: 'All Transactions', href: '/admin/admin-transactions', icon: '💸' },
        { name: 'User Transfers', href: '/admin/admin-transfers', icon: '🔄' },
        { name: 'Manual Transactions', href: '/admin/manual-transactions', icon: '✏️' },
        { name: 'Bulk Transactions', href: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Generate Transactions', href: '/admin/generate-transactions', icon: '🎲' },
        { name: 'Mobile Check Deposits', href: '/admin/mobile-check-deposits', icon: '📱' },
        { name: 'Bulk Import Transactions', href: '/admin/bulk-import-transactions', icon: '📥' },
        { name: 'Delete User Transactions', href: '/admin/delete-user-transactions', icon: '🗑️' },
        { name: 'Cards Dashboard', href: '/admin/admin-cards-dashboard', icon: '📊' },
        { name: 'Issue Debit Card', href: '/admin/issue-debit-card', icon: '🎫' },
        { name: 'Manage Cards', href: '/admin/manage-cards', icon: '💳' },
        { name: 'Assign Card', href: '/admin/admin-assign-card', icon: '🔗' }
      ]
    },
    {
      title: 'Loans & Investments',
      icon: '🏠',
      color: '#14b8a6',
      items: [
        { name: 'Loans Management', href: '/admin/admin-loans', icon: '🏠' },
        { name: 'Loan Types', href: '/admin/loan-types', icon: '💼' },
        { name: 'Loan Payments', href: '/admin/loan-payments', icon: '💵' },
        { name: 'Manage Loan Wallets', href: '/admin/manage-loan-wallets', icon: '💰' },
        { name: 'Investments', href: '/admin/admin-investments', icon: '📈' }
      ]
    },
    {
      title: 'Crypto Management',
      icon: '₿',
      color: '#F59E0B',
      items: [
        { name: 'Crypto Dashboard', href: '/admin/admin-crypto', icon: '₿' },
        { name: 'Manage Crypto Wallets', href: '/admin/manage-crypto-wallets', icon: '🔑' },
        { name: 'Manage Crypto Deposits', href: '/admin/manage-crypto-deposits', icon: '💰' },
        { name: 'Assign Crypto Wallets', href: '/admin/assign-crypto-wallets', icon: '🔗' },
        { name: 'Manage Crypto Assets', href: '/admin/manage-crypto-assets', icon: '⚙️' }
      ]
    },
    {
      title: 'Reports & Analytics',
      icon: '📊',
      color: '#8B5CF6',
      items: [
        { name: 'Admin Reports', href: '/admin/admin-reports', icon: '📈' },
        { name: 'Audit Trail', href: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', href: '/admin/admin-logs', icon: '📜' },
        { name: 'Email Logs', href: '/admin/email-logs', icon: '📧' },
        { name: 'Account Balances', href: '/admin/admin-balance', icon: '💰' },
        { name: 'Treasury Account', href: '/admin/treasury', icon: '🏛️' },
        { name: 'Credit Scores', href: '/admin/credit-scores', icon: '📊' }
      ]
    },
    {
      title: 'System & Security',
      icon: '🔧',
      color: '#94a3b8',
      items: [
        { name: 'Bank Details', href: '/admin/manage-bank-details', icon: '🏦' },
        { name: 'Admin Settings', href: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Roles & Permissions', href: '/admin/admin-roles', icon: '🔑' },
        { name: 'Notifications', href: '/admin/admin-notifications', icon: '🔔' },
        { name: 'Edit User Timestamps', href: '/admin/edit-user-timestamps', icon: '⏰' },
        { name: 'Database Explorer', href: '/admin/database-explorer', icon: '🗄️' },
        { name: 'File Browser', href: '/admin/file-browser', icon: '📁' }
      ]
    },
    {
      title: 'Communications',
      icon: '💬',
      color: '#EC4899',
      items: [
        { name: 'User Messages', href: '/admin/messages', icon: '💬' },
        { name: 'Broadcast Messages', href: '/admin/broadcast-messages', icon: '📣' }
      ]
    },
    {
      title: 'Testing & Tools',
      icon: '🛠️',
      color: '#6366F1',
      items: [
        { name: 'Account Requests', href: '/admin/manage-account-requests', icon: '📋' },
        { name: 'Test Card Transactions', href: '/admin/test-card-transactions', icon: '🧪' }
      ]
    }
  ];

  return (
    <div className="admin-page-dropdown" style={styles.container}>
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
        <span style={styles.buttonIcon}>⚡</span>
        <span style={styles.buttonText}>Quick Access</span>
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
              <h2 style={styles.dropdownTitle}>Admin Quick Access</h2>
              <p style={styles.dropdownSubtitle}>Navigate to key administrative functions</p>
            </div>

            <div style={styles.sectionsGrid}>
              {adminSections.map((section, sectionIndex) => (
                <div key={sectionIndex} style={styles.section}>
                  <div style={{
                    ...styles.sectionHeader,
                    borderLeft: `4px solid ${section.color}`
                  }}>
                    <span style={styles.sectionIcon}>{section.icon}</span>
                    <h3 style={styles.sectionTitle}>{section.title}</h3>
                  </div>
                  <div style={styles.itemsList}>
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(item.href);
                        }}
                        style={styles.item}
                      >
                        <span style={styles.itemIcon}>{item.icon}</span>
                        <span style={styles.itemName}>{item.name}</span>
                        <span style={{ ...styles.itemArrow, color: section.color }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.dropdownFooter}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin');
                }}
                style={styles.viewAllButton}
              >
                📋 View All Admin Pages
              </button>
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
    gap: '0.75rem',
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #FFC857 0%, #FFD687 100%)',
    color: '#1A3E6F',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(255, 200, 87, 0.4)'
  },
  buttonActive: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(255, 200, 87, 0.5)'
  },
  buttonIcon: {
    fontSize: '1.25rem'
  },
  buttonText: {
    fontSize: '1rem'
  },
  arrow: {
    fontSize: '0.75rem',
    transition: 'transform 0.3s ease'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 9998
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
    width: '90vw',
    maxWidth: '900px',
    maxHeight: '85vh',
    overflowY: 'auto',
    zIndex: 9999,
    padding: '2.5rem'
  },
  dropdownHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '3px solid #1A3E6F'
  },
  dropdownTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 0.5rem 0'
  },
  dropdownSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  section: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '2px solid #e2e8f0'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingLeft: '0.75rem'
  },
  sectionIcon: {
    fontSize: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: 0
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  },
  itemIcon: {
    fontSize: '1.1rem',
    width: '24px',
    textAlign: 'center'
  },
  itemName: {
    flex: 1,
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  itemArrow: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  dropdownFooter: {
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '2px solid #e2e8f0'
  },
  viewAllButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem 2.5rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
    border: 'none',
    cursor: 'pointer'
  }
};