
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function StickyFooter() {
  const { user, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const router = useRouter();

  // Hide footer on certain pages
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = router.pathname;
      const hiddenPaths = ['/signup', '/reset-password', '/verify-email', '/enroll'];
      setIsVisible(!hiddenPaths.some(path => currentPath.startsWith(path)));
    };

    handleRouteChange();
    
    const handleRouteChangeComplete = () => handleRouteChange();
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFeatureClick = () => {
    setShowFeatures(!showFeatures);
  };

  if (!isVisible || loading) return null;

  // Define navigation links based on user authentication status
  const navigation = user ? [
    { name: 'Home', href: '/', icon: '🏠', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊', gradient: 'from-green-500 to-green-600' },
    { name: 'Transfer', href: '/transfer', icon: '💸', gradient: 'from-purple-500 to-purple-600' },
    { name: 'Menu', href: '/main-menu', icon: '☰', gradient: 'from-gray-500 to-gray-600' }
  ] : [
    { name: 'Home', href: '/', icon: '🏠', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Apply', href: '/apply', icon: '📝', gradient: 'from-green-500 to-green-600' },
    { name: 'Sign In', href: '/sign-in', icon: '🔑', gradient: 'from-indigo-500 to-indigo-600' },
    { name: 'About', href: '/about', icon: 'ℹ️', gradient: 'from-teal-500 to-teal-600' }
  ];

  // Premium income-generating features for dropdown
  const premiumFeatures = [
    { name: 'Investment Portfolio', href: '/investments', icon: '📈', desc: 'High-yield investments', color: '#10B981' },
    { name: 'Premium Loans', href: '/loans', icon: '🏠', desc: 'Competitive rates', color: '#3B82F6' },
    { name: 'Crypto Trading', href: '/crypto', icon: '₿', desc: 'Digital asset trading', color: '#F59E0B' },
    { name: 'Wealth Management', href: '/investments', icon: '💎', desc: 'Private banking', color: '#8B5CF6' },
    { name: 'Business Banking', href: '/account-types', icon: '🏢', desc: 'Commercial services', color: '#EF4444' },
    { name: 'Financial Advisory', href: '/financial-advisory', icon: '🎯', desc: 'Expert consultation', color: '#06B6D4' },
    { name: 'International Banking', href: '/internationalization', icon: '🌍', desc: 'Global services', color: '#84CC16' },
    { name: 'Trust Services', href: '/about', icon: '🛡️', desc: 'Estate planning', color: '#F97316' }
  ];

  return (
    <div style={styles.stickyFooter} className="sticky-footer">
      <div style={styles.footerContainer}>
        <div style={styles.footerContent}>
          {/* Navigation Buttons */}
          <div style={styles.navigationSection}>
            {navigation.slice(0, 2).map((navItem) => (
              <Link
                key={navItem.name}
                href={navItem.href}
                style={{
                  ...styles.navButton,
                  background: getGradientColors(navItem.gradient),
                  textDecoration: 'none'
                }}
              >
                <span style={styles.navIcon}>{navItem.icon}</span>
                <span style={styles.navText}>{navItem.name}</span>
              </Link>
            ))}
            
            {/* Features Dropdown Button - Centered */}
            <div style={styles.featuresContainer}>
              <button
                onClick={handleFeatureClick}
                style={styles.featuresButton}
              >
                <span style={styles.navIcon}>💰</span>
                <span style={styles.navText}>Banking+</span>
              </button>
              
              {showFeatures && (
                <>
                  <div style={styles.backdrop} onClick={() => setShowFeatures(false)}></div>
                  <div style={styles.featuresDropdown}>
                    <div style={styles.dropdownHeader}>
                      <h4 style={styles.dropdownTitle}>Premium Banking Services</h4>
                      <p style={styles.dropdownSubtitle}>High-income generating banking solutions</p>
                    </div>
                    
                    <div style={styles.featuresGrid}>
                      {premiumFeatures.map((feature) => (
                        <button
                          key={feature.name}
                          onClick={() => {
                            setShowFeatures(false);
                            router.push(feature.href);
                          }}
                          style={styles.featureItem}
                        >
                          <div style={{
                            ...styles.featureIcon,
                            backgroundColor: `${feature.color}15`,
                            border: `1px solid ${feature.color}30`
                          }}>
                            {feature.icon}
                          </div>
                          <div style={styles.featureContent}>
                            <div style={styles.featureName}>{feature.name}</div>
                            <div style={styles.featureDesc}>{feature.desc}</div>
                          </div>
                          <div style={{ ...styles.featureArrow, color: feature.color }}>→</div>
                        </button>
                      ))}
                    </div>
                    
                    <div style={styles.dropdownFooter}>
                      <button 
                        onClick={() => {
                          setShowFeatures(false);
                          router.push("/account-types");
                        }}
                        style={styles.viewAllButton}
                      >
                        Explore All Premium Services
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {navigation.slice(2).map((navItem) => (
              <Link
                key={navItem.name}
                href={navItem.href}
                style={{
                  ...styles.navButton,
                  background: getGradientColors(navItem.gradient),
                  textDecoration: 'none'
                }}
              >
                <span style={styles.navIcon}>{navItem.icon}</span>
                <span style={styles.navText}>{navItem.name}</span>
              </Link>
            ))}

            {/* Sign Out Button for Authenticated Users */}
            {user && (
              <button
                onClick={handleSignOut}
                style={{
                  ...styles.navButton,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={styles.navIcon}>🔐</span>
                <span style={styles.navText}>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get gradient colors for white theme
function getGradientColors(gradientClass) {
  return '#ffffff';
}

const styles = {
  stickyFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    padding: '0.75rem 1rem',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    borderTop: '2px solid #e5e7eb',
    minHeight: '70px',
    display: 'flex',
    alignItems: 'center'
  },
  footerContainer: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  footerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  navigationSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    gap: '0.5rem',
    flexWrap: 'nowrap',
    position: 'relative'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    backgroundImage: 'none',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    minHeight: '60px',
    flex: 1,
    maxWidth: '80px',
    minWidth: '60px',
    position: 'relative',
    overflow: 'hidden'
  },
  featuresContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '80px'
  },
  featuresButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    backgroundColor: '#ffffff',
    backgroundImage: 'none',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    minHeight: '60px',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
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
  featuresDropdown: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid #e2e8f0',
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
    borderBottom: '1px solid #e2e8f0'
  },
  dropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  dropdownSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  featuresGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  },
  featureIcon: {
    fontSize: '1.25rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    flexShrink: 0
  },
  featureContent: {
    flex: 1
  },
  featureName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  featureDesc: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  featureArrow: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  dropdownFooter: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  viewAllButton: {
    display: 'inline-block',
    padding: '0.75rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  navIcon: {
    fontSize: '1.25rem',
    marginBottom: '0.25rem'
  },
  navText: {
    fontSize: '0.7rem',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1',
    color: 'inherit'
  }
};
