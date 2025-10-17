import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LiveChat from '../components/LiveChat';

export default function MainMenu() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState({});
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchUserData(user);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (user) => {
    try {
      const { data: profile } = await supabase
        .from('applications')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const getUserDisplayName = () => {
    if (userProfile) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const toggleDropdown = (menu) => {
    setDropdownOpen(prev => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [menu]: !prev[menu]
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownOpen({});
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if signOut fails
      router.push('/');
    }
  };

  const bankingServices = [
    {
      category: 'Account Management',
      icon: '🏦',
      color: '#1e40af',
      services: [
        { name: 'Dashboard', path: '/dashboard', icon: '📊', desc: 'Account overview and summary' },
        { name: 'Account Details', path: '/account-details', icon: '📋', desc: 'View detailed account information' },
        { name: 'Account Types', path: '/account-types', icon: '🔍', desc: 'Explore all 23 account types' },
        { name: 'Transaction History', path: '/transactions', icon: '📜', desc: 'Review all transactions' },
        { name: 'Statements', path: '/statements', icon: '📄', desc: 'Download account statements' }
      ]
    },
    {
      category: 'Money Movement',
      icon: '💸',
      color: '#059669',
      services: [
        { name: 'Transfer Money', path: '/transfer', icon: '🔄', desc: 'Transfer between accounts or to others' },
        { name: 'Mobile Deposit', path: '/deposit-real', icon: '📱', desc: 'Deposit checks with your phone' },
        { name: 'Bill Pay', path: '/bill-pay', icon: '🧾', desc: 'Pay bills online securely' },
        { name: 'Wire Transfer', path: '/transfer', icon: '🌐', desc: 'Send money internationally' },
        { name: 'Scheduled Payments', path: '/bill-pay', icon: '📅', desc: 'Set up recurring payments' }
      ]
    },
    {
      category: 'Cards & Digital',
      icon: '💳',
      color: '#7c3aed',
      services: [
        { name: 'Manage Cards', path: '/cards', icon: '💳', desc: 'View and control your cards' },
        { name: 'Card Controls', path: '/cards', icon: '🎛️', desc: 'Set spending limits and controls' },
        { name: 'Digital Wallet', path: '/cards', icon: '📲', desc: 'Mobile payment solutions' },
        { name: 'Card Rewards', path: '/rewards', icon: '🎁', desc: 'Track and redeem rewards' },
        { name: 'Lost/Stolen Card', path: '/support', icon: '🚨', desc: 'Report and replace cards' }
      ]
    },
    {
      category: 'Lending & Credit',
      icon: '🏠',
      color: '#dc2626',
      services: [
        { name: 'Apply for Loans', path: '/loans', icon: '📋', desc: 'Personal, auto, and home loans' },
        { name: 'Credit Report', path: '/credit-report', icon: '📊', desc: 'Check your credit score' },
        { name: 'Mortgage Center', path: '/loans', icon: '🏠', desc: 'Home financing solutions' },
        { name: 'Auto Loans', path: '/loans', icon: '🚗', desc: 'Vehicle financing options' },
        { name: 'Credit Cards', path: '/cards', icon: '💳', desc: 'Apply for credit cards' }
      ]
    },
    {
      category: 'Investment & Wealth',
      icon: '📈',
      color: '#ea580c',
      services: [
        { name: 'Investment Portfolio', path: '/investments', icon: '💼', desc: 'Manage your investments' },
        { name: 'Retirement Planning', path: '/investments', icon: '🏖️', desc: 'Plan for your future' },
        { name: 'Cryptocurrency', path: '/crypto', icon: '₿', desc: 'Digital currency trading' },
        { name: 'Financial Advisory', path: '/financial-advisory', icon: '👨‍💼', desc: 'Professional guidance' },
        { name: 'Market Research', path: '/market-news', icon: '📰', desc: 'Latest market insights' }
      ]
    },
    {
      category: 'Support & Security',
      icon: '🛡️',
      color: '#0891b2',
      services: [
        { name: 'Customer Support', path: '/support', icon: '🎧', desc: 'Get help and assistance' },
        { name: 'Security Center', path: '/security', icon: '🔒', desc: 'Account security settings' },
        { name: 'Branch Locator', path: '/branch-locator', icon: '📍', desc: 'Find nearby branches' },
        { name: 'Messages', path: '/messages', icon: '💬', desc: 'Secure bank communications' },
        { name: 'Help Center', path: '/faq', icon: '❓', desc: 'FAQ and tutorials' }
      ]
    }
  ];

  const allServices = bankingServices.flatMap(category => 
    category.services.map(service => ({ ...service, category: category.category }))
  );

  const filteredServices = allServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...bankingServices.map(cat => cat.category)];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your banking services...</div>
      </div>
    );
  }

  return (
    <div style={styles.container} onClick={closeAllDropdowns}>
      {/* Professional Banking Header - Same as Dashboard */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <span style={styles.brandTagline}>Banking Services Menu</span>
              </div>
            </Link>
          </div>

          <nav style={styles.mainNav}>
            <div style={styles.navItem}>
              <button style={styles.navButton} onClick={(e) => { e.stopPropagation(); toggleDropdown('navigation'); }}>
                <span style={styles.navIcon}>🧭</span>
                Navigation
                <span style={styles.navArrow}>▼</span>
              </button>
              {dropdownOpen.navigation && (
                <div style={styles.dropdown}>
                  <Link href="/" style={styles.dropdownLink}>🏠 Home</Link>
                  <Link href="/dashboard" style={styles.dropdownLink}>📊 Dashboard</Link>
                  <Link href="/account-details" style={styles.dropdownLink}>🏦 Account Details</Link>
                  <Link href="/transfer" style={styles.dropdownLink}>💸 Transfer Money</Link>
                  <Link href="/cards" style={styles.dropdownLink}>💳 Cards</Link>
                  <Link href="/transactions" style={styles.dropdownLink}>📜 Transactions</Link>
                  <Link href="/support" style={styles.dropdownLink}>🎧 Support</Link>
                </div>
              )}
            </div>

            <div style={styles.navItem}>
              <button style={styles.navButton} onClick={(e) => { e.stopPropagation(); toggleDropdown('services'); }}>
                <span style={styles.navIcon}>⚡</span>
                Quick Access
                <span style={styles.navArrow}>▼</span>
              </button>
              {dropdownOpen.services && (
                <div style={styles.dropdown}>
                  <Link href="/transfer" style={styles.dropdownLink}>💸 Transfer Money</Link>
                  <Link href="/bill-pay" style={styles.dropdownLink}>🧾 Pay Bills</Link>
                  <Link href="/deposit-real" style={styles.dropdownLink}>📱 Mobile Deposit</Link>
                  <Link href="/apply" style={styles.dropdownLink}>📋 Apply for Account</Link>
                </div>
              )}
            </div>
          </nav>

          <div style={styles.headerRight}>
            <div style={styles.userSection}>
              <div style={styles.userInfo}>
                <span style={styles.welcomeText}>Welcome</span>
                <span style={styles.userName}>{getUserDisplayName()}</span>
              </div>
              <div style={styles.userActions}>
                <div style={styles.navItem}>
                  <button style={styles.navButton} onClick={(e) => { e.stopPropagation(); toggleDropdown('profile'); }}>
                    <span style={styles.navIcon}>👤</span>
                    Profile
                    <span style={styles.navArrow}>▼</span>
                  </button>
                  {dropdownOpen.profile && (
                    <div style={styles.dropdown}>
                      <Link href="/profile" style={styles.dropdownLink}>View Profile</Link>
                      <Link href="/security" style={styles.dropdownLink}>Security Settings</Link>
                      <Link href="/notifications" style={styles.dropdownLink}>Notifications</Link>
                      <Link href="/privacy" style={styles.dropdownLink}>Privacy Settings</Link>
                      <Link href="/messages" style={styles.dropdownLink}>Messages</Link>
                    </div>
                  )}
                </div>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  <span style={styles.actionIcon}>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Search and Filter Section */}
        <section style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <h2 style={styles.pageTitle}>Banking Services</h2>
            <p style={styles.pageSubtitle}>Access all your banking needs in one place</p>

            <div style={styles.searchBar}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.categoryFilter}>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  style={{
                    ...styles.categoryButton,
                    ...(activeCategory === category ? styles.activeCategoryButton : {})
                  }}
                >
                  {category === 'all' ? 'All Services' : category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Access Grid */}
        <section style={styles.quickAccessSection}>
          <h3 style={styles.sectionTitle}>Quick Access</h3>
          <div style={styles.quickAccessGrid}>
            <Link href="/dashboard" style={styles.quickAccessCard}>
              <span style={styles.quickAccessIcon}>📊</span>
              <span style={styles.quickAccessText}>Dashboard</span>
            </Link>
            <Link href="/transfer" style={styles.quickAccessCard}>
              <span style={styles.quickAccessIcon}>💸</span>
              <span style={styles.quickAccessText}>Transfer</span>
            </Link>
            <Link href="/deposit-real" style={styles.quickAccessCard}>
              <span style={styles.quickAccessIcon}>📱</span>
              <span style={styles.quickAccessText}>Deposit</span>
            </Link>
            <Link href="/bill-pay" style={styles.quickAccessCard}>
              <span style={styles.quickAccessIcon}>🧾</span>
              <span style={styles.quickAccessText}>Pay Bills</span>
            </Link>
          </div>
        </section>

        {/* Services by Category */}
        {activeCategory === 'all' ? (
          bankingServices.map(category => (
            <section key={category.category} style={styles.categorySection}>
              <div style={styles.categoryHeader}>
                <div style={styles.categoryTitleGroup}>
                  <span style={{...styles.categoryIcon, color: category.color}}>{category.icon}</span>
                  <h3 style={styles.categoryTitle}>{category.category}</h3>
                </div>
                <span style={styles.serviceCount}>{category.services.length} services</span>
              </div>

              <div style={styles.servicesGrid}>
                {category.services.map(service => (
                  <Link key={service.name} href={service.path} style={styles.serviceCard}>
                    <div style={styles.serviceIcon}>{service.icon}</div>
                    <div style={styles.serviceContent}>
                      <h4 style={styles.serviceName}>{service.name}</h4>
                      <p style={styles.serviceDesc}>{service.desc}</p>
                    </div>
                    <span style={styles.serviceArrow}>→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <section style={styles.categorySection}>
            <div style={styles.categoryHeader}>
              <h3 style={styles.categoryTitle}>
                {activeCategory === 'all' ? 'All Services' : activeCategory}
              </h3>
              <span style={styles.serviceCount}>{filteredServices.length} services</span>
            </div>

            <div style={styles.servicesGrid}>
              {filteredServices.map(service => (
                <Link key={service.name} href={service.path} style={styles.serviceCard}>
                  <div style={styles.serviceIcon}>{service.icon}</div>
                  <div style={styles.serviceContent}>
                    <h4 style={styles.serviceName}>{service.name}</h4>
                    <p style={styles.serviceDesc}>{service.desc}</p>
                  </div>
                  <span style={styles.serviceArrow}>→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Contact Information */}
        <section style={styles.contactSection}>
          <h3 style={styles.sectionTitle}>Need Help?</h3>
          <div style={styles.contactGrid}>
            <div style={styles.contactCard}>
              <span style={styles.contactIcon}>📞</span>
              <div style={styles.contactInfo}>
                <h4 style={styles.contactTitle}>Phone Support</h4>
                <p style={styles.contactDetail}>1-800-OAKLINE</p>
                <span style={styles.contactHours}>24/7 Available</span>
              </div>
            </div>

            <div style={styles.contactCard}>
              <span style={styles.contactIcon}>✉️</span>
              <div style={styles.contactInfo}>
                <h4 style={styles.contactTitle}>Email Support</h4>
                <p style={styles.contactDetail}>support@theoaklinebank.com</p>
                <span style={styles.contactHours}>Response within 24 hours</span>
              </div>
            </div>

            <Link href="/support" style={styles.contactCard}>
              <span style={styles.contactIcon}>💬</span>
              <div style={styles.contactInfo}>
                <h4 style={styles.contactTitle}>Live Chat</h4>
                <p style={styles.contactDetail}>Chat with an agent</p>
                <span style={styles.contactHours}>Mon-Fri 9AM-6PM EST</span>
              </div>
            </Link>
          </div>
        </section>
      </main>
      <LiveChat />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 50%, #059669 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #059669',
    borderRight: '4px solid #d97706',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
    marginBottom: '2rem',
    boxShadow: '0 0 20px rgba(5, 150, 105, 0.3)'
  },
  loadingText: {
    fontSize: '1.2rem',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.95
  },
  header: {
    backgroundColor: '#1a365d',
    borderBottom: '3px solid #059669',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)'
  },
  headerContainer: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '70px',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'white',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: 'white'
  },
  brandTagline: {
    fontSize: '0.8rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  mainNav: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'center'
  },
  navItem: {
    position: 'relative'
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    minWidth: 'auto'
  },
  navIcon: {
    fontSize: '1rem'
  },
  navArrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.2s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    padding: '0.5rem',
    minWidth: '200px',
    zIndex: 1000,
    marginTop: '0.5rem'
  },
  dropdownLink: {
    display: 'block',
    padding: '0.75rem 1rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  welcomeText: {
    fontSize: '0.8rem',
    color: '#bfdbfe'
  },
  userName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white'
  },
  userActions: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.6rem',
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  actionIcon: {
    fontSize: '0.9rem'
  },
  main: {
    maxWidth: '100%',
    margin: '0',
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
    boxSizing: 'border-box'
  },
  searchSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  searchContainer: {
    maxWidth: '100%',
    margin: '0 auto'
  },
  pageTitle: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  pageSubtitle: {
    fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  searchBar: {
    position: 'relative',
    marginBottom: '1.5rem'
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.2rem',
    color: '#64748b'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 3rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  categoryFilter: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  categoryButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  activeCategoryButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  quickAccessSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 1.2rem)',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  quickAccessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '0.75rem'
  },
  quickAccessCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    color: '#374151',
    transition: 'all 0.2s'
  },
  quickAccessIcon: {
    fontSize: '1.5rem'
  },
  quickAccessText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    textAlign: 'center'
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f1f5f9'
  },
  categoryTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  categoryIcon: {
    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)'
  },
  categoryTitle: {
    fontSize: 'clamp(1rem, 3vw, 1.3rem)',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  serviceCount: {
    fontSize: '0.7rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontWeight: '500'
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem'
  },
  serviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    color: '#374151',
    transition: 'all 0.2s'
  },
  serviceIcon: {
    fontSize: '1.5rem',
    padding: '0.75rem',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    minWidth: '50px',
    textAlign: 'center'
  },
  serviceContent: {
    flex: 1
  },
  serviceName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  serviceDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  serviceArrow: {
    fontSize: '1.1rem',
    color: '#94a3b8',
    fontWeight: 'bold'
  },
  contactSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  contactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  contactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.2s'
  },
  contactIcon: {
    fontSize: '1.5rem',
    padding: '0.75rem',
    backgroundColor: '#eff6ff',
    borderRadius: '8px'
  },
  contactInfo: {
    flex: 1
  },
  contactTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  contactDetail: {
    fontSize: '0.9rem',
    color: '#1e40af',
    fontWeight: '500',
    margin: '0 0 0.25rem 0'
  },
  contactHours: {
    fontSize: '0.8rem',
    color: '#64748b'
  },

  // Mobile Responsive Styles
  '@media (max-width: 768px)': {
    headerContainer: {
      flexDirection: 'column',
      padding: '0.75rem',
      minHeight: 'auto',
      gap: '0.75rem'
    },
    mainNav: {
      width: '100%',
      justifyContent: 'space-around',
      order: 2
    },
    navButton: {
      padding: '0.4rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.2rem'
    },
    userSection: {
      order: 1,
      width: '100%',
      justifyContent: 'space-between'
    },
    userActions: {
      gap: '0.25rem'
    },
    actionButton: {
      padding: '0.3rem 0.5rem',
      fontSize: '0.7rem'
    },
    main: {
      padding: '0.75rem 0.5rem'
    },
    quickAccessGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    servicesGrid: {
      gridTemplateColumns: '1fr'
    },
    serviceCard: {
      padding: '1rem'
    }
  },
  '@media (max-width: 480px)': {
    navButton: {
      fontSize: '0.65rem',
      padding: '0.3rem 0.4rem'
    },
    actionButton: {
      fontSize: '0.65rem',
      padding: '0.25rem 0.4rem'
    },
    main: {
      padding: '0.5rem 0.25rem'
    },
    quickAccessGrid: {
      gridTemplateColumns: '1fr'
    },
    categoryFilter: {
      flexDirection: 'column',
      alignItems: 'center'
    }
  }
};