import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import MainMenu from '../components/MainMenu';
import WelcomeBanner from '../components/WelcomeBanner';
import HeroSection from '../components/HeroSection';
import ServicesSection from '../components/ServicesSection';
import FeaturesSection from '../components/FeaturesSection';
import Footer from '../components/Footer';
import LiveChat from '../components/LiveChat';
import Testimonials from '../components/Testimonials';
import TestimonialsSection from '../components/TestimonialsSection';
import LoanApprovalSection from '../components/LoanApprovalSection';
import CTA from '../components/CTA';
import AdminNavDropdown from '../components/AdminNavDropdown';
import AdminFooter from '../components/AdminFooter';

export default function Home() {
  const [user, setUser] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentAccountSlide, setCurrentAccountSlide] = useState(0);
  const [currentFeatureSlide, setCurrentFeatureSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {

    // Get initial session and set up auth listener
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (activeDropdown) {
        const dropdownElement = event.target.closest('.navigationDropdown');
        const backdropElement = event.target.closest('[style*="backdrop"]');

        if (!dropdownElement && !backdropElement) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeDropdown) {
        setActiveDropdown(null);
      }
    });

    const cleanup = () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', (e) => {
        if (e.key === 'Escape') setActiveDropdown(null);
      });
    };

    // Auto-slide for hero images
    const heroInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % bankingImages.length);
    }, 5000);

    // Auto-slide for account types
    const accountInterval = setInterval(() => {
      setCurrentAccountSlide(prev => (prev + 1) % Math.ceil(visibleAccountTypes.length / 6));
    }, 7000);

    // Auto-slide for feature showcase
    const featureInterval = setInterval(() => {
      setCurrentFeatureSlide(prev => (prev + 1) % bankingFeatures.length);
    }, 6000);

    // Enhanced Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    // Observe all animated elements
    setTimeout(() => {
      const elements = document.querySelectorAll('[data-animate]');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      subscription?.unsubscribe();
      clearInterval(heroInterval);
      clearInterval(accountInterval);
      clearInterval(featureInterval);
      observer.disconnect();
      cleanup();
    };
  }, []);

  const premiumFeatures = [
    // Core Banking Services
    { name: 'Online Banking', href: '/dashboard', icon: '💻', desc: 'Digital banking platform', color: '#0EA5E9', section: 'core' },
    { name: 'Mobile Banking', href: '/apply', icon: '📱', desc: 'Banking on the go', color: '#10B981', section: 'core' },
    { name: 'Account Types', href: '/account-types', icon: '🏦', desc: '23 account options', color: '#3B82F6', section: 'core' },
    { name: 'Money Transfer', href: '/transfer', icon: '💸', desc: 'Send & receive funds', color: '#059669', section: 'core' },
    { name: 'Bill Pay', href: '/bill-pay', icon: '🧾', desc: 'Automated payments', color: '#F59E0B', section: 'core' },
    { name: 'Zelle Payments', href: '/zelle', icon: '⚡', desc: 'Instant transfers', color: '#6B21A8', section: 'core' },
    { name: 'Mobile Deposit', href: '/deposit-real', icon: '📸', desc: 'Deposit checks instantly', color: '#14B8A6', section: 'core' },
    { name: 'ATM Network', href: '/atm', icon: '🏧', desc: '24/7 cash access', color: '#8B5CF6', section: 'core' },
    { name: 'Debit & Credit Cards', href: '/cards', icon: '💳', desc: 'Manage your cards', color: '#EC4899', section: 'core' },
    { name: 'Transaction History', href: '/transactions', icon: '📜', desc: 'View all transactions', color: '#64748B', section: 'core' },
    { name: 'Statements', href: '/dashboard', icon: '📄', desc: 'Download statements', color: '#0891B2', section: 'core' },
    { name: 'Branch Locator', href: '/branch-locator', icon: '📍', desc: 'Find nearest branch', color: '#DC2626', section: 'core' },

    // Premium & Advanced Services
    { name: 'Investment Portfolio', href: '/investments', icon: '📈', desc: 'High-yield investments', color: '#10B981', section: 'premium' },
    { name: 'Crypto Trading', href: '/crypto', icon: '₿', desc: 'Digital asset trading', color: '#F59E0B', section: 'premium' },
    { name: 'Home Loans', href: '/loans', icon: '🏠', desc: 'Mortgage solutions', color: '#3B82F6', section: 'premium' },
    { name: 'Personal Loans', href: '/loans', icon: '💰', desc: 'Competitive rates', color: '#059669', section: 'premium' },
    { name: 'Business Banking', href: '/account-types', icon: '🏢', desc: 'Commercial services', color: '#EF4444', section: 'premium' },
    { name: 'Wealth Management', href: '/investments', icon: '💎', desc: 'Private banking', color: '#8B5CF6', section: 'premium' },
    { name: 'Financial Advisory', href: '/financial-advisory', icon: '🎯', desc: 'Expert consultation', color: '#06B6D4', section: 'premium' },
    { name: 'International Banking', href: '/internationalization', icon: '🌍', desc: 'Global services', color: '#84CC16', section: 'premium' },
    { name: 'Trust Services', href: '/about', icon: '🛡️', desc: 'Estate planning', color: '#F97316', section: 'premium' },
    { name: 'Credit Reports', href: '/credit-report', icon: '📊', desc: 'Monitor your credit', color: '#7C3AED', section: 'premium' },
    { name: 'Rewards Program', href: '/rewards', icon: '🎁', desc: 'Earn & redeem rewards', color: '#F43F5E', section: 'premium' },
    { name: 'Market News', href: '/market-news', icon: '📰', desc: 'Financial insights', color: '#0EA5E9', section: 'premium' },
    { name: 'Financial Education', href: '/financial-education', icon: '📚', desc: 'Learning resources', color: '#10B981', section: 'premium' },
    { name: 'Calculators', href: '/calculators', icon: '🧮', desc: 'Financial planning tools', color: '#F59E0B', section: 'premium' },
    { name: 'Current Rates', href: '/current-rates', icon: '📈', desc: 'Interest & exchange rates', color: '#6366F1', section: 'premium' },
    { name: 'Security Center', href: '/security', icon: '🔒', desc: 'Account protection', color: '#EF4444', section: 'premium' }
  ];

  const coreFeatures = premiumFeatures.filter(f => f.section === 'core');
  const premiumServices = premiumFeatures.filter(f => f.section === 'premium');

  const bankingImages = [
    {
      src: '/images/Mobile_banking_user_experience_576bb7a3.png',
      title: 'Mobile Banking Excellence',
      subtitle: 'Complete banking control right in your pocket with our award-winning app',
      icon: '📱',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    },
    {
      src: '/images/Bank_hall_business_discussion_72f98bbe.png',
      title: 'Expert Financial Consultation',
      subtitle: 'Professional advice from certified banking specialists in our modern branches',
      icon: '💼',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    },
    {
      src: '/images/Modern_bank_lobby_interior_d535acc7.png',
      title: 'Modern Banking Facilities',
      subtitle: 'Experience premium banking in our state-of-the-art branch locations',
      icon: '🏦',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    }
  ];

  const bankingFeatures = [
    {
      image: '/images/Professional_banking_team_36e79456.png',
      title: 'Professional Banking Team',
      description: 'Work with our experienced banking professionals who provide personalized financial guidance and support.',
      features: ['Dedicated Relationship Managers', 'Expert Financial Advice', 'Personalized Service', '24/7 Professional Support'],
      icon: '👥',
      color: '#3b82f6'
    },
    {
      image: '/images/Mobile_banking_user_d80a1b31.png',
      title: 'Award-Winning Mobile App',
      description: 'Experience banking reimagined with our state-of-the-art mobile application used by thousands of satisfied customers.',
      features: ['Mobile Check Deposit', 'Instant Transfers', 'Bill Pay & Scheduling', 'Real-time Notifications'],
      icon: '📱',
      color: '#10b981'
    },
    {
      image: '/images/realistic-debit-card-1.svg',
      title: 'Premium Debit Cards',
      description: 'Access your money instantly with our premium debit cards featuring advanced security and contactless technology.',
      features: ['Contactless Payments', 'Real-time Fraud Protection', 'Global Acceptance', 'Mobile Card Controls'],
      icon: '💳',
      color: '#f59e0b'
    },
    {
      image: '/images/premium-debit-card.svg',
      title: 'Secure Card Technology',
      description: 'Bank with confidence using our advanced chip technology and multi-layer security features.',
      features: ['EMV Chip Technology', '24/7 Fraud Monitoring', 'Instant Lock/Unlock', 'Zero Liability Protection'],
      icon: '🔒',
      color: '#8b5cf6'
    },
    {
      image: '/images/Mobile_banking_user_experience_576bb7a3.png',
      title: 'Digital Banking Excellence',
      description: 'Experience seamless online banking with our comprehensive digital platform designed for modern life.',
      features: ['Easy Account Management', 'Seamless Fund Transfers', 'Personalized Dashboard', '24/7 Online Access'],
      icon: '💻',
      color: '#64748b'
    },
    {
      image: '/images/Banking_executive_team_meeting_c758f3ec.png',
      title: 'Expert Financial Advice',
      description: 'Receive personalized guidance from certified financial experts to help you achieve your financial goals.',
      features: ['Personalized Financial Planning', 'Investment Strategy Sessions', 'Retirement Planning', 'Debt Management Advice'],
      icon: '💼',
      color: '#1d4ed8'
    },
    {
      image: '/images/Loan_approval_celebration_a079ff82.png',
      title: 'Instant Loan Approvals',
      description: 'Get quick access to funds with our streamlined and efficient loan application and approval process.',
      features: ['Fast Online Applications', 'Competitive Interest Rates', 'Flexible Repayment Options', 'Pre-qualification Tools'],
      icon: '🚀',
      color: '#059669'
    },
    {
      image: '/images/Bank_consultation_meeting_3eeb5e91.png',
      title: 'Superior User Experience',
      description: 'Navigate your finances with ease through our intuitive and award-winning banking platform.',
      features: ['Intuitive Interface', 'Quick Navigation', 'Smart Features', 'User-Friendly Design'],
      icon: '⭐',
      color: '#f59e0b'
    },
    {
      image: '/images/Small_business_loan_approval_6e0d9c2c.png',
      title: 'Business Banking Solutions',
      description: 'Comprehensive banking solutions designed specifically for small businesses and entrepreneurs.',
      features: ['Business Checking Accounts', 'Merchant Services', 'Small Business Loans', 'Payroll Solutions'],
      icon: '🏢',
      color: '#dc2626'
    },
    {
      image: '/images/Global_currency_exchange_b687ec53.png',
      title: 'Global Currency Exchange',
      description: 'Manage your international finances with competitive exchange rates and global transaction capabilities.',
      features: ['Multi-Currency Accounts', 'Preferential Exchange Rates', 'International Wire Transfers', 'Global ATM Network Access'],
      icon: '🌍',
      color: '#06b6d4'
    },
    {
      image: '/images/Student_banking_services_ee1b5d89.png',
      title: 'Student Banking Solutions',
      description: 'Specialized accounts and resources designed to help students manage their finances effectively.',
      features: ['No-Fee Student Checking', 'Financial Literacy Workshops', 'Overdraft Protection Options', 'Student Credit Building'],
      icon: '🎓',
      color: '#8b5cf6'
    },
    {
      image: '/images/Senior_citizen_banking_benefits_b7e0c6b1.png',
      title: 'Senior Banking Privileges',
      description: 'Exclusive benefits and dedicated services for our valued senior customers.',
      features: ['Specialized Senior Checking', 'Discounted Fees', 'Estate Planning Assistance', 'Priority Customer Service'],
      icon: '👴',
      color: '#374151'
    },
    {
      image: '/images/Digital_investment_dashboard_36d35f19.png',
      title: 'Health Savings Accounts (HSA)',
      description: 'Tax-advantaged savings accounts to help you manage healthcare expenses.',
      features: ['Triple Tax Advantage', 'Investment Options', 'Tax-Free Withdrawals for Medical Costs', 'Portable Accounts'],
      icon: '🏥',
      color: '#10b981'
    },
    {
      image: '/images/Emergency_fund_savings_goal_8b3a0f9c.png',
      title: 'Emergency Savings Tools',
      description: 'Build a robust emergency fund with easy-to-use tools and high-yield savings options.',
      features: ['Goal-Based Savings', 'Automatic Transfers', 'High-Yield Emergency Fund', 'Accessible Funds'],
      icon: '🚨',
      color: '#d97706'
    }
  ];

  const accountTypes = [
    { name: 'Premium Checking', icon: '💎', rate: '0.25% APY', desc: 'Luxury banking with exclusive perks and premium benefits', featured: true, benefits: 'Free checks, premium debit card, concierge service' },
    { name: 'High-Yield Savings', icon: '⭐', rate: '5.00% APY', desc: 'Maximum earning potential with competitive rates', featured: true, benefits: 'No minimum balance, compound interest, mobile banking' },
    { name: 'Business Checking', icon: '🏢', rate: '0.15% APY', desc: 'Professional banking solutions for growing businesses', featured: true, benefits: 'Free business banking, merchant services, payroll integration' },
    { name: 'Investment Account', icon: '📈', rate: 'Variable', desc: 'Trade stocks, bonds, ETFs, and mutual funds', featured: true, benefits: 'Commission-free trades, research tools, advisory services' },
    { name: 'Money Market', icon: '💰', rate: '4.75% APY', desc: 'Premium savings with higher yields and flexibility', featured: true, benefits: 'Tiered interest rates, check writing, debit card access' },
    { name: 'Certificate of Deposit', icon: '🔒', rate: '5.25% APY', desc: 'Secure fixed-rate investments with guaranteed returns', featured: true, benefits: 'FDIC insured, fixed rates, flexible terms' },
    { name: 'Student Account', icon: '🎓', rate: '2.50% APY', desc: 'No-fee banking designed for students', featured: false, benefits: 'No monthly fees, overdraft protection, financial education' },
    { name: 'Retirement IRA', icon: '🏖️', rate: '4.80% APY', desc: 'Plan for your golden years with tax advantages', featured: false, benefits: 'Traditional & Roth options, tax benefits, retirement planning' },
    { name: 'Joint Account', icon: '👫', rate: '0.50% APY', desc: 'Shared banking solutions for couples and families', featured: false, benefits: 'Dual access, shared goals, family financial planning' },
    { name: 'Trust Account', icon: '🛡️', rate: '3.50% APY', desc: 'Manage assets for beneficiaries with professional oversight', featured: false, benefits: 'Estate planning, fiduciary services, beneficiary management' },
    { name: 'Teen Account', icon: '👦', rate: '2.00% APY', desc: 'Financial education and independence for teens', featured: false, benefits: 'Parental controls, spending alerts, financial literacy tools' },
    { name: 'Senior Account', icon: '👴', rate: '4.00% APY', desc: 'Special benefits and services for seniors 65+', featured: false, benefits: 'Senior discounts, health savings options, estate planning' },
    { name: 'Health Savings', icon: '🏥', rate: '3.75% APY', desc: 'Tax-advantaged savings for medical expenses', featured: false, benefits: 'Triple tax advantage, investment options, no expiration' },
    { name: 'International Account', icon: '🌍', rate: '3.25% APY', desc: 'Global banking solutions for international needs', featured: false, benefits: 'Multi-currency support, international transfers, global ATM access' },
    { name: 'Cryptocurrency Account', icon: '₿', rate: 'Variable', desc: 'Secure digital asset management and trading', featured: user ? true : false, benefits: 'Multiple cryptocurrencies, secure storage, trading platform' },
    { name: 'Green Investment', icon: '🌱', rate: '6.00% APY', desc: 'Sustainable investing for environmental impact', featured: user ? true : false, benefits: 'ESG investments, impact reporting, sustainable returns' },
    { name: 'Real Estate Investment', icon: '🏠', rate: '7.50% APY', desc: 'Property investment trusts and real estate funds', featured: user ? true : false, benefits: 'REIT investments, property exposure, professional management' },
    { name: 'Education Savings', icon: '📚', rate: '4.25% APY', desc: 'Tax-free education savings for future learning', featured: false, benefits: '529 plan benefits, tax-free growth, educational flexibility' },
    { name: 'Emergency Fund', icon: '🚨', rate: '4.10% APY', desc: 'Quick access emergency savings with high yields', featured: false, benefits: 'Instant access, high yield, automatic savings tools' },
    { name: 'Small Business', icon: '🏪', rate: '3.80% APY', desc: 'Comprehensive banking solutions for small businesses', featured: false, benefits: 'Business loans, merchant services, accounting integration' },
    { name: 'Corporate Banking', icon: '🏭', rate: '4.20% APY', desc: 'Enterprise banking solutions for large organizations', featured: false, benefits: 'Treasury management, commercial lending, cash management' },
    { name: 'Private Banking', icon: '💎', rate: '5.50% APY', desc: 'Exclusive high-net-worth banking services', featured: user ? true : false, benefits: 'Private banker, exclusive rates, luxury services' },
    { name: 'Wealth Management', icon: '👑', rate: '6.75% APY', desc: 'Comprehensive wealth solutions for affluent clients', featured: user ? true : false, benefits: 'Investment advisory, estate planning, tax optimization' }
  ];

  // Show different account types based on authentication
  const visibleAccountTypes = user ? accountTypes : accountTypes.filter(account => account.featured);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}>
            </div>
          <div style={styles.loadingContent}>
            <h2 style={styles.loadingTitle}>Welcome to Oakline Bank</h2>
            <p style={styles.loadingText}>Loading your premium banking experience...</p>
            <div style={styles.loadingProgress}>
              <div style={styles.progressBar}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.pageContainer}
      onClick={() => setActiveDropdown(null)}
    >
      {/* Single Clean Header */}
      <header
        style={styles.mainHeader}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.headerContainer}>
          <div style={styles.topHeaderRow}>
            {/* Logo Section */}
            <Link href="/" style={styles.logoSection}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.headerLogo} />
              <div style={styles.brandSection}>
                <span style={styles.bankName}>Oakline Bank</span>
                <span style={styles.bankTagline}>Your Financial Partner</span>
              </div>
            </Link>

            {/* Scrolling Welcome Message */}
            <div style={styles.scrollingWelcomeContainer}>
              <div style={styles.scrollingWelcomeText}>
                Welcome to Oakline Bank - Your trusted financial partner since 1995 • Explore all 23 account types with detailed benefits • Join over 500,000+ satisfied customers • Award-winning mobile app • FDIC Insured up to $250,000 • Rated #1 Customer Service
              </div>
            </div>
          </div>

          {/* Comprehensive Admin Dropdown Button - Mobile Friendly Row */}
          {user && (
            <div style={styles.adminDropdownRow}>
              <AdminNavDropdown />
            </div>
          )}

        </div>
      </header>

      {/* Professional Banking Hero Section */}
      <section style={styles.heroSection} id="hero" data-animate>
        <div style={styles.heroParallax}>
          {/* Hero Slider - Updated for better slide transition */}
          <div style={styles.heroSlider}>
            {bankingImages.map((image, index) => (
              <div
                key={index}
                style={{
                  ...styles.heroSlide,
                  opacity: currentSlide === index ? 1 : 0,
                  transform: `translateX(${(index - currentSlide) * 100}%)`,
                  zIndex: currentSlide === index ? 2 : 1,
                }}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  style={styles.heroImage}
                  onError={(e) => {
                    console.warn('Hero image failed to load:', image.src);
                    if (image.fallback) {
                      e.target.src = image.fallback;
                    } else {
                      e.target.style.display = 'none';
                    }
                  }}
                />
                <div style={styles.heroOverlay}></div>
              </div>
            ))}
          </div>
          <div style={{
            ...styles.heroContent,
            ...(isVisible.hero ? styles.heroAnimated : {})
          }}>
            <div style={styles.heroButtons}>
              {user ? (
                <>
                  <Link href="/dashboard" style={styles.heroButton}>
                    <span style={styles.buttonIcon}>📊</span>
                    Go to Dashboard
                  </Link>
                  <Link href="/account-types" style={styles.secondaryButton}>
                    <span style={styles.buttonIcon}>🔍</span>
                    Explore All Accounts
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/apply" style={styles.heroButton}>
                    <span style={styles.buttonIcon}>🚀</span>
                    Start Banking Today
                  </Link>
                  <Link href="/sign-in" style={styles.secondaryButton}>
                    <span style={styles.buttonIcon}>👤</span>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          <div style={styles.slideIndicators}>
            {bankingImages.map((_, index) => (
              <button
                key={index}
                style={{
                  ...styles.indicator,
                  ...(currentSlide === index ? styles.indicatorActive : {})
                }}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>



      {/* Account Types Banner Section */}
      <section style={styles.accountTypesBanner} id="account-types" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['account-types'] ? styles.zoomIn : {})
          }}>
            <h2 style={styles.sectionTitle}>
              {user ? 'All 23 Account Types Available to You' : 'Featured Banking Accounts'}
            </h2>
            <p style={styles.sectionSubtitle}>
              Find the perfect account for your financial needs and goals
              {!user && (
                <span style={styles.loginPrompt}>
                  <br />
                  <Link href="/sign-in" style={styles.loginLink}>
                    🔓 Sign in to unlock all 23 premium account types
                  </Link>
                </span>
              )}
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.accountBannerContainer}>
            <div style={styles.accountBannerImage}>
              <img
                src="/images/bank-discussion.png"
                alt="Banking Discussion - Account Types Available"
                style={styles.bannerImage}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{...styles.bannerImageFallback, display: 'none'}}>
                <div style={styles.fallbackContent}>
                  <span style={styles.fallbackIcon}>🏦</span>
                  <h3 style={styles.fallbackTitle}>23 Account Types Available</h3>
                  <p style={styles.fallbackText}>From basic checking to premium investment accounts</p>
                </div>
              </div>
            </div>

            <div style={styles.accountBannerContent}>
              <div style={styles.accountHighlights}>
                <div style={styles.highlightItem}>
                  <span style={styles.highlightIcon}>💳</span>
                  <div>
                    <h4 style={styles.highlightTitle}>Personal Banking</h4>
                    <p style={styles.highlightDesc}>Checking, Savings, Student accounts</p>
                  </div>
                </div>
                <div style={styles.highlightItem}>
                  <span style={styles.highlightIcon}>🏢</span>
                  <div>
                    <h4 style={styles.highlightTitle}>Business Banking</h4>
                    <p style={styles.highlightDesc}>Professional solutions for businesses</p>
                  </div>
                </div>
                <div style={styles.highlightItem}>
                  <span style={styles.highlightIcon}>📈</span>
                  <div>
                    <h4 style={styles.highlightTitle}>Investment Accounts</h4>
                    <p style={styles.highlightDesc}>Grow your wealth with premium options</p>
                  </div>
                </div>
                <div style={styles.highlightItem}>
                  <span style={styles.highlightIcon}>🎯</span>
                  <div>
                    <h4 style={styles.highlightTitle}>Specialized Accounts</h4>
                    <p style={styles.highlightDesc}>HSA, Trust, International options</p>
                  </div>
                </div>
              </div>

              <div style={styles.accountBannerActions}>
                <Link href="/account-types" style={styles.viewAllAccountsButton}>
                  <span style={styles.buttonIcon}>🔍</span>
                  View All 23 Account Types
                </Link>
                {user ? (
                  <Link href="/apply" style={styles.applyNowButton}>
                    <span style={styles.buttonIcon}>⚡</span>
                    Apply Now
                  </Link>
                ) : (
                  <Link href="/sign-in" style={styles.signInButton}>
                    <span style={styles.buttonIcon}>👤</span>
                    Sign In to Apply
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* New Banking Image Section */}
      <section style={styles.newBankingImageSection} id="banking-image" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['banking-image'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Modern Banking Experience</h2>
            <p style={styles.sectionSubtitle}>
              Experience the future of banking with our state-of-the-art facilities and services
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.newBankingImageGrid}>
            <div style={styles.newBankingImageContainer}>
              <img
                src="/images/image_1760199157530.jpeg"
                alt="Modern Banking Experience"
                style={styles.newBankingImage}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            <div style={styles.newBankingImageContent}>
              <h3 style={styles.newBankingImageTitle}>Your Complete Banking Solution</h3>
              <p style={styles.newBankingImageDescription}>
                Discover a comprehensive range of banking services designed to meet all your financial needs. 
                From everyday transactions to long-term investments, we provide innovative solutions backed by 
                exceptional customer service.
              </p>

              <div style={styles.newBankingImageFeatures}>
                <div style={styles.newBankingImageFeature}>
                  <span style={styles.newBankingImageFeatureIcon}>✓</span>
                  <span>Advanced Digital Platform</span>
                </div>
                <div style={styles.newBankingImageFeature}>
                  <span style={styles.newBankingImageFeatureIcon}>✓</span>
                  <span>Personalized Financial Services</span>
                </div>
                <div style={styles.newBankingImageFeature}>
                  <span style={styles.newBankingImageFeatureIcon}>✓</span>
                  <span>Secure and Reliable Banking</span>
                </div>
                <div style={styles.newBankingImageFeature}>
                  <span style={styles.newBankingImageFeatureIcon}>✓</span>
                  <span>24/7 Customer Support</span>
                </div>
              </div>

              <div style={styles.newBankingImageActions}>
                <Link href="/apply" style={styles.newBankingImageButtonPrimary}>
                  <span style={styles.buttonIcon}>🚀</span>
                  Get Started
                </Link>
                <Link href="/about" style={styles.newBankingImageButtonSecondary}>
                  <span style={styles.buttonIcon}>ℹ️</span>
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Banking Cards Section */}
      <section style={styles.professionalCardsSection} id="professional-cards" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['professional-cards'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Professional Banking Cards</h2>
            <p style={styles.sectionSubtitle}>
              Discover our comprehensive range of premium banking cards designed for every financial need
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.professionalCardsGrid}>
            <div style={styles.professionalCardsImageContainer}>
              <img
                src="/images/Professional_bank_cards_e0d28d7c.png"
                alt="Professional Banking Cards Collection"
                style={styles.professionalCardsImage}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div style={styles.professionalCardsBadge}>
                <span style={styles.badgeIcon}>💳</span>
                <span>Premium Cards</span>
              </div>
            </div>

            <div style={styles.professionalCardsContent}>
              <h3 style={styles.professionalCardsTitle}>Complete Card Solutions</h3>
              <p style={styles.professionalCardsDescription}>
                From everyday debit cards to premium credit cards, we offer a complete suite of banking cards with advanced features, security, and rewards tailored to your lifestyle.
              </p>

              <div style={styles.professionalCardsFeatures}>
                <div style={styles.professionalCardsFeature}>
                  <span style={styles.professionalCardsFeatureIcon}>🛡️</span>
                  <div>
                    <h4 style={styles.professionalCardsFeatureTitle}>Advanced Security</h4>
                    <p style={styles.professionalCardsFeatureDesc}>EMV chip, contactless technology, and fraud protection</p>
                  </div>
                </div>
                <div style={styles.professionalCardsFeature}>
                  <span style={styles.professionalCardsFeatureIcon}>🎁</span>
                  <div>
                    <h4 style={styles.professionalCardsFeatureTitle}>Rewards Program</h4>
                    <p style={styles.professionalCardsFeatureDesc}>Earn cashback and points on every purchase</p>
                  </div>
                </div>
                <div style={styles.professionalCardsFeature}>
                  <span style={styles.professionalCardsFeatureIcon}>🌍</span>
                  <div>
                    <h4 style={styles.professionalCardsFeatureTitle}>Global Acceptance</h4>
                    <p style={styles.professionalCardsFeatureDesc}>Use your cards worldwide with no foreign transaction fees</p>
                  </div>
                </div>
                <div style={styles.professionalCardsFeature}>
                  <span style={styles.professionalCardsFeatureIcon}>📲</span>
                  <div>
                    <h4 style={styles.professionalCardsFeatureTitle}>Digital Wallet Ready</h4>
                    <p style={styles.professionalCardsFeatureDesc}>Apple Pay, Google Pay, and Samsung Pay compatible</p>
                  </div>
                </div>
              </div>

              <div style={styles.professionalCardsActions}>
                <Link href="/cards" style={styles.professionalCardsButtonPrimary}>
                  <span style={styles.buttonIcon}>💳</span>
                  Explore All Cards
                </Link>
                <Link href="/apply" style={styles.professionalCardsButtonSecondary}>
                  <span style={styles.buttonIcon}>📝</span>
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Debit Card Showcase Section */}
      <section style={styles.debitCardShowcase} id="debit-cards" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['debit-cards'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Premium Debit Cards</h2>
            <p style={styles.sectionSubtitle}>
              Experience modern banking with our premium debit card collection featuring advanced security and contactless technology
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.debitCardsGrid}>
            <div style={styles.debitCardItem}>
              <div style={styles.debitCardImageContainer}>
                <img
                  src="/images/realistic-debit-card-1.svg"
                  alt="Premium Debit Card"
                  style={styles.debitCardImage}
                />
                <div style={styles.debitCardBadge}>
                  <span style={styles.badgeIcon}>💳</span>
                  <span>Premium</span>
                </div>
              </div>
              <div style={styles.debitCardContent}>
                <h3 style={styles.debitCardTitle}>Premium Debit Card</h3>
                <p style={styles.debitCardDescription}>
                  Get instant access to your funds with our premium debit card featuring contactless payments and global acceptance.
                </p>
                <div style={styles.debitCardFeatures}>
                  <div style={styles.featureTag}>Contactless Payments</div>
                  <div style={styles.featureTag}>Real-time Fraud Protection</div>
                  <div style={styles.featureTag}>Global Acceptance</div>
                  <div style={styles.featureTag}>Mobile Card Controls</div>
                </div>
                {user ? (
                  <Link href="/cards" style={styles.debitCardButton}>
                    <span style={styles.buttonIcon}>⚡</span>
                    Apply for Card
                  </Link>
                ) : (
                  <Link href="/apply" style={styles.debitCardButton}>
                    <span style={styles.buttonIcon}>🚀</span>
                    Open Account First
                  </Link>
                )}
              </div>
            </div>

            <div style={styles.debitCardItem}>
              <div style={styles.debitCardImageContainer}>
                <img
                  src="/images/premium-debit-card.svg"
                  alt="Premium Debit Card"
                  style={styles.debitCardImage}
                />
                <div style={styles.debitCardBadge}>
                  <span style={styles.badgeIcon}>💎</span>
                  <span>Premium</span>
                </div>
              </div>
              <div style={styles.debitCardContent}>
                <h3 style={styles.debitCardTitle}>Premium Debit Card</h3>
                <p style={styles.debitCardDescription}>
                  Experience luxury banking with our exclusive premium debit card featuring gold accents and elite benefits.
                </p>
                <div style={styles.debitCardFeatures}>
                  <div style={styles.featureTag}>Premium Member Benefits</div>
                  <div style={styles.featureTag}>Gold Card Design</div>
                  <div style={styles.featureTag}>Concierge Service</div>
                  <div style={styles.featureTag}>Priority Support</div>
                </div>
                {user ? (
                  <Link href="/cards" style={styles.debitCardButton}>
                    <span style={styles.buttonIcon}>⚡</span>
                    Apply for Card
                  </Link>
                ) : (
                  <Link href="/apply" style={styles.debitCardButton}>
                    <span style={styles.buttonIcon}>🚀</span>
                    Open Account First
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div style={styles.debitCardCTA}>
            <h3 style={styles.debitCardCTATitle}>Ready to Get Your Premium Debit Card?</h3>
            <p style={styles.debitCardCTASubtitle}>
              Join thousands of customers who enjoy the convenience and security of our premium debit cards
            </p>
            <div style={styles.debitCardCTAButtons}>
              <Link href={user ? "/cards" : "/apply"} style={styles.debitCardCTAPrimary}>
                <span style={styles.buttonIcon}>💳</span>
                {user ? "View My Cards" : "Open Account Today"}
              </Link>
              <Link href="/account-types" style={styles.debitCardCTASecondary}>
                <span style={styles.buttonIcon}>ℹ️</span>
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>





      {/* Professional Banking Services Section */}
      <section style={styles.professionalServicesSection} id="professional-services" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['professional-services'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Professional Banking Services</h2>
            <p style={styles.sectionSubtitle}>
              Comprehensive financial solutions designed for your success with personalized service and expert guidance
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.professionalServicesGrid}>
            <div style={styles.professionalServiceCard}>
              <div style={styles.serviceImageContainer}>
                <img
                  src="/images/Professional_banking_team_36e79456.png"
                  alt="Professional Banking Team"
                  style={styles.serviceImage}
                />
                <div style={styles.serviceBadge}>
                  <span style={styles.badgeIcon}>👥</span>
                  <span>Expert Team</span>
                </div>
              </div>
              <div style={styles.serviceContent}>
                <h3 style={styles.serviceTitle}>Expert Banking Professionals</h3>
                <p style={styles.serviceDescription}>
                  Our certified banking professionals provide personalized financial guidance and comprehensive solutions tailored to your unique needs and goals.
                </p>
                <div style={styles.serviceFeatures}>
                  <div style={styles.serviceFeature}>✓ Certified Financial Advisors</div>
                  <div style={styles.serviceFeature}>✓ Personalized Consultation</div>
                  <div style={styles.serviceFeature}>✓ 24/7 Professional Support</div>
                  <div style={styles.serviceFeature}>✓ Strategic Financial Planning</div>
                </div>
                <Link href="/financial-advisory" style={styles.serviceButton}>
                  <span style={styles.buttonIcon}>💼</span>
                  Schedule Consultation
                </Link>
              </div>
            </div>

            <div style={styles.professionalServiceCard}>
              <div style={styles.serviceImageContainer}>
                <img
                  src="/images/Digital_investment_dashboard_36d35f19.png"
                  alt="Digital Investment Dashboard"
                  style={styles.serviceImage}
                />
                <div style={styles.serviceBadge}>
                  <span style={styles.badgeIcon}>📊</span>
                  <span>Investment Tools</span>
                </div>
              </div>
              <div style={styles.serviceContent}>
                <h3 style={styles.serviceTitle}>Advanced Investment Platform</h3>
                <p style={styles.serviceDescription}>
                  Access sophisticated investment tools and real-time market data through our advanced digital platform designed for serious investors.
                </p>
                <div style={styles.serviceFeatures}>
                  <div style={styles.serviceFeature}>✓ Real-time Market Data</div>
                  <div style={styles.serviceFeature}>✓ Portfolio Analytics</div>
                  <div style={styles.serviceFeature}>✓ Advanced Trading Tools</div>
                  <div style={styles.serviceFeature}>✓ Investment Research</div>
                </div>
                <Link href="/investments" style={styles.serviceButton}>
                  <span style={styles.buttonIcon}>📈</span>
                  Explore Investments
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Banking Solutions Section */}
      <section style={styles.studentBankingSection} id="student-banking" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['student-banking'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Student Banking Solutions</h2>
            <p style={styles.sectionSubtitle}>
              Specialized banking services and financial education designed to support students throughout their academic journey
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.studentBankingGrid}>
            <div style={styles.studentBankingContent}>
              <h3 style={styles.studentBankingTitle}>Banking Made Simple for Students</h3>
              <p style={styles.studentBankingDescription}>
                Start your financial journey with confidence. Our student banking solutions offer no-fee accounts, financial literacy resources, and tools designed specifically for students.
              </p>

              <div style={styles.studentBankingFeatures}>
                <div style={styles.studentFeature}>
                  <span style={styles.studentFeatureIcon}>🎓</span>
                  <div>
                    <h4 style={styles.studentFeatureTitle}>Student Checking Account</h4>
                    <p style={styles.studentFeatureDesc}>No monthly fees, free online banking, and mobile check deposit</p>
                  </div>
                </div>
                <div style={styles.studentFeature}>
                  <span style={styles.studentFeatureIcon}>💡</span>
                  <div>
                    <h4 style={styles.studentFeatureTitle}>Financial Education</h4>
                    <p style={styles.studentFeatureDesc}>Free workshops and resources to build financial literacy</p>
                  </div>
                </div>
                <div style={styles.studentFeature}>
                  <span style={styles.studentFeatureIcon}>🏦</span>
                  <div>
                    <h4 style={styles.studentFeatureTitle}>Student Savings Plans</h4>
                    <p style={styles.studentFeatureDesc}>High-yield savings accounts with goal-setting tools</p>
                  </div>
                </div>
              </div>

              <div style={styles.studentBankingActions}>
                <Link href="/apply" style={styles.studentButtonPrimary}>
                  <span style={styles.buttonIcon}>🚀</span>
                  Open Student Account
                </Link>
                <Link href="/financial-education" style={styles.studentButtonSecondary}>
                  <span style={styles.buttonIcon}>📚</span>
                  Financial Resources
                </Link>
              </div>
            </div>

            <div style={styles.studentBankingImageContainer}>
              <img
                src="/images/Student_banking_services_ee1b5d89.png"
                alt="Student Banking Services"
                style={styles.studentBankingImage}
              />
              <div style={styles.studentBankingBadge}>
                <span style={styles.badgeIcon}>🎓</span>
                <span>Student Focused</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Banking Hall Discussion Section */}
      <section style={styles.consultationSection} id="consultation" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['consultation'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Professional Banking Consultation</h2>
            <p style={styles.sectionSubtitle}>
              Experience world-class banking service with our dedicated professionals in modern banking facilities
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.consultationGrid}>
            <div style={styles.consultationImageSide}>
              <img
                src="/images/Bank_hall_business_discussion_72f98bbe.png"
                alt="Professional Banking Hall Discussion"
                style={styles.consultationImage}
                onError={(e) => {
                  e.target.src = "/images/Banking_executive_team_meeting_c758f3ec.png";
                }}
              />
            </div>
            <div style={styles.consultationContent}>
              <h3 style={styles.consultationTitle}>Expert Financial Guidance</h3>
              <p style={styles.consultationSubtitle}>
                Meet with our certified banking professionals in our state-of-the-art facilities. Get personalized advice and solutions tailored to your financial goals.
              </p>
              <div style={styles.consultationFeatures}>
                <div style={styles.consultationFeature}>
                  <span style={styles.consultationFeatureIcon}>👥</span>
                  <div>
                    <h4 style={styles.consultationFeatureTitle}>Professional Banking Team</h4>
                    <p style={styles.consultationFeatureDesc}>Certified financial experts with decades of experience</p>
                  </div>
                </div>
                <div style={styles.consultationFeature}>
                  <span style={styles.consultationFeatureIcon}>🏦</span>
                  <div>
                    <h4 style={styles.consultationFeatureTitle}>Modern Banking Facilities</h4>
                    <p style={styles.consultationFeatureDesc}>Premium locations designed for your comfort and privacy</p>
                  </div>
                </div>
                <div style={styles.consultationFeature}>
                  <span style={styles.consultationFeatureIcon}>🎯</span>
                  <div>
                    <h4 style={styles.consultationFeatureTitle}>Personalized Solutions</h4>
                    <p style={styles.consultationFeatureDesc}>Custom financial strategies for your unique needs</p>
                  </div>
                </div>
              </div>
              <div style={styles.consultationActions}>
                <Link href="/apply" style={styles.consultationButtonPrimary}>
                  <span style={styles.buttonIcon}>📅</span>
                  Schedule Meeting
                </Link>
                <Link href="/support" style={styles.consultationButtonSecondary}>
                  <span style={styles.buttonIcon}>💬</span>
                  Contact Expert
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Banking Executive Team Section */}
      <section style={styles.executiveSection} id="executive-team" data-animate>
        <div style={styles.container}>
          <div style={styles.executiveGrid}>
            <div style={styles.executiveContent}>
              <h2 style={styles.executiveTitle}>Leadership Excellence</h2>
              <p style={styles.executiveSubtitle}>
                Our experienced leadership team brings together decades of banking expertise to guide your financial journey with proven strategies and innovative solutions.
              </p>
              <div style={styles.executiveFeatures}>
                <div style={styles.executiveFeature}>
                  <span style={styles.executiveFeatureIcon}>👨‍💼</span>
                  <div>
                    <h4 style={styles.executiveFeatureTitle}>Executive Leadership</h4>
                    <p style={styles.executiveFeatureDesc}>Senior executives with proven track records in banking excellence</p>
                  </div>
                </div>
                <div style={styles.executiveFeature}>
                  <span style={styles.executiveFeatureIcon}>📈</span>
                  <div>
                    <h4 style={styles.executiveFeatureTitle}>Strategic Vision</h4>
                    <p style={styles.executiveFeatureDesc}>Forward-thinking approach to modern banking challenges</p>
                  </div>
                </div>
                <div style={styles.executiveFeature}>
                  <span style={styles.executiveFeatureIcon}>🤝</span>
                  <div>
                    <h4 style={styles.executiveFeatureTitle}>Client Commitment</h4>
                    <p style={styles.executiveFeatureDesc}>Dedicated to delivering exceptional customer experiences</p>
                  </div>
                </div>
              </div>
              <div style={styles.executiveActions}>
                <Link href="/about" style={styles.executiveButtonPrimary}>
                  <span style={styles.buttonIcon}>👥</span>
                  Meet Our Team
                </Link>
                <Link href="/financial-advisory" style={styles.executiveButtonSecondary}>
                  <span style={styles.buttonIcon}>💼</span>
                  Advisory Services
                </Link>
              </div>
            </div>
            <div style={styles.executiveImageSide}>
              <img
                src="/images/Banking_executive_team_meeting_c758f3ec.png"
                alt="Banking Executive Team Meeting"
                style={styles.executiveImage}
                onError={(e) => {
                  e.target.src = "/images/Professional_banking_team_36e79456.png";
                }}
              />
            </div>
          </div>
        </div>
      </section>



      {/* Testimonials Section */}
      <Testimonials />



      {/* Account Types Discovery Section */}
      <section style={styles.accountTypesDiscovery} id="account-types-discovery" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['account-types-discovery'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Explore All Our Account Types</h2>
            <p style={styles.sectionSubtitle}>
              Discover detailed information about all 23 account types we offer.
              Find comprehensive features, benefits, and eligibility requirements.
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.accountTypesPreview}>
            {[
              { icon: '💳', title: 'Personal Banking', desc: 'Checking, Savings, Student, Senior accounts and more', color: '#3b82f6' },
              { icon: '🏢', title: 'Business Banking', desc: 'Small Business, Corporate, and Professional accounts', color: '#10b981' },
              { icon: '📈', title: 'Investment Accounts', desc: 'Retirement, Investment, and Wealth Management options', color: '#f59e0b' },
              { icon: '🎯', title: 'Specialized Accounts', desc: 'HSA, Education, Trust, and International accounts', color: '#8b5cf6' }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  ...styles.previewCard,
                  ...(isVisible['account-types-discovery'] ? {
                    ...styles.slideInFromBottom,
                    animationDelay: `${index * 0.2}s`
                  } : {})
                }}
              >
                <div style={{...styles.previewIconContainer, backgroundColor: item.color}}>
                  <span style={styles.previewIcon}>{item.icon}</span>
                </div>
                <h3 style={styles.previewTitle}>{item.title}</h3>
                <p style={styles.previewDesc}>{item.desc}</p>
                <div style={{...styles.previewAccent, backgroundColor: item.color}}></div>
              </div>
            ))}
          </div>

          <div style={styles.accountTypesAction}>
            <Link href="/account-types" style={styles.exploreButton}>
              <span style={styles.buttonIcon}>🔍</span>
              Explore All 23 Account Types
            </Link>
            <p style={styles.actionNote}>
              Get detailed comparisons, features, and eligibility requirements
            </p>
          </div>
        </div>
      </section>



      {/* Modern Banking Facility Section */}
      <section style={styles.facilitySection} id="modern-facility" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['modern-facility'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>State-of-the-Art Banking Facilities</h2>
            <p style={styles.sectionSubtitle}>
              Experience banking in our modern, secure, and comfortable branch locations designed for your convenience
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.facilityGrid}>
            <div style={styles.facilityImageContainer}>
              <img
                src="/images/Modern_bank_lobby_interior_d535acc7.png"
                alt="Modern Bank Lobby Interior"
                style={styles.facilityImage}
                onError={(e) => {
                  e.target.src = "/images/Modern_bank_lobby_interior_27efc3bf.png";
                }}
              />
              <div style={styles.facilityOverlay}>
                <div style={styles.facilityBadge}>
                  <span style={styles.facilityBadgeIcon}>🏆</span>
                  <span>Award-Winning Design</span>
                </div>
              </div>
            </div>

            <div style={styles.facilityContent}>
              <h3 style={styles.facilityTitle}>Premium Banking Environment</h3>
              <p style={styles.facilityDescription}>
                Our modern branches combine cutting-edge technology with elegant design to create a premium banking experience. Every location is designed with your comfort, privacy, and security in mind.
              </p>

              <div style={styles.facilityFeatures}>
                <div style={styles.facilityFeature}>
                  <span style={styles.facilityFeatureIcon}>🔒</span>
                  <div>
                    <h4 style={styles.facilityFeatureTitle}>Advanced Security</h4>
                    <p style={styles.facilityFeatureDesc}>Multi-layer security systems protect your transactions</p>
                  </div>
                </div>
                <div style={styles.facilityFeature}>
                  <span style={styles.facilityFeatureIcon}>💺</span>
                  <div>
                    <h4 style={styles.facilityFeatureTitle}>Comfortable Environment</h4>
                    <p style={styles.facilityFeatureDesc}>Luxurious seating and private consultation areas</p>
                  </div>
                </div>
                <div style={styles.facilityFeature}>
                  <span style={styles.facilityFeatureIcon}>📱</span>
                  <div>
                    <h4 style={styles.facilityFeatureTitle}>Digital Integration</h4>
                    <p style={styles.facilityFeatureDesc}>Seamless blend of digital and personal banking</p>
                  </div>
                </div>
              </div>

              <div style={styles.facilityActions}>
                <Link href="/branch-locator" style={styles.facilityButtonPrimary}>
                  <span style={styles.buttonIcon}>📍</span>
                  Find Nearest Branch
                </Link>
                <Link href="/apply" style={styles.facilityButtonSecondary}>
                  <span style={styles.buttonIcon}>📅</span>
                  Schedule Visit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Banking Excellence Section */}
      <section style={styles.mobileBankingSection} id="mobile-banking" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['mobile-banking'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Award-Winning Mobile Banking</h2>
            <p style={styles.sectionSubtitle}>
              Bank anywhere, anytime with our powerful mobile app featuring cutting-edge technology
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.mobileBankingGrid}>
            <div style={styles.mobileBankingImageContainer}>
              <img
                src="/images/Mobile_banking_user_d80a1b31.png"
                alt="Mobile Banking Excellence"
                style={styles.mobileBankingImage}
                onError={(e) => {
                  e.target.src = '/images/Mobile_banking_user_experience_576bb7a3.png';
                }}
              />
              <div style={styles.mobileBankingBadge}>
                <span style={styles.badgeIcon}>📱</span>
                <span>Mobile First</span>
              </div>
            </div>

            <div style={styles.mobileBankingContent}>
              <h3 style={styles.mobileBankingTitle}>Complete Control in Your Pocket</h3>
              <p style={styles.mobileBankingDescription}>
                Experience the future of banking with our award-winning mobile app. Manage all your accounts, 
                transfer funds, pay bills, and access financial insights - all from your smartphone.
              </p>

              <div style={styles.mobileBankingFeatures}>
                <div style={styles.mobileBankingFeature}>
                  <span style={styles.mobileBankingFeatureIcon}>⚡</span>
                  <div>
                    <h4 style={styles.mobileBankingFeatureTitle}>Instant Transfers</h4>
                    <p style={styles.mobileBankingFeatureDesc}>Send money in seconds with Zelle and instant transfers</p>
                  </div>
                </div>
                <div style={styles.mobileBankingFeature}>
                  <span style={styles.mobileBankingFeatureIcon}>📸</span>
                  <div>
                    <h4 style={styles.mobileBankingFeatureTitle}>Mobile Check Deposit</h4>
                    <p style={styles.mobileBankingFeatureDesc}>Deposit checks instantly by taking a photo</p>
                  </div>
                </div>
                <div style={styles.mobileBankingFeature}>
                  <span style={styles.mobileBankingFeatureIcon}>🔔</span>
                  <div>
                    <h4 style={styles.mobileBankingFeatureTitle}>Real-time Alerts</h4>
                    <p style={styles.mobileBankingFeatureDesc}>Stay informed with instant transaction notifications</p>
                  </div>
                </div>
                <div style={styles.mobileBankingFeature}>
                  <span style={styles.mobileBankingFeatureIcon}>🔐</span>
                  <div>
                    <h4 style={styles.mobileBankingFeatureTitle}>Biometric Security</h4>
                    <p style={styles.mobileBankingFeatureDesc}>Face ID and fingerprint authentication for secure access</p>
                  </div>
                </div>
              </div>

              <div style={styles.mobileBankingActions}>
                <Link href="/apply" style={styles.mobileBankingButtonPrimary}>
                  <span style={styles.buttonIcon}>📲</span>
                  Download App
                </Link>
                <Link href="/account-types" style={styles.mobileBankingButtonSecondary}>
                  <span style={styles.buttonIcon}>ℹ️</span>
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ATM Services Section */}
      <section style={styles.atmSection} id="atm-services" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['atm-services'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Convenient ATM Access</h2>
            <p style={styles.sectionSubtitle}>
              Access your money 24/7 with our extensive ATM network and advanced transaction capabilities
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.atmGrid}>
            <div style={styles.atmImageContainer}>
              <img
                src="/images/Modern_bank_lobby_interior_27efc3bf.png"
                alt="Modern Bank Lobby - ATM Services"
                style={styles.atmImage}
                onError={(e) => {
                  e.target.src = "/images/Modern_bank_lobby_interior_d535acc7.png";
                }}
              />
              <div style={styles.atmBadge}>
                <span style={styles.badgeIcon}>🏧</span>
                <span>24/7 Access</span>
              </div>
            </div>

            <div style={styles.atmContent}>
              <h3 style={styles.atmTitle}>Advanced ATM Services</h3>
              <p style={styles.atmDescription}>
                Experience modern banking with our state-of-the-art ATM network featuring advanced security, 
                multiple transaction types, and convenient locations nationwide.
              </p>

              <div style={styles.atmFeatures}>
                <div style={styles.atmFeature}>
                  <span style={styles.atmFeatureIcon}>💰</span>
                  <div>
                    <h4 style={styles.atmFeatureTitle}>Cash Withdrawals</h4>
                    <p style={styles.atmFeatureDesc}>Quick and secure cash access anytime</p>
                  </div>
                </div>
                <div style={styles.atmFeature}>
                  <span style={styles.atmFeatureIcon}>📄</span>
                  <div>
                    <h4 style={styles.atmFeatureTitle}>Balance Inquiries</h4>
                    <p style={styles.atmFeatureDesc}>Check your account balance instantly</p>
                  </div>
                </div>
                <div style={styles.atmFeature}>
                  <span style={styles.atmFeatureIcon}>📱</span>
                  <div>
                    <h4 style={styles.atmFeatureTitle}>Cardless Transactions</h4>
                    <p style={styles.atmFeatureDesc}>Access using your mobile app</p>
                  </div>
                </div>
              </div>

              <div style={styles.atmActions}>
                <Link href="/atm" style={styles.atmButtonPrimary}>
                  <span style={styles.buttonIcon}>🗺️</span>
                  Find ATM Locations
                </Link>
                <Link href="/cards" style={styles.atmButtonSecondary}>
                  <span style={styles.buttonIcon}>💳</span>
                  Get Debit Card
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loan Approval Banner Section */}
      <section style={styles.loanBannerSection} id="loan-banner" data-animate>
        <div style={styles.container}>
          <div style={{
            ...styles.sectionHeader,
            ...(isVisible['loan-banner'] ? styles.fadeInUp : {})
          }}>
            <h2 style={styles.sectionTitle}>Fast Loan Approvals</h2>
            <p style={styles.sectionSubtitle}>
              Get approved for loans quickly with our streamlined application process and competitive rates
            </p>
            <div style={styles.titleUnderline}></div>
          </div>

          <div style={styles.loanBannerGrid}>
            <div style={styles.loanBannerContent}>
              <h3 style={styles.loanBannerTitle}>Quick & Easy Loan Process</h3>
              <p style={styles.loanBannerDescription}>
                Experience fast loan approvals with our digital-first approach. Whether you need a personal loan, 
                auto financing, or a mortgage, we make the process simple and transparent.
              </p>

              <div style={styles.loanBannerFeatures}>
                <div style={styles.loanBannerFeature}>
                  <span style={styles.loanBannerFeatureIcon}>⚡</span>
                  <div>
                    <h4 style={styles.loanBannerFeatureTitle}>Fast Approval</h4>
                    <p style={styles.loanBannerFeatureDesc}>Get approved in as little as 24 hours</p>
                  </div>
                </div>
                <div style={styles.loanBannerFeature}>
                  <span style={styles.loanBannerFeatureIcon}>💰</span>
                  <div>
                    <h4 style={styles.loanBannerFeatureTitle}>Competitive Rates</h4>
                    <p style={styles.loanBannerFeatureDesc}>Best rates in the market</p>
                  </div>
                </div>
                <div style={styles.loanBannerFeature}>
                  <span style={styles.loanBannerFeatureIcon}>📱</span>
                  <div>
                    <h4 style={styles.loanBannerFeatureTitle}>Digital Process</h4>
                    <p style={styles.loanBannerFeatureDesc}>Apply online from anywhere</p>
                  </div>
                </div>
              </div>

              <div style={styles.loanBannerActions}>
                <Link href="/loans" style={styles.loanBannerButtonPrimary}>
                  <span style={styles.buttonIcon}>🚀</span>
                  Apply for Loan
                </Link>
                <Link href="/calculators" style={styles.loanBannerButtonSecondary}>
                  <span style={styles.buttonIcon}>🧮</span>
                  Loan Calculator
                </Link>
              </div>
            </div>

            <div style={styles.loanBannerImageContainer}>
              <img
                src="/images/Loan_approval_celebration_a079ff82.png"
                alt="Loan Approval Success"
                style={styles.loanBannerImage}
                onError={(e) => {
                  e.target.src = '/images/Loan_approval_celebration_banner_919a886f.png';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA */}
      <div id="final-cta" data-animate style={{
        ...(isVisible['final-cta'] ? styles.pulseGlow : {})
      }}>
        <CTA
          title={user ? "Ready to Expand Your Banking?" : "Ready to Start Your Financial Journey?"}
          subtitle={user ?
            "Access premium banking services and explore all account options." :
            "Join over 500,000 customers who trust Oakline Bank. Open your account today."
          }
          buttonText={user ? "View Account Types" : "Open Account Now"}
          buttonLink={user ? "/account-types" : "/apply"}
          variant="primary"
        />
      </div>

      {/* Live Chat Component */}
      <LiveChat />

      <Footer />

      {/* Admin Footer - Sticky Bottom Navigation */}
      {user && <AdminFooter />}
    </div>
  );
}

