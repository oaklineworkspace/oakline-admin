import { useState, useEffect } from 'react';
import Link from 'next/link';

const adminPages = [
  {
    category: '🏦 Admin Control',
    pages: [
      { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '📊' },
      { name: 'Create Admin', path: '/admin/register', icon: '➕' },
      { name: 'Admin Login', path: '/admin/login', icon: '🔐' },
      { name: 'Bank Details', path: '/admin/manage-bank-details', icon: '🏦' },
    ]
  },
  {
    category: '👥 User Management',
    pages: [
      { name: 'Manage Enrollment', path: '/admin/manage-user-enrollment', icon: '📧' },
      { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '🔄' },
      { name: 'View User Documents', path: '/admin/view-user-documents', icon: '📄' },
      { name: 'Delete User by ID', path: '/admin/delete-user-by-id', icon: '🗑️' },
      { name: 'Delete Users', path: '/admin/delete-users', icon: '⚠️' },
      { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥' },
      { name: 'Customer Users', path: '/admin/admin-users', icon: '👨‍💼' },
      { name: 'Create User', path: '/admin/create-user', icon: '➕' },
      { name: 'Credit Scores', path: '/admin/credit-scores', icon: '📊' },
    ]
  },
  {
    category: '🏦 Account Management',
    pages: [
      { name: 'Manage Accounts', path: '/admin/manage-accounts', icon: '🏦' },
      { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️' },
      { name: 'Account Balance', path: '/admin/admin-balance', icon: '💰' },
      { name: 'Account Modes', path: '/admin/manage-account-modes', icon: '🔒' },
    ]
  },
  {
    category: '📋 Applications',
    pages: [
      { name: 'Approve Applications', path: '/admin/approve-applications', icon: '✅' },
      { name: 'Account Requests', path: '/admin/manage-account-requests', icon: '📋' },
      { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '💳' },
    ]
  },
  {
    category: '💳 Card Management',
    pages: [
      { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '📊' },
      { name: 'Manage Cards', path: '/admin/manage-cards', icon: '💳' },
      { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫' },
      { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗' },
      { name: 'Test Card Transactions', path: '/admin/test-card-transactions', icon: '🧪' }
    ]
  },
  {
    category: '💸 Transactions',
    pages: [
      { name: 'All Transactions', path: '/admin/admin-transactions', icon: '💸' },
      { name: 'User Transfers', path: '/admin/admin-transfers', icon: '🔄' },
      { name: 'Wire Transfer Management', path: '/admin/wire-transfer-management', icon: '🔒' },
      { name: 'Withdrawal Management', path: '/admin/wire-transfer-management', icon: '💰' },
      { name: 'Wire Transfers', path: '/admin/admin-wire-transfers', icon: '💵' },
      { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✏️' },
      { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦' },
      { name: 'Mobile Check Deposits', path: '/admin/mobile-check-deposits', icon: '📱' },
      { name: 'Linked Bank Accounts', path: '/admin/linked-bank-accounts', icon: '🔗' }
    ]
  },
  {
    category: '🏠 Banking Services',
    pages: [
      { name: 'Treasury Account', path: '/admin/treasury', icon: '🏛️' },
      { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠' },
      { name: 'Investments', path: '/admin/admin-investments', icon: '📈' },
      { name: 'Crypto Dashboard', path: '/admin/admin-crypto', icon: '₿' },
    ]
  },
  {
    category: '⚙️ System & Audit',
    pages: [
      { name: 'Security Dashboard', path: '/admin/security-dashboard', icon: '🔐' },
      { name: 'Manage Restriction Reasons', path: '/admin/manage-restriction-reasons', icon: '📋' },
      { name: 'User Activity Monitor', path: '/admin/user-activity-monitor', icon: '👁️' },
      { name: 'Edit User Timestamps', path: '/admin/edit-user-timestamps', icon: '⏰' },
      { name: 'Admin Settings', path: '/admin/admin-settings', icon: '⚙️' },
      { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
      { name: 'System Logs', path: '/admin/admin-logs', icon: '📜' },
      { name: 'Email Logs', path: '/admin/email-logs', icon: '📧' }
    ]
  },
  {
    category: '📁 System Tools',
    pages: [
      { name: 'File Browser', path: '/admin/file-browser', icon: '📁' },
      { name: 'Storage Diagnostics', path: '/admin/storage-diagnostics', icon: '🔍' },
      { name: 'Database Explorer', path: '/admin/database-explorer', icon: '🗄️' },
    ]
  }
];

export default function AdminSearchModal({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Auto-focus on search input
    const input = document.getElementById('admin-search-input');
    if (input) input.focus();
  }, []);

  const getFilteredPages = () => {
    if (!searchTerm.trim()) return adminPages;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return adminPages
      .map(section => ({
        ...section,
        pages: section.pages.filter(page => 
          page.name.toLowerCase().includes(lowerSearchTerm) ||
          page.path.toLowerCase().includes(lowerSearchTerm)
        )
      }))
      .filter(section => section.pages.length > 0);
  };

  const filteredPages = getFilteredPages();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔍 Search Admin Pages</h2>
        <div style={styles.searchBox}>
          <input
            id="admin-search-input"
            type="text"
            placeholder="Type to search... (e.g., users, transactions, loans)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={styles.clearButton}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm && <p style={styles.resultCount}>Found {filteredPages.reduce((acc, s) => acc + s.pages.length, 0)} page(s)</p>}
      </div>

      <div style={styles.content}>
        {filteredPages.length > 0 ? (
          filteredPages.map((section, sectionIndex) => (
            <div key={sectionIndex} style={styles.section}>
              <h3 style={styles.sectionTitle}>{section.category}</h3>
              <div style={styles.pagesList}>
                {section.pages.map((page, pageIndex) => (
                  <Link
                    key={pageIndex}
                    href={page.path}
                    style={styles.pageLink}
                    onClick={onClose}
                  >
                    <span style={styles.pageIcon}>{page.icon}</span>
                    <div style={styles.pageInfo}>
                      <div style={styles.pageName}>{page.name}</div>
                      <div style={styles.pagePath}>{page.path}</div>
                    </div>
                    <span style={styles.arrow}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={styles.noResults}>
            <p style={styles.noResultsIcon}>🔍</p>
            <p style={styles.noResultsText}>No pages found for "{searchTerm}"</p>
            <p style={styles.noResultsSubtext}>Try searching with different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'white',
  },
  header: {
    padding: '1.75rem 2rem',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0 0 1rem 0',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'white',
    border: '2px solid #1e40af',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    fontFamily: 'inherit',
    color: '#1f2937',
    padding: '0.5rem 0',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '0.25rem 0.5rem',
    transition: 'color 0.2s ease',
  },
  resultCount: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: '0.75rem 0 0 0',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 1rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #dbeafe',
  },
  pagesList: {
    display: 'grid',
    gap: '0.75rem',
  },
  pageLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.875rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    color: 'inherit',
  },
  pageIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  pageInfo: {
    flex: 1,
    minWidth: 0,
  },
  pageName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  pagePath: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
  },
  arrow: {
    color: '#1e40af',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    textAlign: 'center',
  },
  noResultsIcon: {
    fontSize: '3rem',
    margin: '0 0 1rem 0',
  },
  noResultsText: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  noResultsSubtext: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    margin: 0,
  },
};
