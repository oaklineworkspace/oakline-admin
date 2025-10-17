// components/ServicesSection.js
import Link from 'next/link';

export default function ServicesSection() {
  const services = [
    {
      icon: '💳',
      title: 'Digital Banking',
      description: 'Experience seamless online and mobile banking with 24/7 account access, instant transfers, and mobile deposits.',
      features: ['Mobile Check Deposit', 'Real-time Notifications', 'Bill Pay & Transfers'],
      image: '/images/Mobile_banking_user_experience_576bb7a3.png',
      link: '/apply'
    },
    {
      icon: '🏠',
      title: 'Home Loans',
      description: 'Competitive mortgage rates and personalized loan solutions to help you achieve your homeownership dreams.',
      features: ['Pre-approval in Minutes', 'Competitive Rates', 'Expert Guidance'],
      image: '/images/Banking_executive_team_meeting_c758f3ec.png',
      link: '/loans'
    },
    {
      icon: '💰',
      title: 'Investment Solutions',
      description: 'Grow your wealth with our comprehensive investment portfolio management and financial advisory services.',
      features: ['Portfolio Management', 'Crypto Trading', 'Financial Planning'],
      image: '/images/Digital_investment_dashboard_36d35f19.png',
      link: '/investments'
    }
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Complete Banking Solutions</h2>
          <p style={styles.subtitle}>
            Discover our comprehensive range of financial services designed to meet all your banking needs
          </p>
        </div>

        <div style={styles.servicesGrid}>
          {services.map((service, index) => (
            <div key={index} style={styles.serviceCard}>
              <div style={styles.serviceImage}>
                <img
                  src={service.image}
                  alt={service.title}
                  style={styles.image}
                />
                <div style={styles.serviceOverlay}>
                  <span style={styles.serviceIcon}>{service.icon}</span>
                </div>
              </div>

              <div style={styles.serviceContent}>
                <h3 style={styles.serviceTitle}>{service.title}</h3>
                <p style={styles.serviceDescription}>{service.description}</p>

                <ul style={styles.featuresList}>
                  {service.features.map((feature, idx) => (
                    <li key={idx} style={styles.featureItem}>
                      <span style={styles.checkIcon}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={service.link} style={styles.serviceBtn}>
                  Learn More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
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
    color: '#1e293b',
    marginBottom: '20px',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '18px',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '40px',
  },
  serviceCard: {
    background: 'white',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease',
    border: '1px solid #e2e8f0',
  },
  serviceImage: {
    position: 'relative',
    height: '220px',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  serviceOverlay: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    padding: '12px',
    backdropFilter: 'blur(10px)',
  },
  serviceIcon: {
    fontSize: '24px',
  },
  serviceContent: {
    padding: '32px',
  },
  serviceTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px',
  },
  serviceDescription: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 32px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    fontSize: '14px',
    color: '#475569',
  },
  checkIcon: {
    color: '#059669',
    fontWeight: '700',
    fontSize: '16px',
  },
  serviceBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#1e40af',
    fontWeight: '600',
    fontSize: '16px',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
  },
};

// Mobile responsive
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 768px)');

  if (mediaQuery.matches) {
    styles.servicesGrid.gridTemplateColumns = '1fr';
    styles.servicesGrid.gap = '24px';
    styles.serviceContent.padding = '24px';
    styles.section.padding = '60px 0';
  }
}