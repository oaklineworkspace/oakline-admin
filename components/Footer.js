import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      {/* Pre-footer with quick actions */}
      <div style={styles.preFooter}>
        <div style={styles.container}>
          <div style={styles.quickActions}>
            <div style={styles.quickActionCard}>
              <div style={styles.quickActionIcon}>📱</div>
              <h4 style={styles.quickActionTitle}>Mobile Banking</h4>
              <p style={styles.quickActionDesc}>Bank on the go with our secure mobile app</p>
              <Link href="/apply" style={styles.quickActionBtn}>Download App</Link>
            </div>
            <div style={styles.quickActionCard}>
              <div style={styles.quickActionIcon}>💬</div>
              <h4 style={styles.quickActionTitle}>24/7 Support</h4>
              <p style={styles.quickActionDesc}>Get help whenever you need it</p>
              <Link href="/support" style={styles.quickActionBtn}>Contact Us</Link>
            </div>
            <div style={styles.quickActionCard}>
              <div style={styles.quickActionIcon}>🔒</div>
              <h4 style={styles.quickActionTitle}>Security Center</h4>
              <p style={styles.quickActionDesc}>Keep your accounts safe and secure</p>
              <Link href="/security" style={styles.quickActionBtn}>Learn More</Link>
            </div>
            <div style={styles.quickActionCard}>
              <div style={styles.quickActionIcon}>🏦</div>
              <h4 style={styles.quickActionTitle}>Find Branches</h4>
              <p style={styles.quickActionDesc}>Locate ATMs and branches near you</p>
              <Link href="/locations" style={styles.quickActionBtn}>Find Locations</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Banking Information Bar */}
      <div style={styles.bankingInfoBar}>
        <div style={styles.container}>
          <div style={styles.bankingInfo}>
            <div style={styles.bankingInfoItem}>
              <span style={styles.infoIcon}>🏦</span>
              <div>
                <span style={styles.infoLabel}>Routing Number</span>
                <span style={styles.infoValue}>075915826</span>
              </div>
            </div>
            <div style={styles.bankingInfoItem}>
              <span style={styles.infoIcon}>🌐</span>
              <div>
                <span style={styles.infoLabel}>SWIFT Code</span>
                <span style={styles.infoValue}>OAKLUS33</span>
              </div>
            </div>
            <div style={styles.bankingInfoItem}>
              <span style={styles.infoIcon}>🏛️</span>
              <div>
                <span style={styles.infoLabel}>FDIC Insured</span>
                <span style={styles.infoValue}>Up to $250,000</span>
              </div>
            </div>
            <div style={styles.bankingInfoItem}>
              <span style={styles.infoIcon}>⚖️</span>
              <div>
                <span style={styles.infoLabel}>Equal Housing Lender</span>
                <span style={styles.infoValue}>NMLS ID: 234567</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div style={styles.container}>
        <div style={styles.footerGrid}>
          {/* Company Info */}
          <div style={styles.companySection}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank Logo" style={styles.logo} />
              <span style={styles.companyName}>Oakline Bank</span>
            </Link>
            <p style={styles.companyDescription}>
              Your trusted partner for modern banking solutions. Experience secure, convenient, and innovative financial services designed for your success. Since 1995, we've been serving over 500,000 customers with excellence.
            </p>
            <div style={styles.socialMedia}>
              <a href="https://facebook.com/oaklinebank" style={styles.socialLink} target="_blank" rel="noopener noreferrer">
                <span style={styles.socialIcon}>📘</span>
              </a>
              <a href="https://twitter.com/oaklinebank" style={styles.socialLink} target="_blank" rel="noopener noreferrer">
                <span style={styles.socialIcon}>🐦</span>
              </a>
              <a href="https://linkedin.com/company/oaklinebank" style={styles.socialLink} target="_blank" rel="noopener noreferrer">
                <span style={styles.socialIcon}>💼</span>
              </a>
              <a href="https://instagram.com/oaklinebank" style={styles.socialLink} target="_blank" rel="noopener noreferrer">
                <span style={styles.socialIcon}>📸</span>
              </a>
              <a href="https://youtube.com/oaklinebank" style={styles.socialLink} target="_blank" rel="noopener noreferrer">
                <span style={styles.socialIcon}>📺</span>
              </a>
            </div>
            <div style={styles.awards}>
              <div style={styles.award}>🏆 Best Digital Bank 2024</div>
              <div style={styles.award}>⭐ 5-Star Customer Service</div>
              <div style={styles.award}>🛡️ Top Security Rating</div>
              <div style={styles.award}>🌟 Most Innovative Bank</div>
            </div>
          </div>

          {/* Personal Banking */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Personal Banking</h4>
            <ul style={styles.linkList}>
              <li><Link href="/apply" style={styles.footerLink}>Checking Accounts</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Savings Accounts</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Money Market</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Certificates of Deposit</Link></li>
              <li><Link href="/cards" style={styles.footerLink}>Debit & Credit Cards</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Personal Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Auto Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Home Mortgages</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Student Accounts</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Senior Banking</Link></li>
            </ul>
          </div>

          {/* Business Banking */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Business Banking</h4>
            <ul style={styles.linkList}>
              <li><Link href="/apply" style={styles.footerLink}>Business Checking</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Business Savings</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Business Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Commercial Real Estate</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Equipment Financing</Link></li>
              <li><Link href="/bill-pay" style={styles.footerLink}>Merchant Services</Link></li>
              <li><Link href="/transfer" style={styles.footerLink}>Treasury Management</Link></li>
              <li><Link href="/cards" style={styles.footerLink}>Business Cards</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>SBA Loans</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>Corporate Banking</Link></li>
            </ul>
          </div>

          {/* Investment & Wealth */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Investment & Wealth</h4>
            <ul style={styles.linkList}>
              <li><Link href="/investments" style={styles.footerLink}>Investment Portfolio</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Retirement Planning</Link></li>
              <li><Link href="/crypto" style={styles.footerLink}>Cryptocurrency</Link></li>
              <li><Link href="/financial-advisory" style={styles.footerLink}>Financial Advisory</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Mutual Funds</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Stock Trading</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Bonds & ETFs</Link></li>
              <li><Link href="/apply" style={styles.footerLink}>IRA Accounts</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Private Banking</Link></li>
              <li><Link href="/investments" style={styles.footerLink}>Wealth Management</Link></li>
            </ul>
          </div>

          {/* Digital Services */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Digital Banking</h4>
            <ul style={styles.linkList}>
              <li><Link href="/sign-in" style={styles.footerLink}>Online Banking</Link></li>
              <li><Link href="/transfer" style={styles.footerLink}>Wire Transfers</Link></li>
              <li><Link href="/bill-pay" style={styles.footerLink}>Bill Pay Service</Link></li>
              <li><Link href="/cards" style={styles.footerLink}>Card Management</Link></li>
              <li><Link href="/notifications" style={styles.footerLink}>Account Alerts</Link></li>
              <li><Link href="/security" style={styles.footerLink}>Security Settings</Link></li>
              <li><Link href="/mfa-setup" style={styles.footerLink}>Two-Factor Auth</Link></li>
              <li><Link href="/profile" style={styles.footerLink}>Profile Settings</Link></li>
              <li><Link href="/deposit-real" style={styles.footerLink}>Mobile Deposit</Link></li>
              <li><Link href="/transfer" style={styles.footerLink}>Zelle Payments</Link></li>
            </ul>
          </div>

          {/* Loans & Credit */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Loans & Credit</h4>
            <ul style={styles.linkList}>
              <li><Link href="/loans" style={styles.footerLink}>Personal Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Auto Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Home Mortgages</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Refinancing</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Business Loans</Link></li>
              <li><Link href="/cards" style={styles.footerLink}>Credit Cards</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Home Equity</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Student Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Construction Loans</Link></li>
              <li><Link href="/loans" style={styles.footerLink}>Agricultural Loans</Link></li>
            </ul>
          </div>

          {/* Support & Resources */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Support & Resources</h4>
            <ul style={styles.linkList}>
              <li><Link href="/support" style={styles.footerLink}>Customer Support</Link></li>
              <li><Link href="/faq" style={styles.footerLink}>FAQ</Link></li>
              <li><Link href="/market-news" style={styles.footerLink}>Market News</Link></li>
              <li><Link href="/financial-education" style={styles.footerLink}>Financial Education</Link></li>
              <li><Link href="/calculators" style={styles.footerLink}>Financial Calculators</Link></li>
              <li><Link href="/forms" style={styles.footerLink}>Forms & Documents</Link></li>
              <li><Link href="/rates" style={styles.footerLink}>Current Rates</Link></li>
              <li><Link href="/locations" style={styles.footerLink}>Branch Locator</Link></li>
              <li><Link href="/rewards" style={styles.footerLink}>Rewards Program</Link></li>
              <li><Link href="/account-types" style={styles.footerLink}>Account Types</Link></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Contact & Legal</h4>
            <div style={styles.contactInfo}>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📞</span>
                <div>
                  <p style={styles.contactLabel}>Phone/Text</p>
                  <p style={styles.contactValue}>+1 (636) 635-6122</p>
                </div>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>✉️</span>
                <div>
                  <p style={styles.contactLabel}>Email Support</p>
                  <p style={styles.contactValue}>info@theoaklinebank.com</p>
                </div>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>🕒</span>
                <div>
                  <p style={styles.contactLabel}>Branch Hours</p>
                  <p style={styles.contactValue}>Mon-Fri: 9 AM - 5 PM</p>
                </div>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📍</span>
                <div>
                  <p style={styles.contactLabel}>Oklahoma City Branch</p>
                  <p style={styles.contactValue}>12201 N. May Avenue<br/>Oklahoma City, OK 73120</p>
                </div>
              </div>
            </div>
            <div style={styles.legalLinks}>
              <Link href="/privacy" style={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" style={styles.footerLink}>Terms of Service</Link>
              <Link href="/compliance" style={styles.footerLink}>Compliance</Link>
              <Link href="/disclosures" style={styles.footerLink}>Disclosures</Link>
              <Link href="/accessibility" style={styles.footerLink}>Accessibility</Link>
              <Link href="/sitemap" style={styles.footerLink}>Sitemap</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Signup */}
      <div style={styles.newsletter}>
        <div style={styles.container}>
          <div style={styles.newsletterContent}>
            <div style={styles.newsletterText}>
              <h3 style={styles.newsletterTitle}>Stay Updated with Oakline Bank</h3>
              <p style={styles.newsletterDesc}>Get the latest financial news, tips, exclusive offers, and market insights delivered to your inbox.</p>
            </div>
            <div style={styles.newsletterForm}>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                style={styles.newsletterInput}
              />
              <button style={styles.newsletterBtn}>Subscribe</button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer Bottom */}
      <div style={styles.footerBottom}>
        <div style={styles.container}>
          <div style={styles.bottomContent}>
            <div style={styles.copyrightSection}>
              <p style={styles.copyright}>
                © {new Date().getFullYear()} Oakline Bank. All rights reserved.
              </p>
              <div style={styles.certifications}>
                <span style={styles.certification}>🏛️ FDIC Insured</span>
                <span style={styles.certification}>🔒 SSL Secured</span>
                <span style={styles.certification}>✅ SOC 2 Compliant</span>
                <span style={styles.certification}>⚖️ Equal Housing Lender</span>
              </div>
            </div>
            <div style={styles.bankingDetails}>
              <div style={styles.bankingDetailItem}>
                <span style={styles.detailLabel}>Routing Number:</span>
                <span style={styles.detailValue}>075915826</span>
              </div>
              <div style={styles.bankingDetailItem}>
                <span style={styles.detailLabel}>SWIFT Code:</span>
                <span style={styles.detailValue}>OAKLUS33</span>
              </div>
              <div style={styles.bankingDetailItem}>
                <span style={styles.detailLabel}>NMLS ID:</span>
                <span style={styles.detailValue}>234567</span>
              </div>
            </div>
          </div>

          <div style={styles.legalNotice}>
            <p style={styles.legalText}>
              <strong>Banking Information:</strong> Oakline Bank is a full-service digital bank offering checking, savings, loans, and investment services. 
              Member FDIC. All deposit accounts are FDIC-insured up to $250,000 per depositor, per insured bank, for each account ownership category.
            </p>
            <div style={styles.additionalInfo}>
              <p style={styles.legalText}>
                <strong>Investment Disclaimer:</strong> Investment products are not FDIC insured, may lose value, and are not bank guaranteed. 
                Cryptocurrency trading involves substantial risk of loss and may not be suitable for all investors.
              </p>
              <p style={styles.legalText}>
                <strong>Regulatory Information:</strong> Securities and investment advisory services offered through Oakline Securities, LLC, 
                member FINRA/SIPC. Insurance products offered through Oakline Insurance Agency. Equal Housing Lender.
              </p>
              <p style={styles.legalText}>
                <strong>Important Notice:</strong> Oakline Bank products and services are available to U.S. residents only. 
                Credit approval required for loan products. Terms and conditions apply to all accounts and services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  preFooter: {
    backgroundColor: '#2d3748',
    padding: '80px 0',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '30px',
  },
  quickActionCard: {
    backgroundColor: '#ffffff',
    padding: '40px 30px',
    borderRadius: '20px',
    textAlign: 'center',
    color: '#1e293b',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    border: '2px solid transparent'
  },
  quickActionIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
  },
  quickActionTitle: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#1e3a8a',
  },
  quickActionDesc: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '25px',
    lineHeight: '1.6',
  },
  quickActionBtn: {
    backgroundColor: '#059669',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.95rem',
    display: 'inline-block',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },

  // Banking Information Bar
  bankingInfoBar: {
    backgroundColor: '#0f172a',
    padding: '30px 0',
    borderTop: '1px solid #334155',
    borderBottom: '1px solid #334155'
  },
  bankingInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    alignItems: 'center'
  },
  bankingInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  infoIcon: {
    fontSize: '1.8rem',
    color: '#60a5fa'
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '500'
  },
  infoValue: {
    display: 'block',
    fontSize: '1rem',
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'monospace'
  },

  footerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '60px',
    padding: '100px 0 60px 0',
  },
  companySection: {
    gridColumn: '1 / 2',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    marginBottom: '25px',
    gap: '15px',
  },
  logo: {
    height: '55px',
    width: 'auto',
  },
  companyName: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: '-0.02em'
  },
  companyDescription: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: '#cbd5e1',
    marginBottom: '35px',
  },
  socialMedia: {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
  },
  socialLink: {
    textDecoration: 'none',
    transition: 'transform 0.3s ease',
    display: 'inline-block',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  socialIcon: {
    fontSize: '28px',
    display: 'block',
  },
  awards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  award: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '600',
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  footerSection: {},
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#ffffff',
    letterSpacing: '-0.01em'
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  footerLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '15px',
    lineHeight: '2.4',
    transition: 'all 0.2s ease',
    display: 'block',
    padding: '2px 0'
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    marginBottom: '30px',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  contactIcon: {
    fontSize: '22px',
    marginTop: '2px',
    color: '#60a5fa'
  },
  contactLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 5px 0',
    fontWeight: '500'
  },
  contactValue: {
    fontSize: '15px',
    color: '#ffffff',
    margin: 0,
    fontWeight: '600',
  },
  legalLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  newsletter: {
    backgroundColor: '#0f172a',
    padding: '60px 0',
    borderTop: '1px solid #334155'
  },
  newsletterContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '50px',
    alignItems: 'center',
  },
  newsletterText: {},
  newsletterTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '15px',
    letterSpacing: '-0.01em'
  },
  newsletterDesc: {
    fontSize: '16px',
    color: '#94a3b8',
    lineHeight: '1.6',
  },
  newsletterForm: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  newsletterInput: {
    flex: 1,
    minWidth: '250px',
    padding: '18px 20px',
    borderRadius: '12px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  newsletterBtn: {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '18px 35px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  footerBottom: {
    borderTop: '1px solid #334155',
    backgroundColor: '#0f172a',
  },
  bottomContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '40px 0 30px 0',
    flexWrap: 'wrap',
    gap: '30px',
  },
  copyrightSection: {
    flex: 1
  },
  copyright: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 15px 0',
  },
  certifications: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  certification: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '600',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  bankingDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '200px'
  },
  bankingDetailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '12px',
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  legalNotice: {
    paddingBottom: '40px',
  },
  legalText: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 12px 0',
    textAlign: 'left',
  },
  additionalInfo: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #334155',
  },
};

// Add hover effects
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .quickActionCard:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      border-color: #3b82f6;
    }

    .quickActionBtn:hover {
      background-color: #047857;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(5, 150, 105, 0.4);
    }

    .socialLink:hover {
      transform: scale(1.1);
      background-color: rgba(255,255,255,0.2);
    }

    .footerLink:hover {
      color: #60a5fa;
      padding-left: 8px;
    }

    .newsletterInput:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .newsletterBtn:hover {
      background-color: #047857;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(5, 150, 105, 0.4);
    }

    .bankingInfoItem:hover {
      background-color: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.2);
    }

    .contactItem:hover {
      background-color: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.2);
    }
  `;
  document.head.appendChild(styleSheet);
}
