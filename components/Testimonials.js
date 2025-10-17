// components/Testimonials.js
import Image from 'next/image';

export default function Testimonials() {
  const testimonials = [
    { 
      name: 'John Davidson',
      title: 'Small Business Owner',
      text: 'Oakline Bank transformed how I manage my business finances. The online banking platform is intuitive and their business loan process was incredibly smooth.',
      img: '/images/Bank_hall_business_discussion_72f98bbe.png',
      rating: 5
    },
    { 
      name: 'Samantha Rodriguez',
      title: 'Tech Professional',
      text: 'I love the mobile app and instant notifications. The no-fee checking account and excellent customer service make banking stress-free.',
      img: '/images/Mobile_banking_user_d80a1b31.png',
      rating: 5
    },
    { 
      name: 'Michael Patterson',
      title: 'Real Estate Agent',
      text: 'Great customer support and easy account setup. Their investment advisory services helped me plan for retirement. Highly recommend!',
      img: '/images/Digital_investment_dashboard_36d35f19.png',
      rating: 5
    },
  ];

  const stats = [
    { number: '500K+', label: 'Happy Customers' },
    { number: '4.9/5', label: 'Customer Rating' },
    { number: '99.9%', label: 'Uptime Guarantee' },
    { number: '24/7', label: 'Customer Support' },
  ];

  return (
    <section style={styles.testimonialsSection}>
      <div style={styles.container}>
        {/* Stats Section */}
        <div style={styles.statsSection}>
          <h2 style={styles.statsTitle}>Trusted by Thousands</h2>
          <div style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} style={styles.statCard}>
                <div style={styles.statNumber}>{stat.number}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div style={styles.testimonialsContainer}>
          <h2 style={styles.testimonialsTitle}>What Our Customers Say</h2>
          <p style={styles.testimonialsSubtitle}>
            Join thousands of satisfied customers who've made Oakline Bank their trusted financial partner
          </p>
          
          <div style={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} style={styles.testimonialCard}>
                <div style={styles.testimonialHeader}>
                  <Image 
                    src={testimonial.img} 
                    width={80} 
                    height={80} 
                    alt={testimonial.name}
                    style={styles.testimonialImage}
                  />
                  <div style={styles.testimonialInfo}>
                    <h4 style={styles.testimonialName}>{testimonial.name}</h4>
                    <p style={styles.testimonialTitle}>{testimonial.title}</p>
                    <div style={styles.testimonialRating}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} style={styles.star}>⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote style={styles.testimonialText}>
                  "{testimonial.text}"
                </blockquote>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div style={styles.trustSection}>
          <h3 style={styles.trustTitle}>Bank with Confidence</h3>
          <div style={styles.trustIndicators}>
            <div style={styles.trustItem}>
              <span style={styles.trustIcon}>🏛️</span>
              <span style={styles.trustText}>FDIC Insured</span>
            </div>
            <div style={styles.trustItem}>
              <span style={styles.trustIcon}>🔐</span>
              <span style={styles.trustText}>256-bit SSL Encryption</span>
            </div>
            <div style={styles.trustItem}>
              <span style={styles.trustIcon}>✅</span>
              <span style={styles.trustText}>SOC 2 Compliant</span>
            </div>
            <div style={styles.trustItem}>
              <span style={styles.trustIcon}>🏆</span>
              <span style={styles.trustText}>Award-Winning Service</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  testimonialsSection: {
    backgroundColor: '#f8fafc',
    padding: '100px 0',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  statsSection: {
    textAlign: 'center',
    marginBottom: '80px',
  },
  statsTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '50px',
    color: '#1e293b',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
  },
  statCard: {
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '500',
  },
  testimonialsContainer: {
    textAlign: 'center',
    marginBottom: '80px',
  },
  testimonialsTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#1e293b',
  },
  testimonialsSubtitle: {
    fontSize: '18px',
    color: '#64748b',
    marginBottom: '60px',
    maxWidth: '600px',
    margin: '0 auto 60px auto',
    lineHeight: '1.6',
  },
  testimonialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '40px',
  },
  testimonialCard: {
    backgroundColor: '#ffffff',
    padding: '35px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.3s, box-shadow 0.3s',
    position: 'relative',
  },
  testimonialHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '25px',
    gap: '20px',
  },
  testimonialImage: {
    borderRadius: '50%',
    objectFit: 'cover',
  },
  testimonialInfo: {
    textAlign: 'left',
    flex: 1,
  },
  testimonialName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    color: '#1e293b',
  },
  testimonialTitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  testimonialRating: {
    display: 'flex',
    gap: '2px',
  },
  star: {
    fontSize: '16px',
  },
  testimonialText: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: '#374151',
    fontStyle: 'italic',
    margin: 0,
    textAlign: 'left',
    position: 'relative',
  },
  trustSection: {
    backgroundColor: '#ffffff',
    padding: '50px',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
  },
  trustTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '40px',
    color: '#1e293b',
  },
  trustIndicators: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '30px',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  trustIcon: {
    fontSize: '24px',
  },
  trustText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
  },
};
