
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function AccountTypes() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const accountTypes = [
    {
      id: 1,
      name: 'Checking Account',
      category: 'Personal',
      description: 'Our flagship checking account is designed for everyday banking with unmatched convenience and security. Enjoy unlimited transactions, comprehensive digital banking tools, and 24/7 access to your funds. This account features no minimum balance requirements and includes premium benefits like ATM fee reimbursement and overdraft protection. Perfect for individuals who want a reliable, full-service banking experience with no hidden fees.',
      icon: '💳',
      rate: '0.25% APY',
      minBalance: '$0',
      monthlyFee: '$0',
      features: [
        'No minimum balance required',
        'Free online and mobile banking with advanced features',
        'Premium debit card with enhanced security chip',
        'Unlimited transactions nationwide',
        'Direct deposit with early access',
        'Mobile check deposit with instant availability',
        'ATM fee reimbursement up to $10/month nationwide',
        'Overdraft protection with multiple coverage options',
        'Free wire transfers (domestic)',
        'Automatic bill pay with scheduling',
        'Real-time fraud monitoring and alerts',
        'FDIC insured up to $250,000'
      ],
      benefits: [
        'Perfect for daily expenses and financial management',
        'Easy bill payments with automatic scheduling',
        'Quick money transfers with Zelle integration',
        'Real-time notifications for all transactions',
        'Access to exclusive member benefits and discounts'
      ],
      eligibility: 'Age 18+ with valid government-issued ID, Social Security Number, and proof of address'
    },
    {
      id: 2,
      name: 'High-Yield Savings Account',
      category: 'Personal',
      description: 'Accelerate your savings growth with our premium high-yield savings account featuring industry-leading interest rates. This account is designed for savers who want to maximize their earnings while maintaining liquidity. With advanced savings tools, automatic round-up features, and goal-setting capabilities, you can effortlessly build your financial future. The account includes comprehensive digital banking features and is fully FDIC insured for your peace of mind.',
      icon: '💰',
      rate: '5.00% APY',
      minBalance: '$500',
      monthlyFee: '$0',
      features: [
        'Competitive 5.00% APY with monthly compounding',
        'No monthly maintenance fees or hidden charges',
        'FDIC insured up to $250,000 per depositor',
        'Advanced online and mobile banking platform',
        'Automatic savings programs with round-up features',
        '6 free withdrawals per month (additional at $3 each)',
        'Direct deposit with automatic allocation',
        'Goal-based savings tools with progress tracking',
        'Savings challenges and milestones',
        'Interest rate alerts and market updates',
        'Transfer scheduling and automation',
        'Detailed savings analytics and reports'
      ],
      benefits: [
        'Industry-leading high interest earnings',
        'Bank-grade security with advanced encryption',
        'Flexible access with reasonable withdrawal limits',
        'Automated saving options to build wealth effortlessly',
        'No penalties for early withdrawal'
      ],
      eligibility: 'Age 18+ with $500 minimum opening deposit and U.S. residency'
    },
    {
      id: 3,
      name: 'Business Checking Account',
      category: 'Business',
      description: 'Comprehensive banking solutions designed for business operations.',
      icon: '🏢',
      rate: '0.15% APY',
      minBalance: '$1,000',
      monthlyFee: '$15 (waived with $5,000 balance)',
      features: [
        'Business debit card',
        'Online business banking',
        'Mobile deposits',
        '200 free transactions/month',
        'Wire transfer capabilities',
        'Payroll services integration',
        'Business credit line access',
        'Cash management tools'
      ],
      benefits: [
        'Professional banking services',
        'Business expense tracking',
        'Payroll management',
        'Tax preparation assistance'
      ],
      eligibility: 'Valid business license and EIN required'
    },
    {
      id: 4,
      name: 'Investment Account',
      category: 'Investment',
      description: 'Grow your wealth with our comprehensive investment platform.',
      icon: '📈',
      rate: 'Variable returns',
      minBalance: '$1,000',
      monthlyFee: '$0 (trading fees apply)',
      features: [
        'Stock and ETF trading',
        'Mutual fund investments',
        'Retirement planning tools',
        'Professional advisory services',
        'Research and analysis tools',
        'Tax-efficient investing',
        'Automatic rebalancing',
        'Mobile trading app'
      ],
      benefits: [
        'Diversified investment options',
        'Professional guidance',
        'Tax optimization',
        'Long-term wealth building'
      ],
      eligibility: 'Age 18+ with investment experience questionnaire'
    },
    {
      id: 5,
      name: 'Student Checking Account',
      category: 'Personal',
      description: 'No-fee banking designed specifically for students.',
      icon: '🎓',
      rate: '2.50% APY',
      minBalance: '$0',
      monthlyFee: '$0',
      features: [
        'No monthly fees',
        'No minimum balance',
        'Free debit card',
        'Mobile banking app',
        'Student discounts',
        'Financial literacy resources',
        'Parent account linking',
        'Graduation bonus program'
      ],
      benefits: [
        'Learn financial responsibility',
        'Build credit history',
        'Special student offers',
        'Educational resources'
      ],
      eligibility: 'Full-time student with valid student ID'
    },
    {
      id: 6,
      name: 'Money Market Account',
      category: 'Personal',
      description: 'Premium savings with higher yields and check-writing privileges.',
      icon: '📊',
      rate: '4.75% APY',
      minBalance: '$2,500',
      monthlyFee: '$12 (waived with balance)',
      features: [
        'Tiered interest rates',
        'Check writing privileges',
        'Debit card access',
        'Limited monthly transactions',
        'FDIC insured',
        'Online account management',
        'Automatic transfers',
        'Premium customer service'
      ],
      benefits: [
        'Higher interest than regular savings',
        'Liquidity with check writing',
        'Premium banking features',
        'Dedicated customer support'
      ],
      eligibility: 'Age 18+ with $2,500 minimum deposit'
    },
    {
      id: 7,
      name: 'Certificate of Deposit (CD)',
      category: 'Personal',
      description: 'Secure your future with guaranteed fixed-rate returns.',
      icon: '🔒',
      rate: '5.25% APY',
      minBalance: '$1,000',
      monthlyFee: '$0',
      features: [
        'Guaranteed fixed rates',
        'FDIC insured',
        'Multiple term options (6 months - 5 years)',
        'Automatic renewal option',
        'No monthly fees',
        'Early withdrawal penalties apply',
        'Compound interest',
        'Promotional rate specials'
      ],
      benefits: [
        'Guaranteed returns',
        'Risk-free investment',
        'Predictable income',
        'Capital preservation'
      ],
      eligibility: 'Age 18+ with minimum $1,000 deposit'
    },
    {
      id: 8,
      name: 'Retirement Account (IRA)',
      category: 'Investment',
      description: 'Plan for your retirement with tax-advantaged savings.',
      icon: '🏖️',
      rate: '4.80% APY',
      minBalance: '$500',
      monthlyFee: '$0',
      features: [
        'Traditional and Roth IRA options',
        'Tax advantages',
        'Investment flexibility',
        'Retirement planning tools',
        'Professional guidance',
        'Automatic contributions',
        'Rollover services',
        'Required minimum distribution management'
      ],
      benefits: [
        'Tax-deferred growth',
        'Retirement security',
        'Investment diversification',
        'Professional retirement planning'
      ],
      eligibility: 'Age 18+ with earned income'
    },
    {
      id: 9,
      name: 'Joint Checking Account',
      category: 'Personal',
      description: 'Shared banking solution perfect for couples and families.',
      icon: '👫',
      rate: '0.50% APY',
      minBalance: '$0',
      monthlyFee: '$0',
      features: [
        'Shared account access',
        'Individual debit cards',
        'Joint online banking',
        'Shared transaction history',
        'Both parties can make deposits/withdrawals',
        'Beneficiary options',
        'Mobile banking for both holders',
        'Automatic bill pay'
      ],
      benefits: [
        'Shared financial management',
        'Transparency in spending',
        'Convenient for couples',
        'Estate planning benefits'
      ],
      eligibility: 'Both account holders must be 18+ with valid ID'
    },
    {
      id: 10,
      name: 'Trust Account',
      category: 'Premium',
      description: 'Professional asset management for beneficiaries and estates.',
      icon: '🛡️',
      rate: '3.50% APY',
      minBalance: '$10,000',
      monthlyFee: '$25',
      features: [
        'Trustee services',
        'Estate planning support',
        'Professional asset management',
        'Beneficiary management',
        'Legal compliance assistance',
        'Investment advisory services',
        'Tax planning',
        'Succession planning'
      ],
      benefits: [
        'Professional management',
        'Legal protection',
        'Tax efficiency',
        'Beneficiary security'
      ],
      eligibility: 'Legal trust documentation required'
    },
    {
      id: 11,
      name: 'Teen Account',
      category: 'Personal',
      description: 'Financial education and banking for teenagers.',
      icon: '👦',
      rate: '2.00% APY',
      minBalance: '$0',
      monthlyFee: '$0',
      features: [
        'Parental oversight',
        'Spending controls',
        'Financial education tools',
        'Mobile app access',
        'Allowance automation',
        'Goal-setting features',
        'Purchase notifications to parents',
        'Graduation to adult account'
      ],
      benefits: [
        'Learn money management',
        'Parental control and oversight',
        'Build financial responsibility',
        'Prepare for adulthood'
      ],
      eligibility: 'Age 13-17 with parental consent'
    },
    {
      id: 12,
      name: 'Senior Account',
      category: 'Personal',
      description: 'Special benefits and services designed for seniors.',
      icon: '👴',
      rate: '4.00% APY',
      minBalance: '$500',
      monthlyFee: '$0',
      features: [
        'No monthly fees',
        'Free checks',
        'Enhanced customer service',
        'Large print statements',
        'Phone banking assistance',
        'Free notary services',
        'Safe deposit box discount',
        'Estate planning assistance'
      ],
      benefits: [
        'Senior-friendly services',
        'Enhanced support',
        'Special discounts',
        'Simplified banking'
      ],
      eligibility: 'Age 55+ with valid ID'
    },
    {
      id: 13,
      name: 'Health Savings Account (HSA)',
      category: 'Specialized',
      description: 'Tax-advantaged savings for healthcare expenses.',
      icon: '🏥',
      rate: '3.75% APY',
      minBalance: '$0',
      monthlyFee: '$0',
      features: [
        'Triple tax advantage',
        'High-deductible health plan required',
        'Investment options',
        'Debit card for medical expenses',
        'Online expense tracking',
        'Contribution limits apply',
        'Rollover capability',
        'Retirement healthcare planning'
      ],
      benefits: [
        'Tax-free contributions',
        'Tax-free growth',
        'Tax-free withdrawals for medical expenses',
        'Retirement healthcare fund'
      ],
      eligibility: 'Must have qualifying high-deductible health plan'
    },
    {
      id: 14,
      name: 'International Account',
      category: 'Specialized',
      description: 'Global banking solutions for international customers.',
      icon: '🌍',
      rate: '3.25% APY',
      minBalance: '$1,000',
      monthlyFee: '$20',
      features: [
        'Multi-currency support',
        'International wire transfers',
        'Foreign exchange services',
        'Global ATM access',
        'International debit cards',
        'Overseas customer support',
        'Currency hedging tools',
        'Import/export financing'
      ],
      benefits: [
        'Global banking access',
        'Currency flexibility',
        'International business support',
        'Reduced foreign transaction fees'
      ],
      eligibility: 'Valid international ID and address verification'
    },
    {
      id: 15,
      name: 'Cryptocurrency Account',
      category: 'Investment',
      description: 'Digital asset management and trading platform.',
      icon: '₿',
      rate: 'Variable',
      minBalance: '$100',
      monthlyFee: '$5',
      features: [
        'Buy, sell, and hold cryptocurrencies',
        'Multiple digital currencies supported',
        'Secure digital wallet',
        'Real-time market data',
        'Advanced trading tools',
        'DeFi integration',
        'Staking rewards',
        'Tax reporting tools'
      ],
      benefits: [
        'Access to digital assets',
        'Portfolio diversification',
        'Potential high returns',
        'Cutting-edge technology'
      ],
      eligibility: 'Age 18+ with crypto trading experience'
    },
    {
      id: 16,
      name: 'Green Investment Account',
      category: 'Investment',
      description: 'Sustainable investing with environmental focus.',
      icon: '🌱',
      rate: '6.00% APY',
      minBalance: '$2,500',
      monthlyFee: '$0',
      features: [
        'ESG investment options',
        'Sustainable fund selection',
        'Impact investing',
        'Carbon footprint tracking',
        'Green bond investments',
        'Renewable energy projects',
        'Social responsibility screening',
        'Impact reporting'
      ],
      benefits: [
        'Positive environmental impact',
        'Sustainable returns',
        'Ethical investing',
        'Future-focused portfolio'
      ],
      eligibility: 'Age 18+ with interest in sustainable investing'
    },
    {
      id: 17,
      name: 'Real Estate Investment Account',
      category: 'Investment',
      description: 'Property investment opportunities and REITs.',
      icon: '🏠',
      rate: '7.50% APY',
      minBalance: '$5,000',
      monthlyFee: '$0',
      features: [
        'REIT investments',
        'Real estate crowdfunding',
        'Property analysis tools',
        'Market research',
        'Diversified property exposure',
        'Professional management',
        'Rental income potential',
        'Property appreciation tracking'
      ],
      benefits: [
        'Real estate exposure',
        'Passive income potential',
        'Portfolio diversification',
        'Professional management'
      ],
      eligibility: 'Age 18+ with $5,000 minimum investment'
    },
    {
      id: 18,
      name: 'Education Savings Account (529)',
      category: 'Specialized',
      description: 'Tax-free education savings for future learning needs.',
      icon: '📚',
      rate: '4.25% APY',
      minBalance: '$250',
      monthlyFee: '$0',
      features: [
        'Tax-free growth',
        'Tax-free withdrawals for education',
        'Age-based investment options',
        'State tax deductions (varies by state)',
        'Beneficiary can be changed',
        'No income limits',
        'Professional management',
        'Automatic contribution plans'
      ],
      benefits: [
        'Education funding',
        'Tax advantages',
        'Flexible beneficiary options',
        'Professional investment management'
      ],
      eligibility: 'Open to anyone wanting to save for education'
    },
    {
      id: 19,
      name: 'Emergency Fund Account',
      category: 'Personal',
      description: 'Quick-access savings for unexpected expenses.',
      icon: '🚨',
      rate: '4.10% APY',
      minBalance: '$500',
      monthlyFee: '$0',
      features: [
        'High-yield savings rates',
        'Instant access to funds',
        'No withdrawal penalties',
        'Automatic savings plans',
        'Goal tracking',
        'Mobile alerts',
        'Separate from regular savings',
        'FDIC insured'
      ],
      benefits: [
        'Financial security',
        'Peace of mind',
        'Quick access in emergencies',
        'Competitive returns'
      ],
      eligibility: 'Age 18+ with valid ID'
    },
    {
      id: 20,
      name: 'Small Business Account',
      category: 'Business',
      description: 'Comprehensive banking for small business owners.',
      icon: '🏪',
      rate: '3.80% APY',
      minBalance: '$500',
      monthlyFee: '$10',
      features: [
        'Business banking services',
        'Merchant services',
        'Payroll processing',
        'Business loans access',
        'Expense tracking',
        'Tax preparation support',
        'Business credit cards',
        'Cash flow management'
      ],
      benefits: [
        'Business growth support',
        'Financial management tools',
        'Professional services',
        'Competitive rates'
      ],
      eligibility: 'Valid business registration and EIN'
    },
    {
      id: 21,
      name: 'Corporate Banking Account',
      category: 'Business',
      description: 'Enterprise-level banking for large corporations.',
      icon: '🏭',
      rate: '4.20% APY',
      minBalance: '$25,000',
      monthlyFee: '$50',
      features: [
        'Corporate treasury services',
        'International banking',
        'Large transaction processing',
        'Dedicated relationship manager',
        'Credit facilities',
        'Cash management',
        'Risk management services',
        'Investment banking access'
      ],
      benefits: [
        'Enterprise solutions',
        'Dedicated support',
        'Global banking access',
        'Professional treasury management'
      ],
      eligibility: 'Corporate entity with significant revenue'
    },
    {
      id: 22,
      name: 'Private Banking Account',
      category: 'Premium',
      description: 'Exclusive banking services for high-net-worth individuals.',
      icon: '💎',
      rate: '5.50% APY',
      minBalance: '$100,000',
      monthlyFee: '$100',
      features: [
        'Personal banker assigned',
        'Exclusive investment opportunities',
        'Concierge services',
        'Estate planning',
        'Tax planning services',
        'Philanthropy advisory',
        'Family office services',
        'Global access privileges'
      ],
      benefits: [
        'Personalized service',
        'Exclusive opportunities',
        'Wealth management',
        'Lifestyle services'
      ],
      eligibility: '$100,000+ liquid assets'
    },
    {
      id: 23,
      name: 'Wealth Management Account',
      category: 'Premium',
      description: 'Comprehensive wealth solutions for affluent clients.',
      icon: '👑',
      rate: '6.75% APY',
      minBalance: '$250,000',
      monthlyFee: '$200',
      features: [
        'Portfolio management',
        'Financial planning',
        'Alternative investments',
        'Trust and estate services',
        'Tax optimization',
        'Insurance planning',
        'Retirement planning',
        'Multi-generational planning'
      ],
      benefits: [
        'Holistic wealth management',
        'Professional guidance',
        'Advanced investment strategies',
        'Legacy planning'
      ],
      eligibility: '$250,000+ investable assets'
    }
  ];

  const categories = ['all', 'Personal', 'Business', 'Investment', 'Specialized', 'Premium'];

  const filteredAccounts = accountTypes.filter(account => {
    const matchesCategory = selectedCategory === 'all' || account.category === selectedCategory;
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Account Types - Oakline Bank</title>
        <meta name="description" content="Explore all 23 account types offered by Oakline Bank. Find the perfect account for your banking needs." />
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.brandName}>Oakline Bank</span>
            </Link>
            <Link href="/" style={styles.backButton}>← Back to Home</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>All 23 Account Types</h1>
            <p style={styles.heroSubtitle}>
              Discover the perfect banking solution tailored to your unique needs. 
              From personal checking to wealth management, we have an account for everyone.
            </p>
          </div>
        </section>

        {/* Search and Filter */}
        <section style={styles.filterSection}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <span style={styles.searchIcon}>🔍</span>
          </div>
          
          <div style={styles.categoryFilter}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category ? styles.activeCategoryButton : {})
                }}
              >
                {category === 'all' ? 'All Accounts' : category}
              </button>
            ))}
          </div>
        </section>

        {/* Account Grid */}
        <section style={styles.accountsSection}>
          <div style={styles.accountsGrid}>
            {filteredAccounts.map(account => (
              <div key={account.id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <span style={styles.accountIcon}>{account.icon}</span>
                  <div>
                    <h3 style={styles.accountName}>{account.name}</h3>
                    <span style={styles.accountCategory}>{account.category}</span>
                  </div>
                  <span style={styles.accountRate}>{account.rate}</span>
                </div>
                
                <p style={styles.accountDescription}>{account.description}</p>
                
                <div style={styles.accountDetails}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Minimum Balance:</span>
                    <span style={styles.detailValue}>{account.minBalance}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Monthly Fee:</span>
                    <span style={styles.detailValue}>{account.monthlyFee}</span>
                  </div>
                </div>

                <div style={styles.featuresSection}>
                  <h4 style={styles.featuresTitle}>Key Features:</h4>
                  <ul style={styles.featuresList}>
                    {account.features.slice(0, 4).map((feature, index) => (
                      <li key={index} style={styles.featureItem}>{feature}</li>
                    ))}
                    {account.features.length > 4 && (
                      <li style={styles.featureItem}>+ {account.features.length - 4} more features</li>
                    )}
                  </ul>
                </div>

                <div style={styles.benefitsSection}>
                  <h4 style={styles.benefitsTitle}>Benefits:</h4>
                  <div style={styles.benefitsList}>
                    {account.benefits.map((benefit, index) => (
                      <span key={index} style={styles.benefitTag}>{benefit}</span>
                    ))}
                  </div>
                </div>

                <div style={styles.eligibilitySection}>
                  <h4 style={styles.eligibilityTitle}>Eligibility:</h4>
                  <p style={styles.eligibilityText}>{account.eligibility}</p>
                </div>

                <Link href="/apply" style={styles.applyButton}>
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section style={styles.ctaSection}>
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>Ready to Open Your Account?</h2>
            <p style={styles.ctaSubtitle}>
              Our banking specialists are here to help you choose the perfect account for your needs.
            </p>
            <div style={styles.ctaButtons}>
              <Link href="/apply" style={styles.primaryButton}>Start Application</Link>
              <Link href="/support" style={styles.secondaryButton}>Speak with a Banker</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1a365d',
    padding: '1rem 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  brandName: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white',
    position: 'relative'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    opacity: 0.9,
    lineHeight: '1.6'
  },
  filterSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '400px',
    margin: '0 auto'
  },
  searchInput: {
    width: '100%',
    padding: '1rem 1rem 1rem 3rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.2rem',
    color: '#64748b'
  },
  categoryFilter: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  categoryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  activeCategoryButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  accountsSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem 4rem'
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
    margin: '1rem 0',
    zIndex: 1
  },
  accountHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem'
  },
  accountIcon: {
    fontSize: '2rem',
    padding: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px'
  },
  accountName: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  accountCategory: {
    fontSize: '0.85rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px'
  },
  accountRate: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 'auto'
  },
  accountDescription: {
    color: '#374151',
    lineHeight: '1.7',
    marginBottom: '1.5rem',
    fontSize: '1rem',
    fontWeight: '400'
  },
  accountDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  detailLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '0.95rem',
    color: '#1e293b',
    fontWeight: '600'
  },
  featuresSection: {
    marginBottom: '1.5rem'
  },
  featuresTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  featuresList: {
    margin: 0,
    paddingLeft: '1rem'
  },
  featureItem: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  benefitsSection: {
    marginBottom: '1.5rem'
  },
  benefitsTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  benefitsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  benefitTag: {
    fontSize: '0.8rem',
    color: '#059669',
    backgroundColor: '#dcfce7',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px'
  },
  eligibilitySection: {
    marginBottom: '2rem'
  },
  eligibilityTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  eligibilityText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  applyButton: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '1.25rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1.1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  ctaSection: {
    backgroundColor: '#1a365d',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white'
  },
  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  ctaSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem'
  },
  ctaButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: 'white',
    textDecoration: 'none',
    border: '2px solid white',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  }
};
