// components/TestimonialsSection.js
export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      image: '/images/testimonial-1.jpeg',
      rating: 5,
      text: 'Oakline Bank has transformed how I manage my business finances. The mobile banking app is incredibly intuitive, and their customer service is exceptional. I can track expenses, make payments, and manage cash flow all in one place.',
      company: 'Johnson Marketing Agency'
    },
    {
      name: 'Michael Chen',
      role: 'Real Estate Investor',
      image: '/images/testimonial-2.jpeg',
      rating: 5,
      text: 'The mortgage process was seamless and fast. Their loan officers provided excellent guidance throughout, and I got a competitive rate that saved me thousands. Highly recommend for anyone looking to invest in real estate.',
      company: 'Chen Properties'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Tech Entrepreneur',
      image: '/images/testimonial-3.jpeg',
      rating: 5,
      text: 'As someone who travels frequently, having 24/7 access to my accounts and instant international transfers is crucial. Oakline Bank\'s global banking features and security measures give me complete peace of mind.',
      company: 'TechFlow Solutions'
    }
  ];

  const stats = [
    { number: '500K+', label: 'Happy Customers' },
    { number: '98%', label: 'Satisfaction Rate' },
    { number: '$2.5B+', label: 'Loans Approved' },
    { number: '4.9/5', label: 'App Store Rating' }
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>What Our Customers Say</h2>
          <p style={styles.subtitle}>
            Don't just take our word for it. Here's what our valued customers have to say about their Oakline Bank experience.
          </p>
        </div>
        
        <div style={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} style={styles.testimonialCard}>
              <div style={styles.rating}>
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} style={styles.star}>★</span>
                ))}
              </div>
              <p style={styles.testimonialText}>"{testimonial.text}"</p>
              <div style={styles.customer}>
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  style={styles.customerImage}
                />
                <div style={styles.customerInfo}>
                  <h4 style={styles.customerName}>{testimonial.name}</h4>
                  <p style={styles.customerRole}>{testimonial.role}</p>
                  <p style={styles.customerCompany}>{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={styles.statsSection}>
          <h3 style={styles.statsTitle}>Trusted by Thousands</h3>
          <div style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} style={styles.statItem}>
                <span style={styles.statNumber}>{stat.number}</span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
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
  testimonialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '32px',
    marginBottom: '80px',
  },
  testimonialCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
  },
  rating: {
    marginBottom: '20px',
  },
  star: {
    color: '#fbbf24',
    fontSize: '20px',
    marginRight: '4px',
  },
  testimonialText: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.7',
    marginBottom: '24px',
    fontStyle: 'italic',
  },
  customer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  customerImage: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #e2e8f0',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  customerRole: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '600',
    margin: '0 0 2px 0',
  },
  customerCompany: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  statsSection: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '24px',
    padding: '60px 40px',
    color: 'white',
  },
  statsTitle: {
    fontSize: 'clamp(24px, 3vw, 32px)',
    fontWeight: '700',
    marginBottom: '40px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '32px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: '700',
    marginBottom: '8px',
    display: 'block',
  },
  statLabel: {
    fontSize: '16px',
    opacity: 0.9,
    fontWeight: '500',
  },
};

// Mobile responsive
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  if (mediaQuery.matches) {
    styles.testimonialsGrid.gridTemplateColumns = '1fr';
    styles.testimonialsGrid.gap = '24px';
    styles.testimonialCard.padding = '24px';
    styles.section.padding = '60px 0';
    styles.statsSection.padding = '40px 20px';
    styles.statsGrid.gridTemplateColumns = 'repeat(2, 1fr)';
    styles.statsGrid.gap = '24px';
  }
}
