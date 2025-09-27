
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

export default function AdminApprovals() {
  const { user, signOut } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const router = useRouter();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch pending account approvals from Supabase
  const fetchPendingApprovals = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch pending account approvals
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('status', 'pending');

      if (accountsError) throw accountsError;

      // Fetch pending card applications
      const { data: cardApps, error: cardError } = await supabase
        .from('card_applications')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('status', 'pending');

      if (cardError) throw cardError;

      // Fetch pending loan applications
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('status', 'pending');

      if (loansError) throw loansError;

      setPendingApprovals({
        accounts: accounts || [],
        cards: cardApps || [],
        loans: loans || []
      });

    } catch (error) {
      console.error('Error fetching approvals:', error);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval/rejection of account applications
  const handleAccountApproval = async (accountId, action) => {
    setProcessing(accountId);
    
    try {
      const newStatus = action === 'approve' ? 'active' : 'rejected';
      
      const { error } = await supabase
        .from('accounts')
        .update({ 
          status: newStatus,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null
        })
        .eq('id', accountId);

      if (error) throw error;

      // Refresh the approvals list
      await fetchPendingApprovals();

    } catch (error) {
      console.error('Error processing approval:', error);
      setError('Failed to process approval');
    } finally {
      setProcessing(null);
    }
  };

  // Handle approval/rejection of card applications
  const handleCardApproval = async (cardId, action) => {
    setProcessing(cardId);
    
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('card_applications')
        .update({ 
          status: newStatus,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null
        })
        .eq('id', cardId);

      if (error) throw error;

      await fetchPendingApprovals();

    } catch (error) {
      console.error('Error processing card approval:', error);
      setError('Failed to process card approval');
    } finally {
      setProcessing(null);
    }
  };

  // Handle approval/rejection of loan applications
  const handleLoanApproval = async (loanId, action) => {
    setProcessing(loanId);
    
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('loans')
        .update({ 
          status: newStatus,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null
        })
        .eq('id', loanId);

      if (error) throw error;

      await fetchPendingApprovals();

    } catch (error) {
      console.error('Error processing loan approval:', error);
      setError('Failed to process loan approval');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>✅ Pending Approvals</h1>
            <p style={styles.subtitle}>Review and approve customer applications</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchPendingApprovals} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Pending Accounts</h3>
            <p style={styles.statNumber}>
              {pendingApprovals.accounts?.length || 0}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Pending Cards</h3>
            <p style={styles.statNumber}>
              {pendingApprovals.cards?.length || 0}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Pending Loans</h3>
            <p style={styles.statNumber}>
              {pendingApprovals.loans?.length || 0}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Pending</h3>
            <p style={styles.statNumber}>
              {(pendingApprovals.accounts?.length || 0) + 
               (pendingApprovals.cards?.length || 0) + 
               (pendingApprovals.loans?.length || 0)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'accounts' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('accounts')}
          >
            🏦 Account Applications ({pendingApprovals.accounts?.length || 0})
          </button>
          <button
            style={activeTab === 'cards' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('cards')}
          >
            💳 Card Applications ({pendingApprovals.cards?.length || 0})
          </button>
          <button
            style={activeTab === 'loans' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('loans')}
          >
            🏠 Loan Applications ({pendingApprovals.loans?.length || 0})
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading pending approvals...</p>
          </div>
        ) : (
          <div style={styles.approvalsContainer}>
            {/* Account Approvals */}
            {activeTab === 'accounts' && (
              <div style={styles.approvalsGrid}>
                {pendingApprovals.accounts?.length === 0 ? (
                  <div style={styles.noItems}>
                    <h3>No pending account applications</h3>
                    <p>All account applications have been processed.</p>
                  </div>
                ) : (
                  pendingApprovals.accounts?.map((account) => (
                    <div key={account.id} style={styles.approvalCard}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Account Application</h3>
                        <span style={styles.statusBadge}>Pending</span>
                      </div>
                      <div style={styles.cardDetails}>
                        <div style={styles.detailRow}>
                          <span>Applicant:</span>
                          <span>{account.profiles?.full_name}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Email:</span>
                          <span>{account.profiles?.email}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Account Type:</span>
                          <span>{account.account_type}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Applied:</span>
                          <span>{new Date(account.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleAccountApproval(account.id, 'approve')}
                          style={styles.approveButton}
                          disabled={processing === account.id}
                        >
                          {processing === account.id ? 'Processing...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => handleAccountApproval(account.id, 'reject')}
                          style={styles.rejectButton}
                          disabled={processing === account.id}
                        >
                          {processing === account.id ? 'Processing...' : '❌ Reject'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Card Approvals */}
            {activeTab === 'cards' && (
              <div style={styles.approvalsGrid}>
                {pendingApprovals.cards?.length === 0 ? (
                  <div style={styles.noItems}>
                    <h3>No pending card applications</h3>
                    <p>All card applications have been processed.</p>
                  </div>
                ) : (
                  pendingApprovals.cards?.map((card) => (
                    <div key={card.id} style={styles.approvalCard}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Card Application</h3>
                        <span style={styles.statusBadge}>Pending</span>
                      </div>
                      <div style={styles.cardDetails}>
                        <div style={styles.detailRow}>
                          <span>Applicant:</span>
                          <span>{card.profiles?.full_name}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Card Type:</span>
                          <span>{card.card_type}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Applied:</span>
                          <span>{new Date(card.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleCardApproval(card.id, 'approve')}
                          style={styles.approveButton}
                          disabled={processing === card.id}
                        >
                          {processing === card.id ? 'Processing...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => handleCardApproval(card.id, 'reject')}
                          style={styles.rejectButton}
                          disabled={processing === card.id}
                        >
                          {processing === card.id ? 'Processing...' : '❌ Reject'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Loan Approvals */}
            {activeTab === 'loans' && (
              <div style={styles.approvalsGrid}>
                {pendingApprovals.loans?.length === 0 ? (
                  <div style={styles.noItems}>
                    <h3>No pending loan applications</h3>
                    <p>All loan applications have been processed.</p>
                  </div>
                ) : (
                  pendingApprovals.loans?.map((loan) => (
                    <div key={loan.id} style={styles.approvalCard}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Loan Application</h3>
                        <span style={styles.statusBadge}>Pending</span>
                      </div>
                      <div style={styles.cardDetails}>
                        <div style={styles.detailRow}>
                          <span>Applicant:</span>
                          <span>{loan.profiles?.full_name}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Loan Type:</span>
                          <span>{loan.loan_type}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Amount:</span>
                          <span>${loan.amount?.toLocaleString()}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Applied:</span>
                          <span>{new Date(loan.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleLoanApproval(loan.id, 'approve')}
                          style={styles.approveButton}
                          disabled={processing === loan.id}
                        >
                          {processing === loan.id ? 'Processing...' : '✅ Approve'}
                        </button>
                        <button
                          onClick={() => handleLoanApproval(loan.id, 'reject')}
                          style={styles.rejectButton}
                          disabled={processing === loan.id}
                        >
                          {processing === loan.id ? 'Processing...' : '❌ Reject'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: '#1e3c72',
    color: 'white'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  approvalsContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  approvalsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  noItems: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  },
  approvalCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    background: '#f8f9fa'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  statusBadge: {
    background: '#ffc107',
    color: '#212529',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cardDetails: {
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px'
  },
  approveButton: {
    flex: 1,
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  rejectButton: {
    flex: 1,
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
};
