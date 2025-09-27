
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

function AdminLoans() {
  const { user, signOut } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch loans from loans table with profile information
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select(`
          *,
          profiles!inner(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (loansError && loansError.code !== 'PGRST116') {
        throw loansError;
      }

      // Use real data if available, otherwise fallback to mock data
      if (loansData && loansData.length > 0) {
        const processedLoans = loansData.map(loan => ({
          id: loan.id,
          loanNumber: loan.loan_number || `LN-${loan.id}`,
          borrower: loan.profiles?.full_name || 'Unknown',
          email: loan.profiles?.email || 'N/A',
          type: loan.loan_type || 'Personal Loan',
          amount: loan.amount || 0,
          balance: loan.outstanding_balance || loan.amount || 0,
          interestRate: loan.interest_rate || 0,
          term: loan.term_years || 0,
          monthlyPayment: loan.monthly_payment || 0,
          status: loan.status || 'pending',
          nextDue: loan.next_payment_date || new Date().toISOString().split('T')[0],
          createdDate: loan.created_at
        }));
        setLoans(processedLoans);
      } else {
        setLoans(getMockLoansData());
      }

    } catch (error) {
      console.error('Error fetching loans:', error);
      setError('Failed to load loans data. Using mock data.');
      setLoans(getMockLoansData());
    } finally {
      setLoading(false);
    }
  };

  const getMockLoansData = () => [
    {
      id: 1,
      loanNumber: 'LN-2025-001',
      borrower: 'Christopher Hite',
      email: 'chris@example.com',
      type: 'Home Mortgage',
      amount: 350000,
      balance: 325000,
      interestRate: 4.5,
      term: 30,
      monthlyPayment: 1773.43,
      status: 'active',
      nextDue: '2025-02-01',
      createdDate: '2023-01-15'
    },
    {
      id: 2,
      loanNumber: 'LN-2025-002',
      borrower: 'Jane Smith',
      email: 'jane@example.com',
      type: 'Auto Loan',
      amount: 45000,
      balance: 38500,
      interestRate: 5.2,
      term: 5,
      monthlyPayment: 850.25,
      status: 'active',
      nextDue: '2025-02-05',
      createdDate: '2024-03-20'
    },
    {
      id: 3,
      loanNumber: 'LN-2025-003',
      borrower: 'Bob Johnson',
      email: 'bob@example.com',
      type: 'Personal Loan',
      amount: 15000,
      balance: 12300,
      interestRate: 8.9,
      term: 3,
      monthlyPayment: 475.50,
      status: 'overdue',
      nextDue: '2025-01-20',
      createdDate: '2024-06-10'
    }
  ];

  const handleLoanAction = async (action, loanId) => {
    try {
      let updateData = {};
      
      switch (action) {
        case 'approve':
          updateData = { status: 'active' };
          break;
        case 'reject':
          updateData = { status: 'rejected' };
          break;
        case 'close':
          updateData = { status: 'closed' };
          break;
        default:
          console.log(`${action} loan ${loanId}`);
          return;
      }

      const { error } = await supabase
        .from('loans')
        .update(updateData)
        .eq('id', loanId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user?.id,
          action: `loan_${action}`,
          target_type: 'loan',
          target_id: loanId,
          details: { action, status: updateData.status }
        });

      // Refresh loans data
      fetchLoans();
      
    } catch (error) {
      console.error(`Error ${action}ing loan:`, error);
      setError(`Failed to ${action} loan`);
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading loan data...</p>
        </div>
      </AdminRoute>
    );
  }

  const activeLoans = loans.filter(loan => loan.status === 'active');
  const pendingLoans = loans.filter(loan => loan.status === 'pending');
  const overdueLoans = loans.filter(loan => loan.status === 'overdue');

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🏠 Loan Management</h1>
            <p style={styles.subtitle}>Manage customer loans and applications</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchLoans} style={styles.refreshButton}>
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
            <h3>Total Loans</h3>
            <p style={styles.statNumber}>{loans.length}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Amount</h3>
            <p style={styles.statNumber}>
              ${loans.reduce((sum, loan) => sum + loan.amount, 0).toLocaleString()}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Outstanding Balance</h3>
            <p style={styles.statNumber}>
              ${loans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString()}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Overdue Loans</h3>
            <p style={styles.statNumber}>
              {overdueLoans.length}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'overview' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('overview')}
          >
            All Loans ({loans.length})
          </button>
          <button
            style={activeTab === 'pending' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('pending')}
          >
            Pending Applications ({pendingLoans.length})
          </button>
          <button
            style={activeTab === 'overdue' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('overdue')}
          >
            Overdue Payments ({overdueLoans.length})
          </button>
        </div>

        {/* Loans Table */}
        <div style={styles.tableContainer}>
          <div style={styles.tableActions}>
            <button style={styles.actionButton}>
              ➕ New Loan Application
            </button>
            <button style={styles.actionButton}>
              📊 Generate Report
            </button>
            <button style={styles.actionButton}>
              📧 Send Payment Reminders
            </button>
          </div>

          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={styles.tableHeaderCell}>Loan #</div>
              <div style={styles.tableHeaderCell}>Borrower</div>
              <div style={styles.tableHeaderCell}>Type</div>
              <div style={styles.tableHeaderCell}>Amount</div>
              <div style={styles.tableHeaderCell}>Balance</div>
              <div style={styles.tableHeaderCell}>Rate</div>
              <div style={styles.tableHeaderCell}>Status</div>
              <div style={styles.tableHeaderCell}>Actions</div>
            </div>
            
            {loans
              .filter(loan => {
                if (activeTab === 'pending') return loan.status === 'pending';
                if (activeTab === 'overdue') return loan.status === 'overdue';
                return true;
              })
              .map(loan => (
                <div key={loan.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>{loan.loanNumber}</div>
                  <div style={styles.tableCell}>
                    <div>
                      <strong>{loan.borrower}</strong>
                      <br />
                      <small style={styles.email}>{loan.email}</small>
                    </div>
                  </div>
                  <div style={styles.tableCell}>{loan.type}</div>
                  <div style={styles.tableCell}>${loan.amount.toLocaleString()}</div>
                  <div style={styles.tableCell}>${loan.balance.toLocaleString()}</div>
                  <div style={styles.tableCell}>{loan.interestRate}%</div>
                  <div style={styles.tableCell}>
                    <span style={{
                      ...styles.status,
                      background: loan.status === 'active' ? '#28a745' : 
                                loan.status === 'overdue' ? '#dc3545' : 
                                loan.status === 'pending' ? '#ffc107' : '#6c757d'
                    }}>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button 
                        style={styles.actionBtn}
                        onClick={() => setSelectedLoan(loan)}
                      >
                        👁️ View
                      </button>
                      {loan.status === 'pending' && (
                        <>
                          <button 
                            style={styles.approveBtn}
                            onClick={() => handleLoanAction('approve', loan.id)}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            style={styles.rejectBtn}
                            onClick={() => handleLoanAction('reject', loan.id)}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {loan.status === 'active' && (
                        <button 
                          style={styles.actionBtn}
                          onClick={() => handleLoanAction('payment', loan.id)}
                        >
                          💰 Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Loan Details Modal */}
        {selectedLoan && (
          <div style={styles.modal} onClick={() => setSelectedLoan(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2>Loan Details - {selectedLoan.loanNumber}</h2>
                <button 
                  style={styles.closeButton}
                  onClick={() => setSelectedLoan(null)}
                >
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.loanDetails}>
                  <div style={styles.detailGroup}>
                    <h3>Borrower Information</h3>
                    <p><strong>Name:</strong> {selectedLoan.borrower}</p>
                    <p><strong>Email:</strong> {selectedLoan.email}</p>
                  </div>
                  <div style={styles.detailGroup}>
                    <h3>Loan Information</h3>
                    <p><strong>Type:</strong> {selectedLoan.type}</p>
                    <p><strong>Original Amount:</strong> ${selectedLoan.amount.toLocaleString()}</p>
                    <p><strong>Current Balance:</strong> ${selectedLoan.balance.toLocaleString()}</p>
                    <p><strong>Interest Rate:</strong> {selectedLoan.interestRate}%</p>
                    <p><strong>Term:</strong> {selectedLoan.term} years</p>
                    <p><strong>Monthly Payment:</strong> ${selectedLoan.monthlyPayment}</p>
                  </div>
                  <div style={styles.detailGroup}>
                    <h3>Payment Information</h3>
                    <p><strong>Status:</strong> {selectedLoan.status}</p>
                    <p><strong>Next Due Date:</strong> {selectedLoan.nextDue}</p>
                    <p><strong>Created:</strong> {new Date(selectedLoan.createdDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

export default AdminLoans;

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#555',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
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
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #fecaca'
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
    fontSize: '28px',
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
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  tableActions: {
    display: 'flex',
    gap: '15px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  actionButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '120px 200px 150px 120px 120px 80px 120px 200px',
    gap: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#495057'
  },
  tableHeaderCell: {
    padding: '5px'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 200px 150px 120px 120px 80px 120px 200px',
    gap: '15px',
    padding: '15px',
    background: 'white',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    alignItems: 'center'
  },
  tableCell: {
    padding: '5px',
    fontSize: '14px'
  },
  email: {
    color: '#666',
    fontSize: '12px'
  },
  status: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionBtn: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#495057'
  },
  approveBtn: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  rejectBtn: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e9ecef'
  },
  modalBody: {
    padding: '20px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666'
  },
  loanDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  detailGroup: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px'
  }
};
