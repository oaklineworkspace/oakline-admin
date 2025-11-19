
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function AdminSearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPages, setFilteredPages] = useState([]);
  const searchRef = useRef(null);

  const allAdminPages = [
    // Dashboard & Overview
    { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏦', category: 'Dashboard' },
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊', category: 'Dashboard' },
    { name: 'Admin Reports', path: '/admin/admin-reports', icon: '📈', category: 'Reports' },
    { name: 'Admin Audit', path: '/admin/admin-audit', icon: '🔍', category: 'Reports' },
    { name: 'System Logs', path: '/admin/admin-logs', icon: '📜', category: 'Reports' },
    { name: 'Email Logs', path: '/admin/email-logs', icon: '📧', category: 'Reports' },
    
    // User Management
    { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥', category: 'Users' },
    { name: 'Customer Users', path: '/admin/admin-users', icon: '👨‍💼', category: 'Users' },
    { name: 'Create User', path: '/admin/create-user', icon: '➕', category: 'Users' },
    { name: 'User Enrollment', path: '/admin/manage-user-enrollment', icon: '🔑', category: 'Users' },
    { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '📧', category: 'Users' },
    { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️', category: 'Users' },
    { name: 'Delete Users', path: '/admin/delete-users', icon: '⚠️', category: 'Users' },
    { name: 'User Details Lookup', path: '/admin/user-details', icon: '🔍', category: 'Users' },
    { name: 'Edit User Timestamps', path: '/admin/edit-user-timestamps', icon: '⏰', category: 'Users' },
    
    // Accounts & Applications
    { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅', category: 'Approvals' },
    { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️', category: 'Approvals' },
    { name: 'Approve Funding', path: '/admin/approve-funding', icon: '💰', category: 'Approvals' },
    { name: 'Manage Accounts', path: '/admin/manage-accounts', icon: '🏦', category: 'Accounts' },
    { name: 'Account Requests', path: '/admin/manage-account-requests', icon: '📋', category: 'Accounts' },
    { name: 'Manage Account Types', path: '/admin/manage-account-types', icon: '💳', category: 'Accounts' },
    { name: 'Account Opening Deposits', path: '/admin/manage-account-opening-deposits', icon: '💰', category: 'Accounts' },
    
    // Cards
    { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝', category: 'Cards' },
    { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '💳', category: 'Cards' },
    { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳', category: 'Cards' },
    { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫', category: 'Cards' },
    { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗', category: 'Cards' },
    { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪', category: 'Cards' },
    { name: 'Linked Cards', path: '/admin/linked-cards', icon: '🔗', category: 'Cards' },
    
    // Transactions
    { name: 'All Transactions', path: '/admin/admin-transactions', icon: '💸', category: 'Transactions' },
    { name: 'User Transfers', path: '/admin/admin-transfers', icon: '🔄', category: 'Transactions' },
    { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✏️', category: 'Transactions' },
    { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦', category: 'Transactions' },
    { name: 'Generate Transactions', path: '/admin/generate-transactions', icon: '🎲', category: 'Transactions' },
    { name: 'Mobile Check Deposits', path: '/admin/mobile-check-deposits', icon: '📱', category: 'Transactions' },
    { name: 'Account Balances', path: '/admin/admin-balance', icon: '💰', category: 'Transactions' },
    
    // Loans & Investments
    { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠', category: 'Loans' },
    { name: 'Loan Types', path: '/admin/loan-types', icon: '💼', category: 'Loans' },
    { name: 'Loan Payments', path: '/admin/loan-payments', icon: '💵', category: 'Loans' },
    { name: 'Manage Loan Wallets', path: '/admin/manage-loan-wallets', icon: '💰', category: 'Loans' },
    { name: 'Delete User Loans', path: '/admin/delete-user-loans', icon: '🗑️', category: 'Loans' },
    { name: 'Investments', path: '/admin/admin-investments', icon: '📈', category: 'Investments' },
    
    // Crypto
    { name: 'Crypto Dashboard', path: '/admin/admin-crypto', icon: '₿', category: 'Crypto' },
    { name: 'Manage Crypto Wallets', path: '/admin/manage-crypto-wallets', icon: '🔑', category: 'Crypto' },
    { name: 'Manage Crypto Deposits', path: '/admin/manage-crypto-deposits', icon: '💰', category: 'Crypto' },
    { name: 'Assign Crypto Wallets', path: '/admin/assign-crypto-wallets', icon: '🔗', category: 'Crypto' },
    { name: 'Manage Crypto Assets', path: '/admin/manage-crypto-assets', icon: '⚙️', category: 'Crypto' },
    { name: 'Crypto Investments', path: '/admin/manage-crypto-investments', icon: '📊', category: 'Crypto' },
    
    // System & Security
    { name: 'Bank Details', path: '/admin/manage-bank-details', icon: '🏦', category: 'System' },
    { name: 'Admin Settings', path: '/admin/admin-settings', icon: '⚙️', category: 'System' },
    { name: 'Roles & Permissions', path: '/admin/admin-roles', icon: '🔑', category: 'System' },
    { name: 'Notifications', path: '/admin/admin-notifications', icon: '🔔', category: 'System' },
    { name: 'Database Explorer', path: '/admin/database-explorer', icon: '🗄️', category: 'System' },
    { name: 'File Browser', path: '/admin/file-browser', icon: '📁', category: 'System' },
    { name: 'Security Dashboard', path: '/admin/security-dashboard', icon: '🛡️', category: 'Security' },
    { name: 'User Activity Monitor', path: '/admin/user-activity-monitor', icon: '👁️', category: 'Security' },
    { name: 'Credit Scores', path: '/admin/credit-scores', icon: '📊', category: 'System' },
    { name: 'Treasury Account', path: '/admin/treasury', icon: '🏛️', category: 'System' },
    
    // Communications
    { name: 'User Messages', path: '/admin/messages', icon: '💬', category: 'Communications' },
    { name: 'Broadcast Messages', path: '/admin/broadcast-messages', icon: '📣', category: 'Communications' },
    
    // Admin Control
    { name: 'Admin Login', path: '/admin/login', icon: '🔐', category: 'Admin' },
    { name: 'Create Admin', path: '/admin/register', icon: '➕', category: 'Admin' },
    { name: 'Admin Navigation Hub', path: '/admin', icon: '🏠', category: 'Admin' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPages([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allAdminPages.filter(page => 
      page.name.toLowerCase().includes(query) ||
      page.category.toLowerCase().includes(query) ||
      page.path.toLowerCase().includes(query)
    ).slice(0, 8);

    setFilteredPages(results);
    setIsOpen(results.length > 0);
  }, [searchQuery]);

  const handleSelectPage = (path) => {
    router.push(path);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} style={styles.container}>
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search admin pages..."
          style={styles.searchInput}
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setIsOpen(false);
            }}
            style={styles.clearButton}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filteredPages.length > 0 && (
        <div style={styles.dropdown}>
          <div style={styles.resultsHeader}>
            Found {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}
          </div>
          {filteredPages.map((page, index) => (
            <button
              key={index}
              onClick={() => handleSelectPage(page.path)}
              style={styles.resultItem}
            >
              <span style={styles.resultIcon}>{page.icon}</span>
              <div style={styles.resultContent}>
                <div style={styles.resultName}>{page.name}</div>
                <div style={styles.resultMeta}>
                  <span style={styles.resultCategory}>{page.category}</span>
                  <span style={styles.resultPath}>{page.path}</span>
                </div>
              </div>
              <span style={styles.resultArrow}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '500px'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    transition: 'all 0.3s ease'
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    fontSize: '1.25rem',
    color: '#64748b'
  },
  searchInput: {
    width: '100%',
    padding: '0.875rem 3rem 0.875rem 3rem',
    fontSize: '0.95rem',
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    color: '#1e293b',
    fontWeight: '500'
  },
  clearButton: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease'
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: '2px solid #e2e8f0',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 1000
  },
  resultsHeader: {
    padding: '0.875rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  resultItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textAlign: 'left'
  },
  resultIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  resultContent: {
    flex: 1,
    minWidth: 0
  },
  resultName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.8rem'
  },
  resultCategory: {
    color: '#1A3E6F',
    fontWeight: '600',
    backgroundColor: '#E0F2FE',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px'
  },
  resultPath: {
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  resultArrow: {
    fontSize: '1.25rem',
    color: '#FFC857',
    flexShrink: 0
  }
};
