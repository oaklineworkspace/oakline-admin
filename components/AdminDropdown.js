
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
      category: '📊 Dashboard',
      links: [
        { name: 'Admin Dashboard', path: '/admin/admin-dashboard', icon: '🏦' },
        { name: 'Manage All Users', path: '/admin/manage-all-users', icon: '👥' },
        { name: 'All Users Info', path: '/admin/all-users-info', icon: '📋' },
      ]
    },
    {
      category: '👤 Users',
      links: [
        { name: 'Admin Users', path: '/admin/admin-users', icon: '👨‍💼' },
        { name: 'Admin Users Management', path: '/admin/admin-users-management', icon: '🔐' },
        { name: 'Manage User Enrollment', path: '/admin/manage-user-enrollment', icon: '🔑' },
        { name: 'Create User', path: '/admin/create-user', icon: '➕' },
        { name: 'Delete User', path: '/admin/delete-user', icon: '🗑️' },
      ]
    },
    {
      category: '💳 Cards',
      links: [
        { name: 'Card Applications', path: '/admin/admin-card-applications', icon: '📝' },
        { name: 'Cards Dashboard', path: '/admin/admin-cards-dashboard', icon: '💳' },
        { name: 'Issue Debit Card', path: '/admin/issue-debit-card', icon: '🎫' },
        { name: 'Assign Card', path: '/admin/admin-assign-card', icon: '🔗' },
      ]
    },
    {
      category: '💰 Finance',
      links: [
        { name: 'Transactions', path: '/admin/admin-transactions', icon: '💸' },
        { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✍️' },
        { name: 'Bulk Transactions', path: '/admin/bulk-transactions', icon: '📦' },
        { name: 'Admin Balance', path: '/admin/admin-balance', icon: '💵' },
      ]
    },
    {
      category: '✅ Approvals',
      links: [
        { name: 'Approve Accounts', path: '/admin/approve-accounts', icon: '✔️' },
        { name: 'Admin Approvals', path: '/admin/admin-approvals', icon: '👍' },
        { name: 'Resend Enrollment', path: '/admin/resend-enrollment', icon: '📧' },
      ]
    },
    {
      category: '🏦 Services',
      links: [
        { name: 'Loans Management', path: '/admin/admin-loans', icon: '🏠' },
        { name: 'Investments', path: '/admin/admin-investments', icon: '📈' },
        { name: 'Crypto Management', path: '/admin/admin-crypto', icon: '₿' },
      ]
    },
    {
      category: '🔧 System',
      links: [
        { name: 'Audit Logs', path: '/admin/admin-audit', icon: '🔍' },
        { name: 'System Logs', path: '/admin/admin-logs', icon: '📜' },
        { name: 'Reports', path: '/admin/admin-reports', icon: '📊' },
        { name: 'Settings', path: '/admin/admin-settings', icon: '⚙️' },
        { name: 'Roles & Permissions', path: '/admin/admin-roles', icon: '🎭' },
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
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.dropdownTitle}>Admin Navigation</h3>
            <Link href="/admin" style={styles.viewAllLink}>
              View All Pages
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
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(30, 64, 175, 0.4)',
    transition: 'all 0.3s ease',
    textDecoration: 'none'
  },
  buttonActive: {
    backgroundColor: '#1e3a8a',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(30, 64, 175, 0.5)'
  },
  icon: {
    fontSize: '1.25rem'
  },
  arrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease'
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: '10px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    border: '1px solid #e2e8f0',
    width: '900px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease-out'
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: '16px 16px 0 0',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  dropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '0.9rem',
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
    fontWeight: '500'
  }
};

// Add CSS for animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideUp {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .admin-dropdown-container button:hover {
      background-color: #1e3a8a;
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(30, 64, 175, 0.5);
    }
    
    .admin-dropdown-container a[href]:hover {
      background-color: #eff6ff;
      color: #1e40af;
      transform: translateX(5px);
    }
    
    .admin-dropdown-container a[style*="viewAllLink"]:hover {
      background-color: #bfdbfe;
    }
    
    @media (max-width: 768px) {
      .admin-dropdown-container {
        bottom: 10px;
        right: 10px;
      }
      
      .admin-dropdown-container > button,
      .admin-dropdown-container > a {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