const styles = {
  // Main Header Styles
  mainHeader: {
    backgroundColor: '#1A3E6F',
    borderBottom: 'none',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%'
  },
  headerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  topHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  authButtonsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none'
  },
  headerLogo: {
    height: '50px',
    width: 'auto'
  },
  brandSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  bankName: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'white',
    lineHeight: '1'
  },
  bankTagline: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flex: 1,
    justifyContent: 'space-between'
  },
  modernMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 0.9rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: 'white'
  },
  hamburgerLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5px',
    width: '12px'
  },
  hamburgerLine: {
    width: '100%',
    height: '1.5px',
    backgroundColor: 'white',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  menuText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'white'
  },
  bankInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  routingInfo: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  phoneInfo: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#059669'
  },
  enrollButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.3s ease',
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)'
  },
  enrollButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 1rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    boxShadow: '0 3px 8px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    minWidth: '100px',
    justifyContent: 'center'
  },

  // Banking+ Dropdown Styles
  bankingPlusContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: '0.5rem',
    position: 'relative'
  },
  bankingPlusButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)'
  },
  bankingPlusIconLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    width: '18px'
  },
  iconLine: {
    width: '100%',
    height: '2px',
    backgroundColor: '#ffffff',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  bankingPlusText: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  bankingDropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.75rem)',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem',
    width: '420px',
    maxWidth: '90vw',
    zIndex: 10001,
    maxHeight: '75vh',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  bankingDropdownHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: '-1.5rem',
    backgroundColor: 'white',
    zIndex: 1,
    marginTop: '-1.5rem',
    marginLeft: '-1.5rem',
    marginRight: '-1.5rem',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    paddingTop: '1.5rem'
  },
  bankingDropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  bankingDropdownSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  bankingTwoColumnGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  bankingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  bankingSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: '85px',
    backgroundColor: 'white',
    zIndex: 1,
    marginLeft: '-1.5rem',
    marginRight: '-1.5rem',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem'
  },
  bankingSectionIcon: {
    fontSize: '1.5rem'
  },
  bankingSectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  bankingFeaturesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  bankingFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  bankingFeatureIcon: {
    fontSize: '1.1rem',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0
  },
  bankingFeatureContent: {
    flex: 1,
    minWidth: 0
  },
  bankingFeatureName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.2rem',
    lineHeight: '1.3'
  },
  bankingFeatureDesc: {
    fontSize: '0.75rem',
    color: '#64748b',
    lineHeight: '1.3'
  },
  bankingFeatureArrow: {
    fontSize: '0.875rem',
    fontWeight: 'bold',
    flexShrink: 0
  },
  bankingDropdownFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '2px solid #e2e8f0',
    marginTop: '1.5rem',
    position: 'sticky',
    bottom: '-1.5rem',
    backgroundColor: 'white',
    marginLeft: '-1.5rem',
    marginRight: '-1.5rem',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    paddingBottom: '1.5rem',
    marginBottom: '-1.5rem'
  },
  viewAllServicesButton: {
    display: 'block',
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    cursor: 'pointer',
    textAlign: 'center'
  },
  viewAllServicesButtonSecondary: {
    display: 'block',
    width: '100%',
    padding: '0.875rem 1.5rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    border: '2px solid #1e40af',
    cursor: 'pointer',
    textAlign: 'center'
  },

  navigationDropdown: {
    position: 'relative',
    zIndex: 10
  },
  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    border: '2px solid #1a365d',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a365d',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  menuIcon: {
    fontSize: '1.1rem'
  },
  dropdownArrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  featuresDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: 0,
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(26, 54, 93, 0.2)',
    border: '2px solid #e2e8f0',
    padding: '2rem',
    minWidth: '400px',
    maxWidth: '90vw',
    zIndex: 1000,
    animation: 'dropdownSlideIn 0.3s ease-out'
  },
  bankingDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: '0',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 15px 35px rgba(30, 58, 138, 0.2)',
    border: '2px solid #e2e8f0',
    padding: '1.25rem',
    width: '380px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 9999,
    animation: 'dropdownSlideIn 0.3s ease-out'
  },
  bankingDropdownMenuCentered: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 15px 30px rgba(26, 54, 93, 0.2)',
    border: '2px solid #059669',
    padding: '1.5rem',
    minWidth: '420px',
    maxWidth: '85vw',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 10000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(15px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  dropdownBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999
  },
  bankingDropdownGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem'
  },
  bankingDropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  bankingDropdownSectionTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0.5rem'
  },
  bankingDropdownLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  bankingDropdownIcon: {
    fontSize: '1.3rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    borderRadius: '8px',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)'
  },
  bankingDropdownTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.25rem'
  },
  bankingDropdownDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '500'
  },
  accountTypesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: '0.5rem',
    paddingRight: '0.5rem'
  },
  viewAllAccountsLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.8rem',
    borderRadius: '8px',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  bankingDropdownCTA: {
    display: 'flex',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap'
  },
  bankingDropdownButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
    transition: 'all 0.3s ease',
    flex: 1,
    justifyContent: 'center'
  },
  bankingDropdownSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'transparent',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease',
    flex: 1,
    justifyContent: 'center'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem'
  },
  dropdownSection: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1rem'
  },
  dropdownSectionTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    color: '#374151',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: '10px',
    transition: 'all 0.3s ease',
    margin: '0.25rem 0',
    border: '1px solid #f3f4f6'
  },
  dropdownItemIcon: {
    fontSize: '1.2rem',
    width: '24px',
    textAlign: 'center'
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  loginButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'transparent',
    border: '2px solid #059669',
    color: '#059669',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  applyButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  dashboardButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  buttonIcon: {
    fontSize: '1rem'
  },
  topBarContent: {
    maxWidth: '1400px',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  announcement: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexGrow: 1,
    flexWrap: 'wrap'
  },
  announcementIcon: {
    fontSize: '1.5rem',
    marginRight: '0.5rem',
    color: '#059669' // Primary accent color
  },
  announcementText: {
    fontWeight: '500',
    color: '#94a3b8', // Slightly muted text
    flexShrink: 0
  },
  announcementLink: {
    color: '#059669',
    textDecoration: 'none',
    fontWeight: '700',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    transition: 'all 0.3s ease',
    marginLeft: 'auto' // Pushes the link to the right
  },
  topBarLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  topBarLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.3s ease',
    position: 'relative'
  },
  phoneNumber: {
    fontWeight: '700',
    color: '#059669', // Primary accent color for phone number
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  // Loading Screen Styles
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingSpinner: {
    textAlign: 'center',
    maxWidth: '400px',
    padding: '2rem'
  },
  spinner: {
    width: '80px',
    height: '80px',
    border: '8px solid rgba(255,255,255,0.2)',
    borderTop: '8px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1.2s linear infinite',
    marginBottom: '2rem',
    margin: '0 auto 2rem'
  },
  loadingContent: {
    textAlign: 'center'
  },
  loadingTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    animation: 'fadeInUp 1s ease-out'
  },
  loadingText: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem',
    animation: 'fadeInUp 1s ease-out 0.3s both'
  },
  loadingProgress: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
    animation: 'fadeInUp 1s ease-out 0.6s both'
  },
  progressBar: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    borderRadius: '2px',
    animation: 'progressSlide 2s ease-in-out infinite'
  },

  // Main Container
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    width: '100%',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  // Professional Banking Hero Section
  heroSection: {
    position: 'relative',
    height: 'clamp(400px, 56vh, 560px)',
    overflow: 'hidden',
    width: '100%',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '2rem 1rem',
    border: 'none'
  },
  heroParallax: {
    position: 'relative',
    width: '100%',
    height: '100%',
    perspective: '1000px'
  },
  heroSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
    overflow: 'hidden',
  },
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden'
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transition: 'all 1.2s ease-in-out',
    transform: 'scale(1.05)',
    animation: 'heroImageFloat 20s ease-in-out infinite',
    filter: 'grayscale(5%) brightness(1.3) contrast(1.1) opacity(0.9)'
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%)',
    zIndex: 1
  },
  heroContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: 'white',
    maxWidth: '95%',
    width: '100%',
    padding: '0 1rem',
    zIndex: 10,
    transition: 'all 1s ease-out'
  },
  heroAnimated: {
    animation: 'heroContentSlideUp 1.2s ease-out'
  },
  heroIconContainer: {
    marginBottom: '1.5rem'
  },
  heroIcon: {
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    display: 'inline-block',
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
    animation: 'heroIconBounce 2s ease-in-out infinite'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: '900',
    marginBottom: '1rem',
    textShadow: '2px 4px 8px rgba(0,0,0,0.5)',
    lineHeight: '1.1',
    letterSpacing: '-0.02em'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
    marginBottom: '2rem',
    opacity: 0.95,
    maxWidth: '600px',
    margin: '0 auto 2rem',
    fontWeight: '400',
    lineHeight: '1.5',
    textShadow: '1px 2px 4px rgba(0,0,0,0.3)'
  },
  heroActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1.5rem'
  },
  primaryButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },



  heroButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1rem'
  },
  heroButton: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: 'clamp(1rem, 2vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
    fontWeight: '700',
    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    transform: 'translateY(0)',
    animation: 'buttonPulse 2s ease-in-out infinite'
  },

  // Slide Indicators
  slideIndicators: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    zIndex: 15
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid white',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.4s ease',
    backdropFilter: 'blur(5px)'
  },
  indicatorActive: {
    backgroundColor: 'white',
    transform: 'scale(1.4)',
    boxShadow: '0 0 20px rgba(255,255,255,0.8)'
  },

  // Enhanced Features Showcase
  featuresShowcase: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f1f5f9',
    width: '100%',
    position: 'relative'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1rem',
    width: '100%'
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: 'clamp(2rem, 5vw, 4rem)',
    transition: 'all 0.8s ease-out'
  },
  staggeredFadeIn: {
    animation: 'staggeredFadeIn 1s ease-out'
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em'
  },
  sectionSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    fontWeight: '400'
  },
  titleUnderline: {
    width: '80px',
    height: '4px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    margin: '1.5rem auto 0',
    borderRadius: '2px',
    animation: 'underlineExpand 1s ease-out 0.5s both'
  },

  // Feature Showcase Content
  featureShowcaseContainer: {
    marginBottom: '3rem'
  },
  featureContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: 'clamp(2rem, 4vw, 4rem)',
    alignItems: 'center'
  },
  featureImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    transition: 'all 0.8s ease-out',
    transform: 'translateX(-100px)',
    opacity: 0
  },
  slideInFromLeft: {
    animation: 'slideInFromLeft 1s ease-out forwards'
  },
  featureImage: {
    width: '100%',
    height: '240px',
    objectFit: 'cover',
    transition: 'transform 0.5s ease'
  },
  featureImageOverlay: {
    position: 'absolute',
    top: '20px',
    right: '20px'
  },
  featureBadge: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(14, 165, 233, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  badgeIcon: {
    fontSize: '1rem'
  },
  featureInfo: {
    padding: '1rem',
    transition: 'all 0.8s ease-out',
    transform: 'translateX(100px)',
    opacity: 0
  },
  slideInFromRight: {
    animation: 'slideInFromRight 1s ease-out forwards'
  },
  featureTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.01em'
  },
  featureDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  featuresList: {
    marginBottom: '2.5rem'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    fontSize: '1rem',
    color: '#374151',
    opacity: 0,
    transform: 'translateX(-20px)'
  },
  bounceInLeft: {
    animation: 'bounceInLeft 0.6s ease-out forwards'
  },
  featureIcon: {
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)'
  },
  featureText: {
    fontWeight: '600'
  },
  featureActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  featureButton: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: '1rem 1.8rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    boxShadow: '0 6px 16px rgba(4, 120, 87, 0.4)',
    transform: 'translateY(0)'
  },
  featureButtonSecondary: {
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    padding: '1rem 1.8rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease',
    display: 'inline-block'
  },

  // Feature Indicators
  featureIndicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '2.5rem'
  },
  featureIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #0ea5e9',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  featureIndicatorActive: {
    backgroundColor: '#0ea5e9',
    transform: 'scale(1.4)'
  },

  // Account Types Banner Section
  accountTypesBanner: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  loginPrompt: {
    marginTop: '1rem',
    display: 'block'
  },
  loginLink: {
    color: '#059669',
    textDecoration: 'none',
    fontWeight: '700',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    marginTop: '0.5rem'
  },

  // Account Banner Container
  accountBannerContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  accountBannerImage: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  bannerImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
    transition: 'transform 0.3s ease'
  },
  bannerImageFallback: {
    position: 'absolute',
    top: '25px',
    right: '25px',
    bottom: '25px',
    left: '25px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    border: '2px dashed #0ea5e9'
  },
  fallbackContent: {
    textAlign: 'center'
  },
  fallbackIcon: {
    fontSize: '3rem',
    color: '#0ea5e9',
    marginBottom: '1rem'
  },
  fallbackTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '0.5rem'
  },
  fallbackText: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.4'
  },
  accountBannerContent: {
    padding: '1rem'
  },
  accountHighlights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  highlightIcon: {
    fontSize: '1.8rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  highlightTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  highlightDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  accountBannerActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  viewAllAccountsButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  applyNowButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  signInButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e293b',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e293b',
    transition: 'all 0.3s ease'
  },

  // Professional Banking Section
  professionalFeaturesSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    width: '100%',
    position: 'relative'
  },

  // Professional Services Section
  professionalServicesSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: '#ffffff',
    width: '100%'
  },
  professionalServicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
    gap: '3rem',
    marginTop: '3rem'
  },
  professionalServiceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative'
  },
  serviceImageContainer: {
    position: 'relative',
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '20px'
  },
  serviceImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '250px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
  },
  serviceBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  serviceContent: {
    padding: '2.5rem'
  },
  serviceTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  serviceDescription: {
    fontSize: '1.1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  serviceFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '2rem'
  },
  serviceFeature: {
    color: '#059669',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  serviceButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },

  // Student Banking Section
  studentBankingSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  studentBankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  studentBankingContent: {
    padding: '1rem'
  },
  studentBankingTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  studentBankingDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  studentBankingFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  studentFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  studentFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },
  studentFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  studentFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  studentBankingActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  studentButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)'
  },
  studentButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#8b5cf6',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #8b5cf6',
    transition: 'all 0.3s ease'
  },
  studentBankingImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  studentBankingImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  studentBankingBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#8b5cf6',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
    gap: '2rem',
    marginBottom: '4rem'
  },
  professionalFeatureCard: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(26, 54, 93, 0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative',
    overflow: 'hidden',
    transform: 'translateY(50px)',
    opacity: 0
  },
  featureIconBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    position: 'relative',
    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
  },
  featureIconLarge: {
    fontSize: '2.2rem',
    color: 'white'
  },
  professionalFeatureTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  professionalFeatureDesc: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '1.5rem'
  },
  featureMetric: {
    display: 'inline-block',
    padding: '0.8rem 1.5rem',
    borderRadius: '25px',
    border: '2px solid',
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)'
  },
  metricText: {
    fontSize: '1rem',
    fontWeight: '800',
    letterSpacing: '0.5px'
  },

  // Enrollment Section
  enrollmentSection: {
    textAlign: 'center'
  },
  enrollmentCard: {
    backgroundColor: '#f8fafc',
    padding: 'clamp(2.5rem, 5vw, 4rem)',
    borderRadius: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    border: '2px solid #e2e8f0',
    boxShadow: '0 10px 30px rgba(26, 54, 93, 0.1)'
  },
  enrollmentTitle: {
    fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1a365d',
    marginBottom: '1rem',
    letterSpacing: '-0.02em'
  },
  enrollmentSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
    color: '#64748b',
    marginBottom: '2.5rem',
    lineHeight: '1.6'
  },
  enrollmentButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  enrollmentButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    background: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '800',
    boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)',
    transition: 'all 0.3s ease',
    border: 'none',
    transform: 'translateY(0)'
  },
  enrollmentButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    backgroundColor: 'transparent',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '700',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },

  // Features Dropdown Styles
  featuresDropdown: {
    position: 'relative',
    display: 'inline-block'
  },
  featuresDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 1.8rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    color: '#1a365d',
    border: '2px solid #059669',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.15)',
    position: 'relative',
    overflow: 'hidden'
  },
  featuresDropdownMenu: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(26, 54, 93, 0.25)',
    border: '2px solid #059669',
    padding: '2.5rem',
    minWidth: '520px',
    maxWidth: '90vw',
    zIndex: 1000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(20px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  featureDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    padding: '1.2rem',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  },
  featureDropdownIcon: {
    fontSize: '1.6rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  featureDropdownTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.25rem'
  },
  featureDropdownDesc: {
    fontSize: '0.85rem',
    color: '#059669',
    fontWeight: '600'
  },
  dropdownCTA: {
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  dropdownButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.3s ease'
  },
  dropdownArrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease'
  },

  // White Button Styles for Header
  enrollButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 1rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    boxShadow: '0 3px 8px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    minWidth: '100px',
    justifyContent: 'center'
  },
  loginButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer'
  },
  applyButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  dashboardButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  menuButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  logoutButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer'
  },

  // New Banking Image Section
  newBankingImageSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  newBankingImageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  newBankingImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  newBankingImage: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  newBankingImageContent: {
    padding: '1rem'
  },
  newBankingImageTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  newBankingImageDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  newBankingImageFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2.5rem'
  },
  newBankingImageFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '500'
  },
  newBankingImageFeatureIcon: {
    fontSize: '1.2rem',
    color: '#059669',
    fontWeight: 'bold'
  },
  newBankingImageActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  newBankingImageButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  newBankingImageButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Professional Banking Cards Section
  professionalCardsSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  professionalCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  professionalCardsImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  professionalCardsImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
  },
  professionalCardsBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  professionalCardsContent: {
    padding: '1rem'
  },
  professionalCardsTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  professionalCardsDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  professionalCardsFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  professionalCardsFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  professionalCardsFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  professionalCardsFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  professionalCardsFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  professionalCardsActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  professionalCardsButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  professionalCardsButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },

  // Debit Card Showcase Section
  debitCardShowcase: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  debitCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
    gap: '3rem',
    marginBottom: '4rem'
  },
  debitCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative'
  },
  debitCardImageContainer: {
    position: 'relative',
    height: '224px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
  },
  debitCardImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '192px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
    transition: 'transform 0.3s ease'
  },
  debitCardBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  debitCardContent: {
    padding: '2.5rem'
  },
  debitCardTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  debitCardDescription: {
    fontSize: '1.1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  debitCardFeatures: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '2rem'
  },
  featureTag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    border: '1px solid #bae6fd'
  },
  debitCardButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  debitCardCTA: {
    textAlign: 'center',
    backgroundColor: '#f1f5f9',
    padding: 'clamp(3rem, 6vw, 4rem)',
    borderRadius: '20px',
    border: '2px solid #e2e8f0'
  },
  debitCardCTATitle: {
    fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  debitCardCTASubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2.5rem',
    maxWidth: '600px',
    margin: '0 auto 2.5rem'
  },
  debitCardCTAButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  debitCardCTAPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '700',
    boxShadow: '0 8px 25px rgba(5, 150, 105, 0.4)',
    transition: 'all 0.3s ease'
  },
  debitCardCTASecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    backgroundColor: 'transparent',
    color: '#1e293b',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '700',
    border: '2px solid #1e293b',
    transition: 'all 0.3s ease'
  },



  // Professional Banking Consultation Section
  consultationSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: 'white',
    width: '100%'
  },

  // Banking Executive Team Section
  executiveSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  executiveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center'
  },
  executiveContent: {
    padding: '1rem'
  },
  executiveTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  executiveSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  executiveFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  executiveFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  executiveFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  executiveFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  executiveFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  executiveActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  executiveButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  executiveButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },
  executiveImageSide: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  executiveImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'cover',
    borderRadius: '12px',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  consultationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center'
  },
  consultationImageSide: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  consultationImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  consultationContent: {
    padding: '1rem'
  },
  consultationTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  consultationSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  consultationFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  consultationFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  consultationFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  consultationFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  consultationFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  consultationActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  consultationButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  consultationButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Scrolling Welcome Message Styles
  scrollingWelcomeContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '0.5rem 1rem',
    margin: '0 1rem',
    position: 'relative',
    minWidth: '300px',
    maxWidth: '600px'
  },
  scrollingWelcomeText: {
    whiteSpace: 'nowrap',
    animation: 'scrollWelcome 30s linear infinite',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: '500',
    letterSpacing: '0.5px'
  },
  adminDropdownRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },

  // Mobile Navigation Row Styles
  mobileNavigationRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    margin: '0 1rem',
    flexWrap: 'wrap'
  },
  mobileNavigationDropdown: {
    position: 'relative',
    zIndex: 10
  },
  modernDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 1.2rem',
    background: 'white',
    border: '2px solid white',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.9rem',
    fontWeight: '600',
    minWidth: '120px',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,255,255,0.3)'
  },
  modernDropdownText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  downloadDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 1.2rem',
    background: 'white',
    border: '2px solid white',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.9rem',
    fontWeight: '600',
    minWidth: '140px',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,255,255,0.3)'
  },
  downloadDropdownMenu: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 15px 30px rgba(26, 54, 93, 0.2)',
    border: '2px solid #059669',
    padding: '1.5rem',
    minWidth: '320px',
    maxWidth: '85vw',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 10000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(15px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  downloadOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    marginBottom: '0.5rem'
  },
  downloadIcon: {
    fontSize: '1.3rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    borderRadius: '8px',
    flexShrink: 0
  },
  downloadTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.2rem'
  },
  downloadDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '400'
  },
  mobileMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.8rem',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.8rem',
    fontWeight: '400',
    minWidth: '80px',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  mobileHamburgerLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    width: '10px'
  },
  mobileHamburgerLine: {
    width: '100%',
    height: '1.5px',
    backgroundColor: '#1A3E6F',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  mobileMenuText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },

  // Professional Dropdown Styles
  professionalDropdownHeader: {
    textAlign: 'center',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '1.5rem'
  },
  professionalDropdownTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem',
    letterSpacing: '-0.01em'
  },
  professionalDropdownSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    fontWeight: '400',
    lineHeight: '1.4'
  },
  professionalDropdownGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  professionalDropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  professionalSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem'
  },
  professionalSectionIcon: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
    flexShrink: 0
  },
  professionalSectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.005em'
  },
  professionalLinksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  professionalDropdownLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    minHeight: '56px'
  },
  professionalLinkContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1
  },
  professionalLinkTitle: {
    fontSize: '0.95rem',
    fontWeight: '400',
    color: '#1e293b',
    lineHeight: '1.3'
  },
  professionalLinkDesc: {
    fontSize: '0.825rem',
    color: '#64748b',
    fontWeight: '400',
    lineHeight: '1.3'
  },
  professionalLinkArrow: {
    fontSize: '1rem',
    color: '#94a3b8',
    fontWeight: '400',
    transition: 'all 0.2s ease',
    transform: 'translateX(0)',
    opacity: 0.7
  },
  professionalDropdownFooter: {
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  professionalFooterContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  professionalFooterText: {
    textAlign: 'center'
  },
  professionalFooterTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  professionalFooterDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  professionalFooterActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center'
  },
  professionalPrimaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    border: 'none',
    minWidth: '120px',
    boxShadow: '0 1px 3px rgba(30, 64, 175, 0.3)'
  },
  professionalSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: '1px solid #d1d5db',
    transition: 'all 0.2s ease',
    minWidth: '120px'
  },

  // Loading Component for Suspense
  loadingComponent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
    fontSize: '1.2rem',
    color: '#64748b',
    fontWeight: '500'
  },

  // Login Page Styles
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 10px 0',
    textAlign: 'center'
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 30px 0',
    textAlign: 'center'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s ease'
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: '14px',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#fee2e2',
    borderRadius: '8px'
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  logoutButtonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginLeft: '1rem'
  },

  // Account Card styles
  accountCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '2px solid #e2e8f0',
    transition:'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
  },
  accountIconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    fontSize: '1.8rem',
    boxShadow: '0 6px 20px rgba(14, 165, 233, 0.3)'
  },
  accountIcon: {
    position: 'relative',
    top: '2px'
  },
  accountTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  accountRate: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#059669',
    marginBottom: '1rem'
  },
  accountDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5',
    flexGrow: 1,
    marginBottom: '1rem'
  },
  accountCardButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    marginTop: 'auto',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
  },

  // Account Types Discovery Section
  accountTypesDiscovery: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  accountTypesPreview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: '2rem',
    marginTop: '3rem',
    marginBottom: '3rem'
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '2.5rem',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden'
  },
  previewIconContainer: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    fontSize: '2rem',
    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)'
  },
  previewIcon: {
    position: 'relative',
    top: '3px'
  },
  previewTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  previewDesc: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  previewAccent: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    right: '-2px',
    height: '10px',
    borderBottomLeftRadius: '18px',
    borderBottomRightRadius: '18px'
  },
  accountTypesAction: {
    textAlign: 'center'
  },
  exploreButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1.1rem 2.2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  actionNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '1rem',
    lineHeight: '1.5'
  },

  // Modern Banking Facility Section
  facilitySection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  facilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  facilityImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  facilityImage: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  facilityOverlay: {
    position: 'absolute',
    top: '20px',
    right: '20px'
  },
  facilityBadge: {
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  facilityBadgeIcon: {
    fontSize: '1rem'
  },
  facilityContent: {
    padding: '1rem'
  },
  facilityTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  facilityDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  facilityFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  facilityFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  facilityFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  facilityFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  facilityFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  facilityActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  facilityButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  facilityButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Mobile Banking Excellence Section
  mobileBankingSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  mobileBankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  mobileBankingImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  mobileBankingImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  mobileBankingBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  mobileBankingContent: {
    padding: '1rem'
  },
  mobileBankingTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  mobileBankingDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  mobileBankingFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  mobileBankingFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem'
  },
  mobileBankingFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  mobileBankingFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  mobileBankingFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  mobileBankingActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  mobileBankingButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  mobileBankingButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },

  // ATM Services Section Styles
  atmSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  atmGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  atmImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  atmImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  atmBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  atmContent: {
    padding: '1rem'
  },
  atmTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  atmDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  atmFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  atmFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  atmFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  atmFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  atmFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  atmActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  atmButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  atmButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Loan Approval Banner Section
  loanBannerSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  loanBannerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  loanBannerContent: {
    padding: '1rem'
  },
  loanBannerTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  loanBannerDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  loanBannerFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  loanBannerFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  loanBannerFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  loanBannerFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  loanBannerFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  loanBannerActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  loanBannerButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  loanBannerButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },
  loanBannerImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  loanBannerImage: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  loanBannerBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#059669',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },

  // CTA Button Styles
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.15rem 2.3rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.27rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.3)'
  },
  ctaButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.15rem 2.3rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.27rem',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  ctaIcon: {
    fontSize: '1.2rem'
  },

  // Pulse Glow animation style for CTA
  pulseGlow: {
    animation: 'pulseGlow 2s infinite ease-in-out'
  },

  // Testimonials Section Styles
  testimonialsSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },

  // Loan Approval Section Styles
  loanApprovalSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },

  };

