
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminPageDropdown from './AdminPageDropdown';

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

  const adminTools = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊', color: '#1A3E6F' },
    { name: 'All Users', href: '/admin/manage-all-users', icon: '👥', color: '#059669' },
    { name: 'Transfers', href: '/admin/admin-transfers', icon: '🔄', color: '#3b82f6' },
    { name: 'Transactions', href: '/admin/admin-transactions', icon: '💸', color: '#10b981' },
    { name: 'Create Admin', href: '/admin/register', icon: '➕', color: '#FFC857' },
    { name: 'Admin Settings', href: '/admin/admin-settings', icon: '⚙️', color: '#2A5490' },
    { name: 'System Logs', href: '/admin/admin-logs', icon: '📜', color: '#059669' },
    { name: 'Audit Trail', href: '/admin/admin-audit', icon: '🔍', color: '#ea580c' },
    { name: 'Reports', href: '/admin/admin-reports', icon: '📈', color: '#8b5cf6' }
  ];

  const handleLogout = async () => {
    const { supabase } = await import('../lib/supabaseClient');
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="admin-sticky-dropdown" style={styles.containerWrapper}>
      <div style={styles.container}>
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
          <span style={styles.icon}>🛠️</span>
          <span style={styles.text}>Admin Tools</span>
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
              <h3 style={styles.dropdownTitle}>🏦 Admin Tools</h3>
              <p style={styles.dropdownSubtitle}>Quick access to administration functions</p>
            </div>

            <div style={styles.toolsGrid}>
              {adminTools.map((tool, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(tool.href);
                  }}
                  style={styles.toolItem}
                >
                  <div style={{
                    ...styles.toolIcon,
                    backgroundColor: `${tool.color}15`,
                    border: `2px solid ${tool.color}30`
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                  </div>
                  <div style={styles.toolContent}>
                    <div style={styles.toolName}>{tool.name}</div>
                  </div>
                  <div style={{ ...styles.toolArrow, color: tool.color }}>→</div>
                </button>
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
                View All Admin Pages
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
    </div>
  );
}

const styles = {
  containerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  container: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },
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
    minHeight: 'auto',
    minWidth: '50px',
    maxWidth: '70px',
    position: 'relative',
    overflow: 'visible',
    width: '100%'
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
    padding: '2rem',
    minWidth: '360px',
    maxWidth: '90vw',
    zIndex: 999,
    maxHeight: '60vh',
    overflowY: 'auto'
  },
  dropdownHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0'
  },
  dropdownTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 0.5rem 0'
  },
  dropdownSubtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  toolsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  toolItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  },
  toolIcon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    flexShrink: 0
  },
  toolContent: {
    flex: 1
  },
  toolName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  toolArrow: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  dropdownFooter: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '2px solid #e2e8f0'
  },
  viewAllButton: {
    display: 'inline-block',
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    width: '100%'
  },
  logoutButton: {
    display: 'inline-block',
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    border: 'none',
    cursor: 'pointer',
    width: '100%'
  }
};
