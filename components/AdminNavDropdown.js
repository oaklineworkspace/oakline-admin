import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminNavDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-nav-dropdown-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const adminPages = [
    {
      category: '🏦 Admin Control',
      links: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '📊' },
        { name: 'Create Admin', path: '/admin/register', icon: '➕' },
        { name: 'Admin Login', path: '/admin/login', icon: '🔐' },
        { name: 'Bank Details', path: '/admin/manage-bank-details', icon: '🏦' },
      ]
    },
    {
      category: '👥 User Management',
      links: [
        { name: 'Manage Enrollment', path: '/admin/manage-user-enrollment', icon: '📧' },
        { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '🔄' },
        { name: 'View User Documents', path: '/admin/view-user-documents', icon: '📄' },
        { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️' },
        { name: 'Delete Users', path: '/admin/delete-users', icon: '⚠️' },
      ]
    },
    {
      category: '🛠️ Testing & Tools',
      links: [
        { name: 'Account Requests', path: '/admin/manage-account-requests', icon: '📋' },
        { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪' },
      ]
    },
    {
      category: '📊 Dashboard & Reports',
      links: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏠' },
        { name: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
        { name: 'Reports', path: '/admin/admin-reports', icon: '📈' },
        { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜' },
        { name: 'Email Logs', path: '/admin/email-logs', icon: '📧' }
      ]
    },
    {
      category: '👥 User Management',
      links: [
        { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥' },
        { name: 'User Enrollment', path: '/admin/manage-user-enrollment', icon: '📝' },
        { name: 'Customer Users', path: '/admin/admin-users', icon: '👨‍💼' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕' },
        { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️' },
        { name: 'Credit Scores', path: '/admin/credit-scores', icon: '📊' },
      ]
    },
    {
      category: '🏦 Account Management',
      links: [
        { name: 'Manage Accounts', path: '/admin/manage-accounts', icon: '🏦' },
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Account Balance', path: '/admin/admin-balance', icon: '💰' },
        { name: 'Manage Bank Details', path: '/admin/manage-bank-details', icon: '🏦' }
      ]
    },
    {
      category: '📋 Applications',
      links: [
        { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅' },
        { name: 'Account Requests', path: '/admin/manage-account-requests', icon: '📋' },
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '💳' },
      ]
    },
    {
      category: '⚙️ Configuration',
      links: [
        { name: 'Manage Account Types', path: '/admin/manage-account-types', icon: '💳' },
        { name: 'User Details Lookup', path: '/admin/user-details', icon: '🔍' },
      ]
    },
    {
      category: '💳 Card Management',
      links: [
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '📊' },
        { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳' },
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝' },
        { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫' },
        { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗' },
        { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪' }
      ]
    },
    {
      category: '💸 Transactions',
      links: [
        { name: 'All Transactions', path: '/admin/admin-transactions', icon: '💸' },
        { name: 'User Transfers', path: '/admin/admin-transfers', icon: '🔄' },
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✏️' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Mobile Check Deposits', path: '/admin/mobile-check-deposits', icon: '📱' }
      ]
    },
    {
      category: '🏠 Banking Services',
      links: [
        { name: 'Treasury Account', path: '/admin/treasury', icon: '🏛️' },
        { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠' },
        { name: 'Loan Types', path: '/admin/loan-types', icon: '💼' },
        { name: 'Loan Detail', path: '/admin/loans/[loanId]', icon: '📄' },
        { name: 'Loan Payments', path: '/admin/loan-payments', icon: '💵' },
        { name: 'Manage Loan Wallets', path: '/admin/manage-loan-wallets', icon: '💰' },
        { name: 'Investments', path: '/admin/admin-investments', icon: '📈' },
        { name: 'Crypto Dashboard', path: '/admin/admin-crypto', icon: '₿' },
        { name: 'Manage Crypto Wallets', path: '/admin/manage-crypto-wallets', icon: '🔑' },
        { name: 'Manage Crypto Deposits', path: '/admin/manage-crypto-deposits', icon: '💰' },
        { name: 'Assign Crypto Wallets', path: '/admin/assign-crypto-wallets', icon: '🔗' },
        { name: 'Manage Crypto Assets', path: '/admin/manage-crypto-assets', icon: '⚙️' }
      ]
    },
    {
      category: '₿ Crypto Management',
      links: [
        { name: 'Crypto Dashboard', path: '/admin/admin-crypto', icon: '₿' },
        { name: 'Manage Crypto Wallets', path: '/admin/manage-crypto-wallets', icon: '🔑' },
        { name: 'Manage Crypto Deposits', path: '/admin/manage-crypto-deposits', icon: '💰' },
        { name: 'Manage Crypto Investments', path: '/admin/manage-crypto-investments', icon: '📊' },
        { name: 'Account Opening Deposits', path: '/admin/manage-account-opening-deposits', icon: '💳' },
        { name: 'Account Opening Wallets', path: '/admin/manage-account-opening-wallets', icon: '👛' },
        { name: 'Approve Funding', path: '/admin/approve-funding', icon: '✅' },
      ]
    },
    {
      category: '⚙️ System & Audit',
      links: [
        { name: 'Security Dashboard', path: '/admin/security-dashboard', icon: '🔐' },
        { name: 'User Activity Monitor', path: '/admin/user-activity-monitor', icon: '👁️' },
        { name: 'Admin Settings', path: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜' },
        { name: 'Email Logs', path: '/admin/email-logs', icon: '📧' }
      ]
    },
    {
      category: '🗑️ User Deletion',
      links: [
        { name: 'Delete Users', path: '/admin/delete-users', icon: '🗑️' },
        { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🔍' },
        { name: 'Delete User Loans', path: '/admin/delete-user-loans', icon: '🏠' },
      ]
    },
    {
      category: '💬 Communications',
      links: [
        { name: 'User Messages', path: '/admin/messages', icon: '💬' },
        { name: 'Broadcast Messages', path: '/admin/broadcast-messages', icon: '📢' },
      ]
    },
    {
      category: '📁 System Tools',
      links: [
        { name: 'File Browser', path: '/admin/file-browser', icon: '📁' },
        { name: 'Storage Diagnostics', path: '/admin/storage-diagnostics', icon: '🔍' },
        { name: 'Database Explorer', path: '/admin/database-explorer', icon: '🗄️' },
      ]
    }
  ];

  return (
    <div style={styles.stickyContainer}>
      <div style={styles.dropdownContainer} className="admin-nav-dropdown-container">
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
          <span style={styles.icon}>📑</span>
          Admin Pages
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
                <h3 style={styles.dropdownTitle}>🏦 Admin Pages</h3>
              </div>

              <div style={styles.scrollContainer}>
                {adminPages.map((section, index) => (
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
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  stickyContainer: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  dropdownContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    whiteSpace: 'nowrap',
    minWidth: '140px',
    justifyContent: 'center'
  },
  buttonActive: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(30, 64, 175, 0.4)'
  },
  icon: {
    fontSize: '1.1rem'
  },
  arrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.3s ease',
    marginLeft: '0.25rem'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(3px)',
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
    maxWidth: '900px',
    maxHeight: '85vh',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column'
  },
  dropdownHeader: {
    padding: '1.5rem 1.75rem',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderBottom: '2px solid #1e40af',
    borderRadius: '16px 16px 0 0',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  dropdownTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  scrollContainer: {
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem'
  },
  section: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease'
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 0.75rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #dbeafe'
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0.85rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb'
  },
  linkIcon: {
    fontSize: '1.1rem',
    width: '24px',
    textAlign: 'center'
  },
  linkText: {
    flex: 1
  },
  linkArrow: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    transition: 'all 0.2s ease'
  }
};

// Add CSS for mobile responsiveness
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @media (max-width: 768px) {
      .admin-nav-dropdown-container {
        display: flex !important;
        justify-content: center !important;
        width: 100% !important;
      }

      .admin-nav-dropdown-container button {
        font-size: 0.85rem !important;
        padding: 0.65rem 1rem !important;
        min-width: 120px !important;
      }
    }

    @media (max-width: 480px) {
      .admin-nav-dropdown-container button {
        font-size: 0.8rem !important;
        padding: 0.6rem 0.9rem !important;
        min-width: 110px !important;
      }
    }
  `;

  if (!document.getElementById('admin-nav-dropdown-styles')) {
    styleSheet.id = 'admin-nav-dropdown-styles';
    document.head.appendChild(styleSheet);
  }
}