import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function StickyFooter() {
  const { user, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.features-dropdown-container')) {
        setShowFeatures(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


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

  // Define navigation links - Admin-focused navigation
  const navigation = [
    { name: 'Admin Hub', href: '/admin', icon: '🏦', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Dashboard', href: '/admin/admin-dashboard', icon: '📊', gradient: 'from-green-500 to-green-600' },
    { name: 'Users', href: '/admin/manage-all-users', icon: '👥', gradient: 'from-purple-500 to-purple-600' },
    { name: 'Applications', href: '/admin/approve-applications', icon: '✅', gradient: 'from-orange-500 to-orange-600' },
    { name: 'Cards', href: '/admin/admin-card-applications', icon: '💳', gradient: 'from-indigo-500 to-indigo-600' },
    { name: 'Transactions', href: '/admin/admin-transactions', icon: '💸', gradient: 'from-red-500 to-red-600' }
  ];

  // Premium features data for dropdown
  const premiumFeatures = [
    { name: 'Create User', href: '/admin/create-user', icon: '➕', desc: 'Add new accounts', color: '#10B981' },
    { name: 'Approve Accounts', href: '/admin/approve-accounts', icon: '✔️', desc: 'Account approvals', color: '#3B82F6' },
    { name: 'Issue Cards', href: '/admin/issue-debit-card', icon: '🎫', desc: 'Issue debit cards', color: '#F59E0B' },
    { name: 'Manual Transactions', href: '/admin/manual-transactions', icon: '✍️', desc: 'Create transactions', color: '#8B5CF6' },
    { name: 'Bulk Transactions', href: '/admin/bulk-transactions', icon: '📦', desc: 'Batch processing', color: '#EF4444' },
    { name: 'User Enrollment', href: '/admin/manage-user-enrollment', icon: '🔑', desc: 'Enrollment setup', color: '#06B6D4' },
    { name: 'Delete Users', href: '/admin/delete-user-by-id', icon: '🗑️', desc: 'Remove accounts', color: '#DC2626' },
    { name: 'System Logs', href: '/admin/admin-logs', icon: '📜', desc: 'View activity logs', color: '#6366F1' },
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
                <span style={styles.navIcon}>🔧</span>
                <span style={styles.navText}>Tools+</span>
              </button>

              {showFeatures && (
                <>
                  <div style={styles.backdrop} onClick={() => setShowFeatures(false)}></div>
                  <div style={styles.featuresDropdown}>
                    <div style={styles.dropdownHeader}>
                      <h4 style={styles.dropdownTitle}>Admin Management Tools</h4>
                      <p style={styles.dropdownSubtitle}>Quick access to administrative functions</p>
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
                          router.push("/admin");
                        }}
                        style={styles.viewAllButton}
                      >
                        View All Admin Pages
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
  },
  footerNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    padding: '0.5rem 0',
    flexWrap: 'nowrap',
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    borderTop: '2px solid #e2e8f0'
  },
  footerButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    background: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footerIcon: {
    fontSize: '1.3rem',
    marginBottom: '0.3rem',
    display: 'inline-block',
  },
  footerLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    lineHeight: '1',
    marginTop: '2px',
  },
  adminHubBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
  },
  adminHubDropdown: {
    position: 'fixed',
    bottom: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    width: '95%',
    maxWidth: '600px',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 9999,
    animation: 'slideUp 0.3s ease-out',
  },
  adminDropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  adminDropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  adminDropdownContent: {
    padding: '1rem',
  },
  adminSection: {
    marginBottom: '1.25rem',
  },
  adminSectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: '0 0 0.75rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  adminLinkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  adminLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    backgroundColor: '#f8fafc',
  },
  adminLinkIcon: {
    fontSize: '1.25rem',
    width: '28px',
    textAlign: 'center',
  },
  adminLinkText: {
    flex: 1,
    fontWeight: '500',
  },
  };