
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function UserDetails() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documentUrls, setDocumentUrls] = useState({ front: null, back: null });
  const [viewingDocument, setViewingDocument] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!userId && !searchEmail) {
      setError('Please enter a User ID or Email');
      return;
    }

    setLoading(true);
    setError('');
    setUserData(null);

    try {
      let userIdToFetch = userId;

      // If searching by email, find the user ID first
      if (searchEmail && !userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', searchEmail)
          .single();

        if (!profile) {
          throw new Error('No user found with that email');
        }
        userIdToFetch = profile.id;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Fetch comprehensive user data
      const response = await fetch(`/api/admin/get-user-full-details?userId=${userIdToFetch}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch user data');
      }

      setUserData(result.user);

      // Fetch documents
      const { data: docs } = await supabase
        .from('user_id_documents')
        .select('*')
        .eq('user_id', userIdToFetch)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docs) {
        setDocumentUrls({
          front: docs.front_url,
          back: docs.back_url,
          type: docs.document_type,
          status: docs.status
        });
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>👤 Comprehensive User Details</h1>
            <p style={styles.subtitle}>View complete user information, documents, accounts, and balances</p>
          </div>
        </div>

        <div style={styles.searchCard}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <div style={styles.searchInputs}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={styles.input}
                  placeholder="Enter User ID (UUID)"
                />
              </div>
              <div style={styles.orDivider}>OR</div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  style={styles.input}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <button type="submit" style={styles.searchButton} disabled={loading}>
              {loading ? '⏳ Searching...' : '🔍 Search User'}
            </button>
          </form>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading && (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading user details...</p>
          </div>
        )}

        {userData && !loading && (
          <div style={styles.content}>
            {/* Personal Information */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>👤 Personal Information</h2>
              <div style={styles.grid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Full Name:</span>
                  <span style={styles.infoValue}>
                    {userData.profile?.first_name} {userData.profile?.middle_name} {userData.profile?.last_name}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email:</span>
                  <span style={styles.infoValue}>{userData.email}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Phone:</span>
                  <span style={styles.infoValue}>{userData.profile?.phone || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Date of Birth:</span>
                  <span style={styles.infoValue}>
                    {userData.profile?.date_of_birth ? new Date(userData.profile.date_of_birth).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>SSN:</span>
                  <span style={styles.infoValue}>
                    {userData.profile?.ssn ? `***-**-${userData.profile.ssn.slice(-4)}` : 'N/A'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Address:</span>
                  <span style={styles.infoValue}>
                    {userData.profile?.address}, {userData.profile?.city}, {userData.profile?.state} {userData.profile?.zip_code}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Country:</span>
                  <span style={styles.infoValue}>{userData.profile?.country || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Employment:</span>
                  <span style={styles.infoValue}>{userData.profile?.employment_status || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Annual Income:</span>
                  <span style={styles.infoValue}>{userData.profile?.annual_income || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* ID Documents */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📄 ID Documents</h2>
              {documentUrls.front || documentUrls.back ? (
                <div>
                  <div style={styles.documentInfo}>
                    <p><strong>Document Type:</strong> {documentUrls.type}</p>
                    <p><strong>Status:</strong> <span style={{
                      color: documentUrls.status === 'verified' ? '#10b981' : 
                             documentUrls.status === 'rejected' ? '#ef4444' : '#f59e0b'
                    }}>{documentUrls.status?.toUpperCase()}</span></p>
                  </div>
                  <div style={styles.documentsGrid}>
                    {documentUrls.front && (
                      <div style={styles.documentCard}>
                        <h4 style={styles.documentLabel}>Front Side</h4>
                        <img 
                          src={documentUrls.front} 
                          alt="ID Front" 
                          style={styles.documentThumbnail}
                          onClick={() => setViewingDocument(documentUrls.front)}
                        />
                        <a href={documentUrls.front} target="_blank" rel="noopener noreferrer" style={styles.downloadLink}>
                          📥 Download
                        </a>
                      </div>
                    )}
                    {documentUrls.back && (
                      <div style={styles.documentCard}>
                        <h4 style={styles.documentLabel}>Back Side</h4>
                        <img 
                          src={documentUrls.back} 
                          alt="ID Back" 
                          style={styles.documentThumbnail}
                          onClick={() => setViewingDocument(documentUrls.back)}
                        />
                        <a href={documentUrls.back} target="_blank" rel="noopener noreferrer" style={styles.downloadLink}>
                          📥 Download
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p style={styles.noData}>No documents uploaded</p>
              )}
            </div>

            {/* Accounts */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🏦 Bank Accounts ({userData.accounts?.length || 0})</h2>
              {userData.accounts && userData.accounts.length > 0 ? (
                <div style={styles.accountsGrid}>
                  {userData.accounts.map((account) => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountHeader}>
                        <h3 style={styles.accountType}>
                          {account.account_type.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: 
                            account.status === 'active' ? '#10b981' :
                            account.status === 'pending_funding' ? '#f59e0b' :
                            account.status === 'pending_application' ? '#3b82f6' :
                            '#6b7280'
                        }}>
                          {account.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={styles.accountDetails}>
                        <p><strong>Account Number:</strong> {account.account_number}</p>
                        <p><strong>Routing Number:</strong> {account.routing_number}</p>
                        <p style={styles.balance}>
                          <strong>Balance:</strong> ${parseFloat(account.balance || 0).toFixed(2)}
                        </p>
                        {account.min_deposit > 0 && (
                          <p><strong>Min. Deposit Required:</strong> ${parseFloat(account.min_deposit).toFixed(2)}</p>
                        )}
                        <p style={styles.createdDate}>
                          Created: {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noData}>No accounts found</p>
              )}
            </div>

            {/* Cards */}
            {userData.cards && userData.cards.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>💳 Cards ({userData.cards.length})</h2>
                <div style={styles.cardsGrid}>
                  {userData.cards.map((card) => (
                    <div key={card.id} style={styles.cardItem}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardBrand}>{card.card_brand?.toUpperCase()}</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: card.status === 'active' ? '#10b981' : '#6b7280'
                        }}>
                          {card.status}
                        </span>
                      </div>
                      <p style={styles.cardNumber}>**** **** **** {card.card_number.slice(-4)}</p>
                      <p><strong>Type:</strong> {card.card_category}</p>
                      <p><strong>Expires:</strong> {new Date(card.expiry_date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loans */}
            {userData.loans && userData.loans.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>💰 Loans ({userData.loans.length})</h2>
                <div style={styles.loansGrid}>
                  {userData.loans.map((loan) => (
                    <div key={loan.id} style={styles.loanCard}>
                      <h3 style={styles.loanType}>{loan.loan_type}</h3>
                      <p><strong>Principal:</strong> ${parseFloat(loan.principal).toFixed(2)}</p>
                      <p><strong>Remaining Balance:</strong> ${parseFloat(loan.remaining_balance || 0).toFixed(2)}</p>
                      <p><strong>Interest Rate:</strong> {loan.interest_rate}%</p>
                      <p><strong>Term:</strong> {loan.term_months} months</p>
                      <p><strong>Status:</strong> <span style={{
                        color: loan.status === 'active' ? '#10b981' : '#f59e0b'
                      }}>{loan.status.toUpperCase()}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewingDocument && (
          <div style={styles.imageModalOverlay} onClick={() => setViewingDocument(null)}>
            <div style={styles.imageModal} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setViewingDocument(null)} style={styles.closeImageButton}>✕</button>
              <img src={viewingDocument} alt="Document" style={styles.fullImage} />
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  backButton: {
    display: 'inline-block',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: '500'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
  },
  searchCard: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  searchForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  searchInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '20px',
    alignItems: 'end'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  orDivider: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
    paddingBottom: '10px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3c72'
  },
  input: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  searchButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  section: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3.5vw, 20px)',
    fontWeight: '700',
    color: '#1e3c72',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e2e8f0'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500'
  },
  documentInfo: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  documentCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center'
  },
  documentLabel: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px'
  },
  documentThumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0'
  },
  downloadLink: {
    display: 'inline-block',
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  accountCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  accountType: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e3c72',
    margin: 0
  },
  statusBadge: {
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700'
  },
  accountDetails: {
    fontSize: '14px',
    lineHeight: '1.8'
  },
  balance: {
    fontSize: '18px',
    color: '#059669',
    fontWeight: '700'
  },
  createdDate: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  cardItem: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)'
  },
  cardBrand: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#667eea'
  },
  cardNumber: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '12px 0'
  },
  loansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  loanCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px'
  },
  loanType: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e3c72',
    marginBottom: '12px'
  },
  noData: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
    fontStyle: 'italic'
  },
  imageModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  imageModal: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh'
  },
  closeImageButton: {
    position: 'absolute',
    top: '-40px',
    right: '0',
    background: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#1e3c72'
  },
  fullImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: '8px'
  }
};