// Add hover effects for dropdown items  
if (typeof window !== 'undefined') {
  const existingStyle = document.querySelector('#dropdown-styles');
  if (!existingStyle) {
    const dropdownStyles = document.createElement('style');
    dropdownStyles.id = 'dropdown-styles';
    dropdownStyles.textContent = `
      .featureDropdownItem:hover {
        background-color: #f8fafc !important;
        color: #1e40af !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
      }

      .featuresDropdownButton:hover {
        background-color: #f0f9ff !important;
        border-color: #059669 !important;
        color: #059669 !important;
        transform: translateY(-2px);
      }

      .dropdownButton:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(5, 150, 105, 0.4);
      }

      .modernMenuButton:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        transform: translateY(-2px);
      }

      .modernMenuButton:hover .hamburgerLine {
        background-color: #0ea5e9 !important;
      }
    `;
    document.head.appendChild(dropdownStyles);
  }
}

// Add CSS animations to the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* Dropdown positioning fix */
    .dropdown-container {
      position: relative;
      z-index: 9999;
    }

    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
    }

    .dropdown-menu {
      position: fixed;
      top: 80px;
      right: 1rem;
      z-index: 9999;
      animation: dropdownSlideIn 0.3s ease-out;
    }

    @keyframes dropdownSlideIn {
      0% { 
        opacity: 0; 
        transform: translateY(-10px) scale(0.95); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }

    /* Image fallback styles */
    .image-fallback {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    :root {
      /* Professional Banking Color Palette */
      --navy-blue: #1e40af;
      --navy-blue-light: #3b82f6;
      --navy-blue-dark: #1e3a8a;
      --banking-blue: #0ea5e9;
      --banking-blue-light: #38bdf8;
      --banking-blue-dark: #0284c7;
      --banking-gold: #d97706;
      --banking-gold-light: #f59e0b;
      --banking-gold-dark: #92400e;
      --pure-white: #ffffff;
      --off-white: #f8fafc;
      --neutral-gray: #64748b;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes progressSlide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }

    @keyframes heroImageFloat {
      0%, 100% { transform: scale(1.05) translateY(0px); }
      50% { transform: scale(1.08) translateY(-10px); }
    }

    @keyframes heroContentSlideUp {
      0% { transform: translate(-50%, -30%) scale(0.9); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }

    @keyframes heroIconBounce {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    @keyframes routingCardGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
      50% { box-shadow: 0 0 30px rgba(255,255,255,0.5); }
    }

    @keyframes buttonPulse {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-2px) scale(1.02); }
    }

    @keyframes staggeredFadeIn {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes underlineExpand {
      0% { width: 0; }
      100% { width: 80px; }
    }

    @keyframes slideInFromLeft {
      0% { transform: translateX(-100px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideInFromRight {
      0% { transform: translateX(100px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideInFromBottom {
      0% { transform: translateY(50px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes bounceInLeft {
      0% { transform: translateX(-20px); opacity: 0; }
      60% { transform: translateX(5px); opacity: 0.8; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes flipInY {
      0% { transform: scale(0.8) rotateY(90deg); opacity: 0; }
      50% { transform: scale(0.9) rotateY(0deg); opacity: 0.5; }
      100% { transform: scale(1) rotateY(0deg); opacity: 1; }
    }

    @keyframes fadeInUp {
      0% { transform: translateY(30px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes zoomIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.02); filter: brightness(1.1); }
    }

    /* Scrolling Welcome Animation */
    @keyframes scrollWelcome {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }

    /* Hover Effects */
    .featureDropdownItem:hover {
      background-color: #f8fafc !important;
      color: #1e40af !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
    }

    /* Professional Dropdown Hover Effects */
    .professionalDropdownLink:hover {
      background-color: #f8fafc !important;
      border-color: #e2e8f0 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
    }

    .professionalDropdownLink:hover .professionalLinkArrow {
      transform: translateX(4px) !important;
      opacity: 1 !important;
      color: #1e40af !important;
    }

    .professionalPrimaryButton:hover {
      background-color: #1d4ed8 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4) !important;
    }

    .professionalSecondaryButton:hover {
      background-color: #f9fafb !important;
      border-color: #9ca3af !important;
      color: #1f2937 !important;
    }

    /* Download dropdown hover effects */
    a[style*="downloadOption"]:hover {
      background-color: #f8fafc !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
    }

    /* Professional cards hover effects */
    .professionalCardsButtonPrimary:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 15px 35px rgba(30, 64, 175, 0.6) !important;
    }

    .professionalCardsButtonSecondary:hover {
      background-color: rgba(30, 64, 175, 0.1) !important;
      transform: translateY(-3px) !important;
    }

    /* Mobile dropdown positioning */
    @media (max-width: 768px) {
      .dropdownMenu {
        position: fixed !important;
        top: 80px !important;
        left: 1rem !important;
        right: 1rem !important;
        min-width: auto !important;
        max-width: none !important;
      }

      .dropdownGrid {
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
      }
    }

    .accountCard:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }

    .previewCard:hover {
      transform: translateY(-10px);
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }

    .heroButton:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(4, 120, 87, 0.6);
    }

    .secondaryButton:hover {
      background-color: rgba(255,255,255,0.2);
      transform: translateY(-3px);
    }

    .featureImage:hover {
      transform: scale(1.05);
    }

    .exploreButton:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(4, 120, 87, 0.6);
    }

    .topBarLink:hover {
      color: #ffffff; /* Lighten color on hover */
    }

    .announcementLink:hover {
      background-color: rgba(5, 150, 105, 0.2);
    }

    /* New section hover effects */
    .facilityImage:hover {
      transform: scale(1.05);
    }

    .executiveImage:hover {
      transform: scale(1.02);
    }

    .facilityButtonPrimary:hover, .executiveButtonPrimary:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(5, 150, 105, 0.6);
    }

    .facilityButtonSecondary:hover, .executiveButtonSecondary:hover {
      background-color: rgba(5, 150, 105, 0.1);
      transform: translateY(-3px);
    }

    @keyframes slideInUp {
      from {
        transform: translateY(100px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}