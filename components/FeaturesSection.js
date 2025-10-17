// components/FeaturesSection.js
export default function FeaturesSection() {
  const features = [
    {
      icon: '🔒',
      title: 'Bank-Level Security',
      description: 'Advanced encryption and multi-factor authentication protect your financial data.',
      stat: '256-bit SSL'
    },
    {
      icon: '⚡',
      title: 'Instant Transfers',
      description: 'Send money instantly to anyone, anywhere with our real-time payment system.',
      stat: '< 1 second'
    },
    {
      icon: '📱',
      title: 'Mobile-First Banking',
      description: 'Full banking functionality in your pocket with our award-winning mobile app.',
      stat: '4.9★ Rating'
    },
    {
      icon: '💼',
      title: 'Business Solutions',
      description: 'Comprehensive business banking tools for entrepreneurs and corporations.',
      stat: '50K+ Businesses'
    },
    {
      icon: '🌍',
      title: 'Global Reach',
      description: 'Access your account from anywhere in the world with 24/7 customer support.',
      stat: '190+ Countries'
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'AI-powered insights to help you track spending and achieve financial goals.',
      stat: 'Real-time Data'
    }
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Why Choose Oakline Bank?</h2>
          <p style={styles.subtitle}>
            Experience the future of banking with cutting-edge technology and personalized service
          </p>
        </div>
        
        <div style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} style={styles.featureCard}>
              <div style={styles.iconContainer}>
                <span style={styles.icon}>{feature.icon}</span>
              </div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
              <div style={styles.statBadge}>
                <span style={styles.statText}>{feature.stat}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div style={styles.ctaSection}>
          <div style={styles.ctaContent}>
            <h3 style={styles.ctaTitle}>Ready to Experience Modern Banking?</h3>
            <p style={styles.ctaDescription}>
              Join over 500,000 satisfied customers who trust Oakline Bank for their financial needs
            </p>
            <div style={styles.ctaButtons}>
              <a href="/apply" style={styles.primaryBtn}>Open Account Today</a>
              <a href="/contact" style={styles.secondaryBtn}>Contact Us</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '80px',
  },
  title: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: '700',
    marginBottom: '20px',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
    marginBottom: '80px',
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '32px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  },
  iconContainer: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px auto',
  },
  icon: {
    fontSize: '32px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '16px',
  },
  featureDescription: {
    fontSize: '16px',
    opacity: 0.9,
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  statBadge: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    padding: '8px 16px',
    display: 'inline-block',
  },
  statText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  ctaSection: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '60px 40px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  ctaContent: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  ctaTitle: {
    fontSize: 'clamp(24px, 3vw, 32px)',
    fontWeight: '700',
    marginBottom: '16px',
  },
  ctaDescription: {
    fontSize: '18px',
    opacity: 0.9,
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  ctaButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    background: 'white',
    color: '#1e40af',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
  },
};

// Mobile responsive
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  if (mediaQuery.matches) {
    styles.featuresGrid.gridTemplateColumns = '1fr';
    styles.featuresGrid.gap = '20px';
    styles.featureCard.padding = '24px';
    styles.section.padding = '60px 0';
    styles.ctaSection.padding = '40px 20px';
    styles.ctaButtons.flexDirection = 'column';
    styles.ctaButtons.alignItems = 'stretch';
  }
}