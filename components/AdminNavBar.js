import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const adminPages = [
  { name: 'Dashboard', path: '/admin', icon: '🏠' },
  { name: 'Users', path: '/admin/users', icon: '👥' },
  { name: 'Accounts', path: '/admin/accounts', icon: '🏦' },
  { name: 'Applications', path: '/admin/applications', icon: '📋' },
  { name: 'Transactions', path: '/admin/admin-transactions', icon: '💸' },
  { name: 'Manual Transactions', path: '/admin/manual-transactions', icon: '✍️' },
  { name: 'Withdrawals', path: '/admin/admin-withdrawals', icon: '💳' },
  { name: 'Loans', path: '/admin/loans', icon: '📊' },
  { name: 'Cards', path: '/admin/cards', icon: '💳' },
  { name: 'Verifications', path: '/admin/verifications', icon: '✅' },
  { name: 'Wire Transfer Management', path: '/admin/wire-transfer-management', icon: '🔌' },
  { name: 'Oakline Pay', path: '/admin/oakline-pay-management', icon: '💰' },
  { name: 'Email Center', path: '/admin/admin-email', icon: '📧' },
  { name: 'Notifications', path: '/admin/notifications', icon: '🔔' },
  { name: 'Settings', path: '/admin/settings', icon: '⚙️' },
];

export default function AdminNavBar() {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = adminPages.filter(page =>
        page.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm]);

  const handleSearchSelect = (path) => {
    router.push(path);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const currentPage = adminPages.find(page => page.path === router.pathname);

  const styles = {
    navbar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1e293b',
      padding: '12px 20px',
      borderRadius: '12px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      flexWrap: 'wrap',
      gap: '12px'
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    logo: {
      color: 'white',
      fontWeight: '700',
      fontSize: '18px',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dropdownContainer: {
      position: 'relative'
    },
    dropdownButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#334155',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '8px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      minWidth: '240px',
      zIndex: 1000,
      maxHeight: '400px',
      overflowY: 'auto'
    },
    dropdownItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      color: isActive ? '#3b82f6' : '#334155',
      textDecoration: 'none',
      fontSize: '14px',
      backgroundColor: isActive ? '#eff6ff' : 'transparent',
      borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
      transition: 'all 0.2s'
    }),
    searchContainer: {
      position: 'relative',
      flex: '1',
      maxWidth: '300px',
      minWidth: '200px'
    },
    searchInput: {
      width: '100%',
      padding: '8px 16px',
      paddingLeft: '36px',
      backgroundColor: '#334155',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94a3b8',
      fontSize: '14px'
    },
    searchResults: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '8px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxHeight: '300px',
      overflowY: 'auto'
    },
    searchResultItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      color: '#334155',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    navButton: {
      padding: '8px 16px',
      backgroundColor: '#3b82f6',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'background-color 0.2s'
    },
    logoutButton: {
      padding: '8px 16px',
      backgroundColor: '#ef4444',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.leftSection}>
        <Link href="/admin" style={styles.logo}>
          🏦 Oakline Admin
        </Link>

        <div style={styles.dropdownContainer} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={styles.dropdownButton}
          >
            {currentPage?.icon || '📄'} {currentPage?.name || 'Navigate'}
            <span style={{ fontSize: '10px' }}>▼</span>
          </button>

          {showDropdown && (
            <div style={styles.dropdownMenu}>
              {adminPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  style={styles.dropdownItem(router.pathname === page.path)}
                  onClick={() => setShowDropdown(false)}
                >
                  <span>{page.icon}</span>
                  <span>{page.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.searchContainer} ref={searchRef}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search admin pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {showSearchResults && searchResults.length > 0 && (
          <div style={styles.searchResults}>
            {searchResults.map((page) => (
              <div
                key={page.path}
                style={styles.searchResultItem}
                onClick={() => handleSearchSelect(page.path)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <span>{page.icon}</span>
                <span>{page.name}</span>
              </div>
            ))}
          </div>
        )}
        {showSearchResults && searchResults.length === 0 && searchTerm && (
          <div style={styles.searchResults}>
            <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '14px' }}>
              No pages found
            </div>
          </div>
        )}
      </div>

      <div style={styles.rightSection}>
        <Link href="/admin" style={styles.navButton}>
          🏠 Dashboard
        </Link>
      </div>
    </nav>
  );
}