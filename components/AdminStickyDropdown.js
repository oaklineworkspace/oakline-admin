

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminStickyDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-sticky-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const adminPages = [
    {
      category: '📊 Dashboard & Overview',
      pages: [
        { name: 'Admin Dashboard', href: '/admin/admin-dashboard', icon: '🏦' },
        { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
        { name: 'Admin Reports', href: '/admin/admin-reports', icon: '📈' },
        { name: 'Admin Audit', href: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', href: '/admin/admin-logs', icon: '📜' }
      ]
    },
    {
      category: '👥 User Management',
      pages: [
        { name: 'All Users', href: '/admin/manage-all-users', icon: '👥' },
        { name: 'Customer Users', href: '/admin/admin-users', icon: '👨‍💼' },
        { name: 'Create User', href: '/admin/create-user', icon: '➕' },
        { name: 'User Enrollment', href: '/admin/manage-user-enrollment', icon: '🔑' },
        { name: 'Resend Enrollment', href: '/admin/resend-enrollment', icon: '📧' },
        { name: 'Delete User By ID', href: '/admin/delete-user-by-id', icon: '🗑️' },
        { name: 'Delete Users', href: '/admin/delete-users', icon: '⚠️' }
      ]
    },
    {
      category: '💳 Card Management',
      pages: [
        { name: 'Card Applications', href: '/admin/admin-card-applications', icon: '📝' },
        { name: 'Cards Dashboard', href: '/admin/admin-cards-dashboard', icon: '💳' },
        { name: 'Manage Cards', href: '/admin/manage-cards', icon: '💳' },
        { name: 'Issue Debit Card', href: '/admin/issue-debit-card', icon: '🎫' },
        { name: 'Assign Card', href: '/admin/admin-assign-card', icon: '🔗' },
        { name: 'Test Transactions', href: '/admin/test-card-transactions', icon: '🧪' }
      ]
    },
    {
      category: '💰 Financial Operations',
      pages: [
        { name: 'All Transactions', href: '/admin/admin-transactions', icon: '💸' },
        { name: 'Transfers', href: '/admin/admin-transfers', icon: '🔄' },
        { name: 'Mobile Check Deposits', href: '/admin/mobile-check-deposits', icon: '📱' },
        { name: 'Manual Transactions', href: '/admin/manual-transactions', icon: '✍️' },
        { name: 'Bulk Transactions', href: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Account Balances', href: '/admin/admin-balance', icon: '💵' }
      ]
    },
    {
      category: '✅ Approvals & Applications',
      pages: [
        { name: 'Approve Applications', href: '/admin/approve-applications', icon: '✅' },
        { name: 'Approve Accounts', href: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Manage Accounts', href: '/admin/manage-accounts', icon: '🏦' }
      ]
    },
    {
      category: '🏦 Banking Services',
      pages: [
        { name: 'Loans Management', href: '/admin/admin-loans', icon: '🏠' },
        { name: 'Investments', href: '/admin/admin-investments', icon: '📈' },
        { name: 'Crypto Dashboard', href: '/admin/admin-crypto', icon: '₿' },
        { name: 'Manage Crypto Wallets', href: '/admin/manage-crypto-wallets', icon: '🔑' },
        { name: 'Manage Crypto Deposits', href: '/admin/manage-crypto-deposits', icon: '💰' },
        { name: 'Assign Crypto Wallets', href: '/admin/assign-crypto-wallets', icon: '🔗' }
      ]
    },
    {
      category: '⚙️ Settings & Security',
      pages: [
        { name: 'Admin Settings', href: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Roles & Permissions', href: '/admin/admin-roles', icon: '🎭' },
        { name: 'Notifications', href: '/admin/admin-notifications', icon: '🔔' },
        { name: 'Broadcast Messages', href: '/admin/broadcast-messages', icon: '📢' },
        { name: 'Bank Details', href: '/admin/manage-bank-details', icon: '🏦' },
        { name: 'Create Admin', href: '/admin/register', icon: '➕' },
        { name: 'Admin Login', href: '/admin/login', icon: '🔐' }
      ]
    }
  ];

  const handleLogout = async () => {
    const { supabase } = await import('../lib/supabaseClient');
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <>
      <button
        className="admin-sticky-dropdown"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          ...styles.button,
          ...(isOpen ? styles.buttonActive : {})
        }}
      >
        <span style={styles.icon}>🛠️</span>
        <span style={styles.text}>Tools</span>
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
              <h3 style={styles.dropdownTitle}>🏦 All Admin Pages</h3>
              <p style={styles.dropdownSubtitle}>Complete administration access</p>
            </div>

            <div style={styles.categoriesContainer}>
              {adminPages.map((section, index) => (
                <div key={index} style={styles.category}>
                  <h4 style={styles.categoryTitle}>{section.category}</h4>
                  <div style={styles.pagesGrid}>
                    {section.pages.map((page, pageIndex) => (
                      <button
                        key={pageIndex}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(page.href);
                        }}
                        style={styles.pageItem}
                      >
                        <span style={styles.pageIcon}>{page.icon}</span>
                        <span style={styles.pageName}>{page.name}</span>
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
                🏠 Admin Hub
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                style={styles.logoutButton}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles = {
  button: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 2px',
    backgroundColor: 'transparent',
    color: '#1A3E6F',
    border: 'none',
    borderRadius: '0',
    fontSize: '9px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    boxShadow: 'none',
    flex: 1,
    maxWidth: '70px',
    minWidth: '50px',
    textDecoration: 'none'
  },
  buttonActive: {
    backgroundColor: '#1A3E6F',
    color: '#ffffff',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)'
  },
  icon: {
    fontSize: '16px',
    marginBottom: '2px'
  },
  text: {
    fontSize: '9px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1.1',
    whiteSpace: 'nowrap'
  },
  arrow: {
    fontSize: '8px',
    marginTop: '1px',
    transition: 'transform 0.3s ease'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
    backdropFilter: 'blur(4px)'
  },
  dropdown: {
    position: 'fixed',
    bottom: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '2px solid #e2e8f0',
    padding: '1.5rem',
    minWidth: '360px',
    maxWidth: '90vw',
    zIndex: 999,
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  dropdownHeader: {
    textAlign: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  dropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 0.25rem 0'
  },
  dropdownSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0
  },
  categoriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem'
  },
  category: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '0.75rem',
    border: '1px solid #e2e8f0'
  },
  categoryTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  pagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.5rem'
  },
  pageItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#1A3E6F',
    textAlign: 'left',
    width: '100%'
  },
  pageIcon: {
    fontSize: '1rem',
    flexShrink: 0
  },
  pageName: {
    fontSize: '0.75rem',
    lineHeight: '1.2'
  },
  dropdownFooter: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '1rem',
    borderTop: '2px solid #e2e8f0'
  },
  viewAllButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  logoutButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    border: 'none',
    cursor: 'pointer'
  }
};
