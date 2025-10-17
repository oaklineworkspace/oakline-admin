// components/HeroSection.js
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section style={styles.hero}>
      <div style={styles.overlay} />
      <div style={styles.content}>
        <div style={styles.textContent}>
          <h1 style={styles.title}>
            Modern Banking
            <span style={styles.highlight}> Simplified</span>
          </h1>
          <p style={styles.subtitle}>
            Experience the future of banking with our innovative digital platform. 
            Secure, convenient, and designed for your financial success.
          </p>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statNumber}>500K+</span>
              <span style={styles.statLabel}>Happy Customers</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNumber}>$2.5B+</span>
              <span style={styles.statLabel}>Loans Approved</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNumber}>4.9/5</span>
              <span style={styles.statLabel}>Customer Rating</span>
            </div>
          </div>
          <div style={styles.cta}>
            <Link href="/enroll" style={styles.primaryBtn}>
              Enroll Now
            </Link>
            <Link href="/sign-in" style={styles.secondaryBtn}>
              Sign In
            </Link>
          </div>
        </div>
        <div style={styles.imageContainer}>
          {/* This will use the generated image */}
          <img 
            src="/images/bank-discussion.png"
            alt="Professional banking discussion"
            style={styles.heroImage}
          />
          <div style={styles.imageOverlay}>
            <div style={styles.badge}>
              <span style={styles.badgeIcon}>🏆</span>
              <span style={styles.badgeText}>Award-Winning Service</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  hero: {
    position: 'relative',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '100px 0',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23e2e8f0" fill-opacity="0.4"%3E%3Ccircle cx="30" cy="30" r="1.5"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    opacity: 0.5,
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  textContent: {
    order: 1,
  },
  title: {
    fontSize: 'clamp(32px, 5vw, 56px)',
    fontWeight: '700',
    lineHeight: '1.2',
    color: 'var(--primary-text)',
    marginBottom: '24px',
  },
  highlight: {
    background: 'linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '20px',
    lineHeight: '1.6',
    color: 'var(--secondary-text)',
    marginBottom: '40px',
    maxWidth: '500px',
  },
  stats: {
    display: 'flex',
    gap: '32px',
    marginBottom: '40px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--primary-navy)',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--secondary-text)',
    fontWeight: '500',
  },
  cta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%)',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(30, 64, 175, 0.3)',
    transition: 'all 0.3s ease',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'var(--primary-navy)',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '2px solid var(--primary-navy)',
    transition: 'all 0.3s ease',
  },
  imageContainer: {
    position: 'relative',
    order: 2,
  },
  heroImage: {
    width: '100%',
    height: 'auto',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    maxHeight: '500px',
    objectFit: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
  },
  badge: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdrop: 'blur(10px)',
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  badgeIcon: {
    fontSize: '20px',
  },
  badgeText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
};

// Mobile responsive
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 768px)');

  if (mediaQuery.matches) {
    styles.content.gridTemplateColumns = '1fr';
    styles.content.gap = '40px';
    styles.textContent.order = 2;
    styles.imageContainer.order = 1;
    styles.hero.padding = '60px 0';
    styles.stats.flexDirection = 'column';
    styles.stats.gap = '16px';
    styles.cta.flexDirection = 'column';
    styles.cta.alignItems = 'stretch';
    styles.heroImage.maxHeight = '300px';
    styles.heroImage.minHeight = '250px';
    styles.heroImage.objectPosition = 'center';
  }
}