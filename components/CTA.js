// components/CTA.js
import Link from 'next/link';

export default function CTA({ title, buttonText, buttonLink, subtitle, variant = 'primary' }) {
  const styles = {
    ctaSection: {
      backgroundColor: variant === 'primary' ? '#1e3a8a' : '#059669',
      background: variant === 'primary' 
        ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
        : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      padding: '80px 20px',
      textAlign: 'center',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 2,
    },
    backgroundPattern: {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      opacity: '0.1',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      zIndex: 1,
    },
    title: {
      fontSize: '42px',
      fontWeight: 'bold',
      marginBottom: '20px',
      lineHeight: '1.2',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    subtitle: {
      fontSize: '20px',
      marginBottom: '40px',
      opacity: '0.95',
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '0 auto 40px auto',
    },
    ctaButton: {
      backgroundColor: '#ffffff',
      color: variant === 'primary' ? '#1e3a8a' : '#059669',
      textDecoration: 'none',
      padding: '18px 40px',
      borderRadius: '12px',
      fontWeight: '700',
      fontSize: '18px',
      display: 'inline-block',
      transition: 'all 0.3s',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
      border: 'none',
      cursor: 'pointer',
    },
    features: {
      display: 'flex',
      justifyContent: 'center',
      gap: '40px',
      marginTop: '50px',
      flexWrap: 'wrap',
    },
    feature: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '16px',
      fontWeight: '500',
    },
    featureIcon: {
      fontSize: '20px',
    },
  };

  return (
    <section style={styles.ctaSection}>
      <div style={styles.backgroundPattern} />
      <div style={styles.container}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        <Link href={buttonLink} style={styles.ctaButton}>
          {buttonText}
        </Link>
        
        {variant === 'primary' && (
          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⚡</span>
              <span>Instant Approval</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🔒</span>
              <span>Bank-Level Security</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>💰</span>
              <span>No Hidden Fees</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
