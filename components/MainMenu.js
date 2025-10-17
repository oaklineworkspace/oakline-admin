
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MainMenu({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menuItems = [
    {
      name: 'Banking Services',
      icon: '🏦',
      dropdown: [
        {
          category: 'Personal Banking',
          items: [
            { name: 'Checking Accounts', href: '/apply', icon: '💳' },
            { name: 'Savings Accounts', href: '/apply', icon: '💰' },
            { name: 'Money Market', href: '/apply', icon: '📈' },
            { name: 'Certificates of Deposit', href: '/apply', icon: '🔒' }
          ]
        },
        {
          category: 'Business Banking',
          items: [
            { name: 'Business Checking', href: '/apply', icon: '🏢' },
            { name: 'Business Savings', href: '/apply', icon: '🏦' },
            { name: 'Merchant Services', href: '/bill-pay', icon: '💼' },
            { name: 'Business Loans', href: '/loans', icon: '📊' }
          ]
        },
        {
          category: 'Loans & Credit',
          items: [
            { name: 'Personal Loans', href: '/loans', icon: '💵' },
            { name: 'Auto Loans', href: '/loans', icon: '🚗' },
            { name: 'Home Mortgages', href: '/loans', icon: '🏠' },
            { name: 'Credit Cards', href: '/cards', icon: '💳' }
          ]
        }
      ]
    },
    {
      name: 'Digital Banking',
      icon: '📱',
      dropdown: [
        {
          category: 'Online Services',
          items: [
            { name: 'Online Banking', href: '/dashboard', icon: '💻' },
            { name: 'Mobile App', href: '/dashboard', icon: '📱' },
            { name: 'Bill Pay', href: '/bill-pay', icon: '🧾' },
            { name: 'Mobile Deposit', href: '/deposit-real', icon: '📥' }
          ]
        },
        {
          category: 'Transfers & Payments',
          items: [
            { name: 'Money Transfer', href: '/transfer', icon: '💸' },
            { name: 'Wire Transfers', href: '/transfer', icon: '🌐' },
            { name: 'Zelle Payments', href: '/transfer', icon: '⚡' },
            { name: 'International Transfer', href: '/transfer', icon: '🌍' }
          ]
        }
      ]
    },
    {
      name: 'Investments',
      icon: '📊',
      dropdown: [
        {
          category: 'Investment Services',
          items: [
            { name: 'Investment Accounts', href: '/investments', icon: '📈' },
            { name: 'Retirement Planning', href: '/investments', icon: '🏖️' },
            { name: 'Financial Advisory', href: '/financial-advisory', icon: '👨‍💼' },
            { name: 'Wealth Management', href: '/investments', icon: '💎' }
          ]
        },
        {
          category: 'Trading & Markets',
          items: [
            { name: 'Stock Trading', href: '/investments', icon: '📊' },
            { name: 'Cryptocurrency', href: '/crypto', icon: '₿' },
            { name: 'Market Research', href: '/market-news', icon: '📰' },
            { name: 'Portfolio Analysis', href: '/investments', icon: '📋' }
          ]
        }
      ]
    },
    {
      name: 'Resources',
      icon: '📚',
      dropdown: [
        {
          category: 'Account Information',
          items: [
            { name: 'All Account Types', href: '/account-types', icon: '📋' },
            { name: 'Rate Information', href: '/account-types', icon: '📊' },
            { name: 'Fee Schedule', href: '/account-types', icon: '💰' },
            { name: 'Compare Accounts', href: '/account-types', icon: '⚖️' }
          ]
        },
        {
          category: 'Support & Tools',
          items: [
            { name: 'Customer Support', href: '/support', icon: '🎧' },
            { name: 'Branch Locator', href: '/support', icon: '📍' },
            { name: 'Financial Education', href: '/support', icon: '🎓' },
            { name: 'Security Center', href: '/security', icon: '🔒' }
          ]
        }
      ]
    }
  ];

  const handleDropdownToggle = (menuName) => {
    setActiveDropdown(activeDropdown === menuName ? null : menuName);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      closeDropdowns();
      setMobileMenuOpen(false);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDropdowns();
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <nav style={styles.navbar} onClick={(e) => e.stopPropagation()}>
      {/* Top Announcement Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <div style={styles.announcement}>
            <span style={styles.announcementIcon}>🎉</span>
            <span style={styles.announcementText}>
              New! Explore all 23 account types • Routing Number: 075915826
            </span>
            <Link href="/account-types" style={styles.announcementLink}>
              View All Accounts
            </Link>
          </div>
          <div style={styles.topBarLinks}>
            <Link href="/support" style={styles.topBarLink}>Support</Link>
            <Link href="/account-types" style={styles.topBarLink}>Account Types</Link>
            <span style={styles.phoneNumber}>📞 1-800-OAKLINE</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div style={styles.mainNav}>
        <div style={styles.navContainer}>
          {/* Logo */}
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
            <div style={styles.brandInfo}>
              <span style={styles.brandName}>Oakline Bank</span>
              <span style={styles.brandTagline}>Your Financial Partner</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div style={styles.desktopMenu}>
            <Link href="/account-types" style={styles.navLink}>
              <span style={styles.menuIcon}>🏦</span>
              Accounts
            </Link>
            <Link href="/loans" style={styles.navLink}>
              <span style={styles.menuIcon}>💰</span>
              Loans
            </Link>
            <Link href="/investments" style={styles.navLink}>
              <span style={styles.menuIcon}>📈</span>
              Investments
            </Link>
            <Link href="/support" style={styles.navLink}>
              <span style={styles.menuIcon}>🎧</span>
              Support
            </Link>
            {menuItems.slice(0, 1).map((item) => (
              <div key={item.name} style={styles.menuItem}>
                <button
                  style={{
                    ...styles.menuButton,
                    ...(activeDropdown === item.name ? styles.menuButtonActive : {})
                  }}
                  onMouseEnter={() => handleDropdownToggle(item.name)}
                  onFocus={() => handleDropdownToggle(item.name)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownToggle(item.name);
                  }}
                >
                  <span style={styles.menuIcon}>☰</span>
                  <span>More</span>
                  <span style={{
                    ...styles.dropdownArrow,
                    transform: activeDropdown === item.name ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>▼</span>
                </button>

                {activeDropdown === item.name && (
                  <div 
                    style={styles.megaDropdown}
                    onMouseLeave={closeDropdowns}
                  >
                    <div style={styles.dropdownContent}>
                      {item.dropdown.map((category) => (
                        <div key={category.category} style={styles.dropdownCategory}>
                          <h4 style={styles.categoryTitle}>{category.category}</h4>
                          <div style={styles.categoryItems}>
                            {category.items.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                style={styles.dropdownItem}
                                onClick={closeDropdowns}
                              >
                                <span style={styles.itemIcon}>{subItem.icon}</span>
                                <span style={styles.itemName}>{subItem.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Actions */}
          <div style={styles.userActions}>
            {user ? (
              <>
                <Link href="/dashboard" style={styles.actionButton}>
                  <span style={styles.actionIcon}>📊</span>
                  Dashboard
                </Link>
                <Link href="/main-menu" style={styles.actionButton}>
                  <span style={styles.actionIcon}>☰</span>
                  Menu
                </Link>
              </>
            ) : (
              <>
                <Link href="/enroll" style={styles.applyButton}>
                  <span style={styles.actionIcon}>🚀</span>
                  Enroll Now
                </Link>
                <Link href="/sign-in" style={styles.loginButton}>
                  <span style={styles.actionIcon}>👤</span>
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            style={styles.mobileMenuButton}
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
              closeDropdowns();
            }}
            aria-label="Toggle mobile menu"
          >
            <span style={{
              ...styles.hamburgerIcon,
              transform: mobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              {mobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>

        {/* Enhanced Mobile Menu */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <div style={styles.mobileMenuContent}>
              {user ? (
                <div style={styles.mobileUserInfo}>
                  <span style={styles.welcomeText}>Welcome back!</span>
                  <div style={styles.mobileUserActions}>
                    <Link href="/dashboard" style={styles.mobileUserButton}>
                      <span style={styles.actionIcon}>📊</span>
                      Go to Dashboard
                    </Link>
                    <Link href="/main-menu" style={styles.mobileUserButton}>
                      <span style={styles.actionIcon}>☰</span>
                      Main Menu
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={styles.mobileActions}>
                  <Link href="/enroll" style={styles.mobileApplyButton}>
                    <span style={styles.actionIcon}>🚀</span>
                    Enroll Now
                  </Link>
                  <Link href="/sign-in" style={styles.mobileLoginButton}>
                    <span style={styles.actionIcon}>👤</span>
                    Sign In
                  </Link>
                </div>
              )}
              
              {menuItems.map((item) => (
                <div key={item.name} style={styles.mobileMenuItem}>
                  <button
                    style={styles.mobileMenuHeader}
                    onClick={() => handleDropdownToggle(item.name)}
                  >
                    <span style={styles.menuIcon}>{item.icon}</span>
                    <span>{item.name}</span>
                    <span style={{
                      ...styles.dropdownArrow,
                      transform: activeDropdown === item.name ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  </button>
                  
                  {activeDropdown === item.name && (
                    <div style={styles.mobileDropdown}>
                      {item.dropdown.map((category) => (
                        <div key={category.category} style={styles.mobileCategorySection}>
                          <h5 style={styles.mobileCategoryTitle}>{category.category}</h5>
                          {category.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              style={styles.mobileDropdownItem}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <span style={styles.itemIcon}>{subItem.icon}</span>
                              <span>{subItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    width: '100%',
    backgroundColor: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  // Top Bar
  topBar: {
    backgroundColor: '#1e40af',
    color: 'white',
    fontSize: '0.85rem'
  },
  topBarContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0.6rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  announcement: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
    minWidth: '200px'
  },
  announcementIcon: {
    fontSize: '1rem'
  },
  announcementText: {
    fontWeight: '500'
  },
  announcementLink: {
    color: '#fbbf24',
    textDecoration: 'underline',
    fontWeight: '600',
    marginLeft: '0.5rem'
  },
  topBarLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  topBarLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  phoneNumber: {
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },

  // Main Navigation
  mainNav: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb'
  },
  navContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '80px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none'
  },
  logo: {
    height: '45px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e40af',
    lineHeight: '1'
  },
  brandTagline: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },

  // Desktop Menu
  desktopMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  menuItem: {
    position: 'relative'
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  menuButtonActive: {
    backgroundColor: '#eff6ff',
    color: '#1e40af'
  },
  menuIcon: {
    fontSize: '1rem'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    color: '#374151',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  dropdownArrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.2s'
  },

  // Mega Dropdown
  megaDropdown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
    minWidth: '600px',
    zIndex: 1000,
    marginTop: '0.5rem',
    animation: 'dropdownSlideIn 0.2s ease-out'
  },
  dropdownContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '2rem'
  },
  dropdownCategory: {},
  categoryTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0.5rem'
  },
  categoryItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    textDecoration: 'none',
    color: '#374151',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  itemIcon: {
    fontSize: '1.1rem',
    width: '20px',
    textAlign: 'center'
  },
  itemName: {
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  // User Actions
  userActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  applyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
    transition: 'all 0.2s'
  },
  loginButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)',
    transition: 'all 0.2s'
  },
  actionIcon: {
    fontSize: '0.9rem'
  },

  // Mobile Menu Button
  mobileMenuButton: {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer'
  },
  hamburgerIcon: {
    fontSize: '1.5rem',
    color: '#374151',
    transition: 'transform 0.2s'
  },

  // Enhanced Mobile Menu
  mobileMenu: {
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    maxHeight: '80vh',
    overflowY: 'auto'
  },
  mobileMenuContent: {
    padding: '1rem'
  },
  mobileUserInfo: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  },
  welcomeText: {
    display: 'block',
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '1rem',
    fontWeight: '500'
  },
  mobileUserActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center'
  },
  mobileUserButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    flex: 1,
    justifyContent: 'center'
  },
  mobileActions: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  mobileApplyButton: {
    flex: 1,
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  mobileLoginButton: {
    flex: 1,
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  mobileMenuItem: {
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '0.5rem'
  },
  mobileMenuHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 0',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  mobileDropdown: {
    paddingBottom: '1rem',
    animation: 'mobileDropdownSlideIn 0.2s ease-out'
  },
  mobileCategorySection: {
    marginBottom: '1.5rem'
  },
  mobileCategoryTitle: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  mobileDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    textDecoration: 'none',
    color: '#374151',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0'
  }
};

// Add CSS animations and responsive styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes dropdownSlideIn {
      0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      100% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes mobileDropdownSlideIn {
      0% { opacity: 0; max-height: 0; }
      100% { opacity: 1; max-height: 500px; }
    }
    
    /* Hover Effects */
    .menuButton:hover {
      background-color: #eff6ff;
      color: #1e40af;
      transform: translateY(-1px);
    }
    
    .dropdownItem:hover {
      background-color: #f8fafc;
      color: #1e40af;
      transform: translateX(5px);
    }
    
    .actionButton:hover, .applyButton:hover, .loginButton:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .mobileDropdownItem:hover {
      background-color: #eff6ff;
      border-color: #3b82f6;
      transform: translateX(5px);
    }
    
    .topBarLink:hover {
      color: #fbbf24;
    }
    
    .announcementLink:hover {
      color: #ffffff;
    }
    
    /* Mobile Responsive */
    @media (max-width: 1024px) {
      .desktopMenu {
        display: none;
      }
      
      .mobileMenuButton {
        display: flex;
      }
      
      .userActions {
        display: none;
      }
      
      .topBarContent {
        flex-direction: column;
        text-align: center;
      }
      
      .megaDropdown {
        min-width: 300px;
        left: 0;
        transform: none;
      }
      
      .dropdownContent {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 768px) {
      .announcement {
        font-size: 0.8rem;
      }
      
      .brandName {
        font-size: 1.2rem;
      }
      
      .brandTagline {
        font-size: 0.7rem;
      }
      
      .logo {
        height: 35px;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
