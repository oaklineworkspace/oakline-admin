// components/LoanApprovalSection.js
import Link from 'next/link';

export default function LoanApprovalSection() {
  const approvalStats = [
    { number: "$2.5B+", label: "Total Loans Approved" },
    { number: "15K+", label: "Happy Borrowers" },
    { number: "24hrs", label: "Average Approval Time" },
    { number: "3.5%", label: "Starting APR" },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        {/* Main approval image */}
        <div style={styles.imageContainer}>
          <img 
            src="/images/realistic-loan-approval-banner.png"
            alt="$485,000 Home Mortgage Loan Approval Certificate"
            style={styles.approvalImage}
          />
          <div style={styles.imageOverlay}>
            <div style={styles.successBadge}>
              <span style={styles.badgeIcon}>✅</span>
              <span style={styles.badgeText}>Real Loan Approvals Daily</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.header}>
            <h2 style={styles.title}>
              Real Loan Approvals
              <span style={styles.highlight}> Every Day</span>
            </h2>
            <p style={styles.subtitle}>
              Just like Sarah Rodriguez who received her $485,000 home mortgage approval, 
              you too can achieve your financial dreams with Oakline Bank's trusted lending programs.
            </p>
          </div>

          {/* Stats */}
          <div style={styles.statsGrid}>
            {approvalStats.map((stat, index) => (
              <div key={index} style={styles.statCard}>
                <span style={styles.statNumber}>{stat.number}</span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Loan Types */}
          <div style={styles.loanTypes}>
            <h3 style={styles.loanTypesTitle}>Available Loan Programs</h3>
            <div style={styles.loanGrid}>
              <div style={styles.loanCard}>
                <div style={styles.loanIcon}>🏠</div>
                <h4 style={styles.loanCardTitle}>Home Mortgage</h4>
                <p style={styles.loanCardDesc}>Starting at 3.5% APR</p>
                <span style={styles.loanAmount}>Up to $2M</span>
              </div>
              <div style={styles.loanCard}>
                <div style={styles.loanIcon}>🚗</div>
                <h4 style={styles.loanCardTitle}>Auto Loan</h4>
                <p style={styles.loanCardDesc}>Starting at 4.2% APR</p>
                <span style={styles.loanAmount}>Up to $150K</span>
              </div>
              <div style={styles.loanCard}>
                <div style={styles.loanIcon}>👤</div>
                <h4 style={styles.loanCardTitle}>Personal Loan</h4>
                <p style={styles.loanCardDesc}>Starting at 5.9% APR</p>
                <span style={styles.loanAmount}>Up to $100K</span>
              </div>
              <div style={styles.loanCard}>
                <div style={styles.loanIcon}>🏢</div>
                <h4 style={styles.loanCardTitle}>Business Loan</h4>
                <p style={styles.loanCardDesc}>Starting at 4.5% APR</p>
                <span style={styles.loanAmount}>Up to $5M</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={styles.cta}>
            <Link href="/apply" style={styles.primaryBtn}>
              Apply for Loan
            </Link>
            <Link href="/calculator" style={styles.secondaryBtn}>
              Calculate Payment
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '100px 0',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: '60px',
    textAlign: 'center',
  },
  approvalImage: {
    width: '100%',
    maxWidth: '800px',
    height: 'auto',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  },
  imageOverlay: {
    position: 'absolute',
    top: '10px',
    left: '20px',
  },
  successBadge: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 16px rgba(5, 150, 105, 0.3)',
  },
  badgeIcon: {
    fontSize: '16px',
  },
  badgeText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  content: {
    textAlign: 'center',
  },
  header: {
    marginBottom: '60px',
  },
  title: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: '700',
    lineHeight: '1.2',
    color: '#1e293b',
    marginBottom: '20px',
  },
  highlight: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '18px',
    lineHeight: '1.6',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '30px',
    marginBottom: '60px',
  },
  statCard: {
    background: 'white',
    padding: '30px 20px',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'transform 0.3s ease',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e40af',
    lineHeight: '1',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  loanTypes: {
    marginBottom: '60px',
  },
  loanTypesTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '40px',
  },
  loanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  loanCard: {
    background: 'white',
    padding: '30px 24px',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  loanIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  loanCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  loanCardDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '12px',
  },
  loanAmount: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#059669',
  },
  cta: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.3s ease',
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#059669',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '2px solid #059669',
    transition: 'all 0.3s ease',
  },
};

// Mobile responsive
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  if (mediaQuery.matches) {
    styles.section.padding = '60px 0';
    styles.imageContainer.marginBottom = '40px';
    styles.header.marginBottom = '40px';
    styles.statsGrid.gridTemplateColumns = 'repeat(2, 1fr)';
    styles.statsGrid.gap = '20px';
    styles.loanGrid.gridTemplateColumns = '1fr';
    styles.cta.flexDirection = 'column';
    styles.cta.alignItems = 'stretch';
  }
}