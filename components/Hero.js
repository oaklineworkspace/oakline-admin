// components/Hero.js
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const heroSlides = [
    {
      image: '/images/hero-mobile-transactions.jpg.PNG',
      title: 'Banking Made Simple',
      subtitle: 'Experience the future of banking with our mobile-first platform',
      cta: 'Enroll Today',
      link: '/enroll'
    },
    {
      image: '/images/hero-debit-card-1.jpg.PNG',
      title: 'Premium Debit Cards',
      subtitle: 'Secure, convenient, and rewarding payment solutions',
      cta: 'Get Your Card',
      link: '/enroll'
    },
    {
      image: '/images/hero-pos.jpg.PNG',
      title: 'Business Solutions',
      subtitle: 'Comprehensive banking services for growing businesses',
      cta: 'Enroll Now',
      link: '/enroll'
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <section style={styles.hero}>
      {/* Main Hero Slider */}
      <div style={styles.heroSlider}>
        <div style={styles.slideContainer}>
          <Image 
            src={heroSlides[currentSlide].image}
            alt={heroSlides[currentSlide].title}
            fill
            style={styles.heroImage}
            priority
          />
          <div style={styles.overlay} />
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>{heroSlides[currentSlide].title}</h1>
            <p style={styles.heroSubtitle}>{heroSlides[currentSlide].subtitle}</p>
            <div style={styles.heroCTAs}>
              <Link href={heroSlides[currentSlide].link} style={styles.primaryCTA}>
                {heroSlides[currentSlide].cta}
              </Link>
              <Link href="/sign-in" style={styles.secondaryCTA}>
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div style={styles.indicators}>
          {heroSlides.map((_, index) => (
            <button
              key={index}
              style={{
                ...styles.indicator,
                backgroundColor: index === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.5)'
              }}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div style={styles.featuresSection}>
        <div style={styles.container}>
          <h2 style={styles.featuresTitle}>Why Choose Oakline Bank?</h2>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🏦</div>
              <h3 style={styles.featureTitle}>Instant Account Opening</h3>
              <p style={styles.featureDescription}>
                Open your account in minutes with our streamlined digital process
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📱</div>
              <h3 style={styles.featureTitle}>Mobile Banking</h3>
              <p style={styles.featureDescription}>
                Bank anywhere, anytime with our award-winning mobile app
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>Bank-Level Security</h3>
              <p style={styles.featureDescription}>
                Your money and data are protected with industry-leading security
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💳</div>
              <h3 style={styles.featureTitle}>No Monthly Fees</h3>
              <p style={styles.featureDescription}>
                Enjoy free checking with no minimum balance requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Showcase */}
      <div style={styles.productShowcase}>
        <div style={styles.container}>
          <div style={styles.showcaseGrid}>
            <div style={styles.showcaseContent}>
              <h2 style={styles.showcaseTitle}>Banking Products Designed for You</h2>
              <p style={styles.showcaseDescription}>
                From everyday checking to investment portfolios, we have the financial products to help you achieve your goals.
              </p>
              <div style={styles.productList}>
                <div style={styles.productItem}>
                  <span style={styles.productIcon}>✓</span>
                  <span>Checking & Savings Accounts</span>
                </div>
                <div style={styles.productItem}>
                  <span style={styles.productIcon}>✓</span>
                  <span>Home & Auto Loans</span>
                </div>
                <div style={styles.productItem}>
                  <span style={styles.productIcon}>✓</span>
                  <span>Investment & Retirement Planning</span>
                </div>
                <div style={styles.productItem}>
                  <span style={styles.productIcon}>✓</span>
                  <span>Business Banking Solutions</span>
                </div>
              </div>
              <Link href="/apply" style={styles.showcaseCTA}>
                Explore All Products
              </Link>
            </div>
            <div style={styles.showcaseImages}>
              <div style={styles.imageStack}>
                <Image 
                  src="/images/hero-debit-card-2.jpg.PNG"
                  alt="Banking Products"
                  width={280}
                  height={180}
                  style={styles.stackImage1}
                />
                <Image 
                  src="/images/hero-development-fund.jpg.PNG"
                  alt="Investment Solutions"
                  width={280}
                  height={180}
                  style={styles.stackImage2}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  hero: {
    width: '100%',
  },
  heroSlider: {
    position: 'relative',
    height: '400px',
    overflow: 'hidden',
  },
  slideContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  heroImage: {
    objectFit: 'cover',
    objectPosition: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.8), rgba(59, 130, 246, 0.6))',
    zIndex: 1,
  },
  heroContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#ffffff',
    zIndex: 2,
    maxWidth: '800px',
    padding: '0 20px',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: '1.2',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  heroSubtitle: {
    fontSize: '18px',
    marginBottom: '30px',
    opacity: 0.95,
    lineHeight: '1.6',
  },
  heroCTAs: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryCTA: {
    backgroundColor: '#059669',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(5, 150, 105, 0.3)',
  },
  secondaryCTA: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #ffffff',
    transition: 'all 0.3s',
  },
  indicators: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    zIndex: 3,
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  featuresSection: {
    backgroundColor: '#f8fafc',
    padding: '80px 0',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  featuresTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '60px',
    color: '#1e293b',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '40px',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: '40px 30px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.3s, box-shadow 0.3s',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1e293b',
  },
  featureDescription: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6',
  },
  productShowcase: {
    backgroundColor: '#ffffff',
    padding: '80px 0',
  },
  showcaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '60px',
    alignItems: 'center',
  },
  showcaseContent: {
    padding: '0 20px',
  },
  showcaseTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#1e293b',
    lineHeight: '1.3',
  },
  showcaseDescription: {
    fontSize: '18px',
    color: '#64748b',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  productList: {
    marginBottom: '40px',
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '16px',
    color: '#374151',
  },
  productIcon: {
    backgroundColor: '#059669',
    color: '#ffffff',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  showcaseCTA: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '16px',
    display: 'inline-block',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(30, 58, 138, 0.3)',
  },
  showcaseImages: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px',
  },
  imageStack: {
    position: 'relative',
    width: '320px',
    height: '240px',
  },
  stackImage1: {
    position: 'absolute',
    top: '0',
    right: '0',
    borderRadius: '16px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    zIndex: 2,
  },
  stackImage2: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    borderRadius: '16px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    zIndex: 1,
  },
};
