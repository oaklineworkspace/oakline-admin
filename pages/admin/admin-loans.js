import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLoans() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    amount: '',
    note: '',
    loanId: '',
    userId: '',
    accountId: '',
    loanType: 'personal',
    principal: '',
    interestRate: '',
    termMonths: '',
    purpose: '',
    monthlyPayment: '',
    adminPassword: ''
  });
  const [loanToApprove, setLoanToApprove] = useState(null);
  const [treasuryBalance, setTreasuryBalance] = useState(0); // State for treasury balance

  useEffect(() => {
    fetchLoans();
    fetchTreasuryBalance(); // Fetch treasury balance on component mount
  }, []);

  const fetchTreasuryBalance = async () => {
    try {
      const response = await fetch('/api/admin/get-treasury-balance');
      if (!response.ok) throw new Error('Failed to fetch treasury balance');
      const data = await response.json();
      setTreasuryBalance(data.balance);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching treasury balance:', err);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-loans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch loans');
      const data = await response.json();

      // Fetch deposit verification status for each loan
      const loansWithDeposits = await Promise.all(
        (data.loans || []).map(async (loan) => {
          if (loan.deposit_required && loan.deposit_required > 0) {
            try {
              const detailResponse = await fetch(`/api/admin/get-loan-detail?loanId=${loan.id}`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              });

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                return {
                  ...loan,
                  deposit_info: detailData.depositInfo,
                  deposit_paid: detailData.depositInfo?.amount >= loan.deposit_required // Add deposit_paid status
                };
              }
            } catch (err) {
              console.error('Error fetching deposit info for loan:', loan.id, err);
            }
          }
          return loan;
        })
      );

      setLoans(loansWithDeposits);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!formData.amount || !formData.loanId) {
      setError('Amount and loan ID are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/process-loan-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: formData.loanId,
          amount: parseFloat(formData.amount),
          note: formData.note
        })
      });

      if (!response.ok) throw new Error('Failed to process payment');

      setSuccess('Payment processed successfully');
      setShowModal(null);
      setFormData({ ...formData, amount: '', note: '' });
      await fetchLoans();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      const loan = loans.find(l => l.id === loanId);

      if (loan.deposit_required > 0 && !loan.deposit_paid) {
        alert(`Cannot approve loan: User must first pay the required deposit of $${loan.deposit_required.toFixed(2)}`);
        return;
      }

      // Check treasury balance before approving
      if (parseFloat(loan.principal) > treasuryBalance) {
        alert('Cannot approve loan: Insufficient treasury balance.');
        return;
      }

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to approve loans');
        return;
      }

      const response = await fetch('/api/admin/update-loan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loanId: loanId,
          userId: loan.user_id,
          userEmail: loan.user_email,
          status: 'approved',
          adminPassword: formData.adminPassword // Include password for approval
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve loan');
      }

      alert('Loan approved successfully! You can now disburse the funds.');
      setShowModal(null);
      setLoanToApprove(null);
      setFormData({...formData, adminPassword: ''});
      await fetchLoans();
      fetchTreasuryBalance(); // Update treasury balance after approval
    } catch (error) {
      console.error('Error approving loan:', error);
      setError(error.message || 'Failed to approve loan');
    }
  };

  const handleDisburse = async (loanId) => {
    if (!confirm('Are you sure you want to disburse this loan? This will transfer funds from the treasury to the user account.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/approve-loan-with-disbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disburse loan');
      }

      alert('Loan disbursed successfully! Funds have been credited to user account.');
      fetchLoans();
      fetchTreasuryBalance(); // Update treasury balance after disbursement
    } catch (error) {
      console.error('Error disbursing loan:', error);
      setError(error.message || 'Failed to disburse loan');
    }
  };

  const handleRejectLoan = async (loanId, reason) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      // Find the loan to get user details
      const loan = loans.find(l => l.id === loanId);
      if (!loan) {
        setError('Loan not found');
        return;
      }

      const response = await fetch('/api/admin/update-loan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loanId,
          status: 'rejected',
          reason,
          userId: loan.user_id,
          userEmail: loan.user_email
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject loan');
      }

      setSuccess('Loan rejected and notification sent to user');
      setShowModal(null);
      setFormData({...formData, note: ''});
      await fetchLoans();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateLoan = async () => {
    try {
      const response = await fetch('/api/admin/create-loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId,
          accountId: formData.accountId,
          loanType: formData.loanType,
          principal: parseFloat(formData.principal),
          interestRate: parseFloat(formData.interestRate),
          termMonths: parseInt(formData.termMonths),
          purpose: formData.purpose,
          monthlyPayment: parseFloat(formData.monthlyPayment)
        })
      });

      if (!response.ok) throw new Error('Failed to create loan');

      setSuccess('Loan created successfully');
      setShowModal(null);
      setFormData({
        amount: '', note: '', loanId: '', userId: '', accountId: '',
        loanType: 'personal', principal: '', interestRate: '',
        termMonths: '', purpose: '', monthlyPayment: ''
      });
      await fetchLoans();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || loan.loan_type === filterType;
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'pending' && loan.status === 'pending') ||
                      (activeTab === 'active' && loan.status === 'active') ||
                      (activeTab === 'overdue' && loan.is_late);
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    active: loans.filter(l => l.status === 'active').length,
    overdue: loans.filter(l => l.is_late).length,
    totalPrincipal: loans.reduce((sum, l) => sum + (parseFloat(l.principal) || 0), 0),
    totalOutstanding: loans.reduce((sum, l) => sum + (parseFloat(l.remaining_balance) || 0), 0)
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏦 Loan Management System</h1>
            <p style={styles.subtitle}>Comprehensive loan administration and monitoring</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchLoans} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <button onClick={() => setShowModal('create')} style={styles.createButton}>
              ➕ New Loan
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Treasury Balance Card */}
        <div style={styles.treasuryCard}>
          <div style={styles.treasuryIcon}>🏛️</div>
          <div>
            <div style={styles.treasuryLabel}>Treasury Balance</div>
            <div style={styles.treasuryAmount}>
              ${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Loans</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
            <h3 style={styles.statLabel}>Active</h3>
            <p style={styles.statValue}>{stats.active}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Overdue</h3>
            <p style={styles.statValue}>{stats.overdue}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #7c3aed'}}>
            <h3 style={styles.statLabel}>Total Principal</h3>
            <p style={styles.statValue}>${stats.totalPrincipal.toLocaleString()}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #ea580c'}}>
            <h3 style={styles.statLabel}>Outstanding</h3>
            <p style={styles.statValue}>${stats.totalOutstanding.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'active', 'overdue'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <input
            type="text"
            placeholder="🔍 Search by email or loan ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            <option value="personal">Personal</option>
            <option value="home">Home</option>
            <option value="auto">Auto</option>
            <option value="business">Business</option>
            <option value="student">Student</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Loans Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No loans found</p>
            </div>
          ) : (
            <div style={styles.loansGrid}>
              {filteredLoans.map(loan => (
                <div key={loan.id} style={styles.loanCard}>
                  <div style={styles.loanHeader}>
                    <div>
                      <h3 style={styles.loanType}>
                        {loan.loan_type?.toUpperCase() || 'LOAN'}
                      </h3>
                      <p style={styles.loanEmail}>{loan.user_email}</p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      background: loan.status === 'active' ? '#d1fae5' :
                                loan.status === 'pending' ? '#fef3c7' :
                                loan.status === 'rejected' ? '#fee2e2' :
                                loan.status === 'approved' ? '#dbeafe' : '#f3f4f6',
                      color: loan.status === 'active' ? '#065f46' :
                            loan.status === 'pending' ? '#92400e' :
                            loan.status === 'rejected' ? '#991b1b' :
                            loan.status === 'approved' ? '#1e40af' : '#374151'
                    }}>
                      {loan.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.loanBody}>
                    <div style={styles.loanInfo}>
                      <span style={styles.infoLabel}>Principal:</span>
                      <span style={styles.infoValue}>${parseFloat(loan.principal || 0).toLocaleString()}</span>
                    </div>
                    <div style={styles.loanInfo}>
                      <span style={styles.infoLabel}>Remaining:</span>
                      <span style={{...styles.infoValue, color: '#059669', fontWeight: '600'}}>
                        ${parseFloat(loan.remaining_balance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.loanInfo}>
                      <span style={styles.infoLabel}>Interest Rate:</span>
                      <span style={styles.infoValue}>{loan.interest_rate}%</span>
                    </div>
                    <div style={styles.loanInfo}>
                      <span style={styles.infoLabel}>Term:</span>
                      <span style={styles.infoValue}>{loan.term_months} months</span>
                    </div>
                    <div style={styles.loanInfo}>
                      <span style={styles.infoLabel}>Monthly Payment:</span>
                      <span style={styles.infoValue}>${parseFloat(loan.monthly_payment_amount || 0).toLocaleString()}</span>
                    </div>
                    {loan.next_payment_date && (
                      <div style={styles.loanInfo}>
                        <span style={styles.infoLabel}>Next Payment:</span>
                        <span style={styles.infoValue}>
                          {new Date(loan.next_payment_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {loan.deposit_required && loan.deposit_required > 0 && (
                      <div style={styles.loanInfo}>
                        <span style={styles.infoLabel}>Deposit Required:</span>
                        <span style={styles.infoValue}>
                          ${parseFloat(loan.deposit_required).toLocaleString()}
                          {loan.deposit_paid ? (
                            <span style={{...styles.depositBadge, background: '#d1fae5', color: '#065f46', marginLeft: '8px'}}>
                              ✓ Paid
                            </span>
                          ) : (
                            <span style={{...styles.depositBadge, background: '#fee2e2', color: '#991b1b', marginLeft: '8px'}}>
                              ✗ Unpaid
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {loan.is_late && (
                      <div style={styles.lateBadge}>⚠️ PAYMENT OVERDUE</div>
                    )}
                  </div>

                  <div style={styles.loanFooter}>
                    <button onClick={() => setSelectedLoan(loan)} style={styles.viewButton}>
                      👁️ Details
                    </button>
                    {loan.status === 'pending' && (
                      <button
                        onClick={() => {
                          setLoanToApprove(loan);
                          setShowModal('approve');
                        }}
                        style={{
                          ...styles.approveButton,
                          opacity: (loan.deposit_required > 0 && !loan.deposit_paid) || (parseFloat(loan.principal) > treasuryBalance) ? 0.6 : 1,
                          cursor: (loan.deposit_required > 0 && !loan.deposit_paid) || (parseFloat(loan.principal) > treasuryBalance) ? 'not-allowed' : 'pointer'
                        }}
                        title={
                          loan.deposit_required > 0 && !loan.deposit_paid
                            ? `Deposit of $${parseFloat(loan.deposit_required).toLocaleString()} not paid`
                            : parseFloat(loan.principal) > treasuryBalance
                              ? 'Insufficient treasury balance'
                              : 'Approve loan'
                        }
                        disabled={loan.deposit_required > 0 && !loan.deposit_paid || parseFloat(loan.principal) > treasuryBalance}
                      >
                        ✅ Approve
                      </button>
                    )}
                    {loan.status === 'approved' && !loan.disbursed_at && (
                      <button
                        onClick={() => handleDisburse(loan.id)}
                        style={{
                          ...styles.disburseButton,
                          opacity: parseFloat(loan.principal) > treasuryBalance ? 0.6 : 1,
                          cursor: parseFloat(loan.principal) > treasuryBalance ? 'not-allowed' : 'pointer'
                        }}
                        title={parseFloat(loan.principal) > treasuryBalance ? 'Insufficient treasury balance' : 'Disburse loan'}
                        disabled={parseFloat(loan.principal) > treasuryBalance}
                      >
                        💰 Disburse Loan
                      </button>
                    )}
                    {loan.status === 'pending' && (
                      <button onClick={() => {
                        setFormData({...formData, loanId: loan.id});
                        setShowModal('reject');
                      }} style={styles.rejectButton}>
                        ❌ Reject
                      </button>
                    )}
                    {loan.status === 'active' && (
                      <button onClick={() => {
                        setFormData({...formData, loanId: loan.id});
                        setShowModal('payment');
                      }} style={styles.paymentButton}>
                        💰 Process Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loan Details Modal */}
        {selectedLoan && (
          <div style={styles.modalOverlay} onClick={() => setSelectedLoan(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Loan Details</h2>
                <button onClick={() => setSelectedLoan(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Loan ID:</span>
                    <span style={styles.detailValue}>{selectedLoan.id}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Borrower:</span>
                    <span style={styles.detailValue}>{selectedLoan.user_email}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>{selectedLoan.loan_type}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Principal Amount:</span>
                    <span style={styles.detailValue}>${parseFloat(selectedLoan.principal).toLocaleString()}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Remaining Balance:</span>
                    <span style={styles.detailValue}>${parseFloat(selectedLoan.remaining_balance || 0).toLocaleString()}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Interest Rate:</span>
                    <span style={styles.detailValue}>{selectedLoan.interest_rate}%</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Term:</span>
                    <span style={styles.detailValue}>{selectedLoan.term_months} months</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Monthly Payment:</span>
                    <span style={styles.detailValue}>${parseFloat(selectedLoan.monthly_payment_amount || 0).toLocaleString()}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Payments Made:</span>
                    <span style={styles.detailValue}>{selectedLoan.payments_made || 0}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={styles.detailValue}>{selectedLoan.status}</span>
                  </div>
                  {selectedLoan.purpose && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Purpose:</span>
                      <span style={styles.detailValue}>{selectedLoan.purpose}</span>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Created:</span>
                    <span style={styles.detailValue}>{new Date(selectedLoan.created_at).toLocaleDateString()}</span>
                  </div>
                   {selectedLoan.disbursed_at && (
                     <div style={styles.detailItem}>
                       <span style={styles.detailLabel}>Disbursed On:</span>
                       <span style={styles.detailValue}>{new Date(selectedLoan.disbursed_at).toLocaleString()}</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Loan Modal */}
        {showModal === 'create' && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Create New Loan</h2>
                <button onClick={() => setShowModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>User ID</label>
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    style={styles.input}
                    placeholder="Enter user ID"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account ID</label>
                  <input
                    type="text"
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    style={styles.input}
                    placeholder="Enter account ID"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Loan Type</label>
                  <select
                    value={formData.loanType}
                    onChange={(e) => setFormData({...formData, loanType: e.target.value})}
                    style={styles.input}
                  >
                    <option value="personal">Personal Loan</option>
                    <option value="home">Home Loan</option>
                    <option value="auto">Auto Loan</option>
                    <option value="business">Business Loan</option>
                    <option value="student">Student Loan</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Principal Amount</label>
                  <input
                    type="number"
                    value={formData.principal}
                    onChange={(e) => setFormData({...formData, principal: e.target.value})}
                    style={styles.input}
                    placeholder="Enter principal amount"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({...formData, interestRate: e.target.value})}
                    style={styles.input}
                    placeholder="e.g., 5.5"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Term (Months)</label>
                  <input
                    type="number"
                    value={formData.termMonths}
                    onChange={(e) => setFormData({...formData, termMonths: e.target.value})}
                    style={styles.input}
                    placeholder="e.g., 36"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Monthly Payment</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthlyPayment}
                    onChange={(e) => setFormData({...formData, monthlyPayment: e.target.value})}
                    style={styles.input}
                    placeholder="Enter monthly payment amount"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Purpose</label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    style={{...styles.input, minHeight: '80px'}}
                    placeholder="Loan purpose..."
                  />
                </div>
                <button onClick={handleCreateLoan} style={styles.submitButton}>
                  Create Loan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showModal === 'payment' && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Process Loan Payment</h2>
                <button onClick={() => setShowModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    style={styles.input}
                    placeholder="Enter payment amount"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Note (Optional)</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    style={{...styles.input, minHeight: '60px'}}
                    placeholder="Payment note..."
                  />
                </div>
                <button onClick={handleProcessPayment} style={styles.submitButton}>
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Loan Confirmation Modal */}
        {showModal === 'approve' && loanToApprove && (
          <div style={styles.modalOverlay} onClick={() => {
            setShowModal(null);
            setLoanToApprove(null);
            setFormData({...formData, adminPassword: ''});
          }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Confirm Loan Approval</h2>
                <button onClick={() => {
                  setShowModal(null);
                  setLoanToApprove(null);
                  setFormData({...formData, adminPassword: ''});
                }} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={{...styles.detailsGrid, marginBottom: '20px'}}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Borrower:</span>
                    <span style={styles.detailValue}>{loanToApprove.user_email}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Loan Type:</span>
                    <span style={styles.detailValue}>{loanToApprove.loan_type}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Principal Amount:</span>
                    <span style={styles.detailValue}>${parseFloat(loanToApprove.principal).toLocaleString()}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Treasury Balance:</span>
                    <span style={styles.detailValue}>
                      ${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {loanToApprove.deposit_required && loanToApprove.deposit_required > 0 && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Deposit Status:</span>
                      <span style={styles.detailValue}>
                        {loanToApprove.deposit_paid ? (
                          <span style={{color: '#10b981', fontWeight: '700'}}>
                            ✓ Paid ($${parseFloat(loanToApprove.deposit_info?.amount || 0).toLocaleString()})
                          </span>
                        ) : (
                          <span style={{color: '#dc2626', fontWeight: '700'}}>
                            ✗ Unpaid (Required: ${parseFloat(loanToApprove.deposit_required).toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {loanToApprove.deposit_required > 0 && !loanToApprove.deposit_paid && (
                  <div style={{
                    background: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <p style={{color: '#991b1b', fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px'}}>
                      ⚠️ Deposit Not Paid
                    </p>
                    <p style={{color: '#4a5568', fontSize: '13px', margin: 0}}>
                      The borrower has not paid the required deposit of ${parseFloat(loanToApprove.deposit_required).toLocaleString()}.
                      Please ensure the deposit is paid before approving this loan.
                    </p>
                  </div>
                )}
                 {parseFloat(loanToApprove.principal) > treasuryBalance && (
                  <div style={{
                    background: '#fef3c7',
                    border: '2px solid #d97706',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <p style={{color: '#92400e', fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px'}}>
                      ⚠️ Insufficient Treasury Funds
                    </p>
                    <p style={{color: '#4a5568', fontSize: '13px', margin: 0}}>
                      The principal amount of this loan (${parseFloat(loanToApprove.principal).toLocaleString()}) exceeds the current treasury balance (${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                      Please ensure sufficient funds are available before approving.
                    </p>
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Admin Password *</label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                    style={styles.input}
                    placeholder="Enter your password to confirm"
                  />
                </div>
                <p style={{color: '#64748b', fontSize: '14px', marginBottom: '16px'}}>
                  The borrower will receive an email notification once approved.
                </p>
                <button
                  onClick={handleApprove}
                  style={styles.approveButton}
                  disabled={
                    (loanToApprove.deposit_required > 0 && !loanToApprove.deposit_paid) ||
                    (parseFloat(loanToApprove.principal) > treasuryBalance) ||
                    !formData.adminPassword
                  }
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showModal === 'reject' && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Reject Loan Application</h2>
                <button onClick={() => setShowModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Rejection Reason</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    style={{...styles.input, minHeight: '100px'}}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <button
                  onClick={() => handleRejectLoan(formData.loanId, formData.note)}
                  style={styles.rejectButton}
                >
                  Confirm Rejection
                </button>
              </div>
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  createButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  filtersSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  },
  loansGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  loanCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 20px)',
    background: 'white',
    transition: 'all 0.3s ease'
  },
  loanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  loanType: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  loanEmail: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  loanBody: {
    marginBottom: '16px'
  },
  loanInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  infoLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  infoValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  lateBadge: {
    marginTop: '12px',
    padding: '8px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)'
  },
  loanFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  viewButton: {
    flex: 1,
    padding: '10px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  approveButton: {
    padding: '10px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1 // Added to make buttons take equal space
  },
  rejectButton: {
    flex: 1,
    padding: '10px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  paymentButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  disburseButton: {
    padding: '10px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 3.5vw, 24px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  detailsGrid: {
    display: 'grid',
    gap: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    color: '#2d3748',
    fontWeight: '500'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px'
  },
  depositBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  treasuryCard: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  treasuryIcon: {
    fontSize: '3rem'
  },
  treasuryLabel: {
    fontSize: '0.9rem',
    opacity: 0.9,
    marginBottom: '0.25rem'
  },
  treasuryAmount: {
    fontSize: '2rem',
    fontWeight: 'bold'
  },
};