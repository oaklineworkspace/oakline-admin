
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function ApproveAccounts() {
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const fetchAllAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const token = session.access_token;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Fetch all accounts except 'active' status
      const statusesToFetch = ['approve', 'approved', 'pending_funding', 'suspended', 'closed', 'rejected'];
      
      const responses = await Promise.all(
        statusesToFetch.map(status => 
          fetch(`/api/admin/get-accounts?status=${status}`, { headers })
        )
      );

      const results = await Promise.all(
        responses.map(response => response.json())
      );

      const errors = [];
      results.forEach((result, index) => {
        if (!responses[index].ok) {
          console.error(`Failed to fetch "${statusesToFetch[index]}" status accounts:`, result.error);
          errors.push(`"${statusesToFetch[index]}" status accounts`);
        }
      });

      if (errors.length > 0) {
        setError(`Warning: Failed to fetch ${errors.join(', ')}. Showing partial results.`);
      }

      // Combine all accounts
      const allAccounts = results
        .filter((result, index) => responses[index].ok)
        .flatMap(result => result.accounts || []);

      // Fetch deposit information for each account
      const accountsWithDeposits = await Promise.all(
        allAccounts.map(async (account) => {
          try {
            const depositsResponse = await fetch(`/api/admin/get-account-opening-deposits?account_id=${account.id}`, {
              headers
            });
            if (depositsResponse.ok) {
              const depositsData = await depositsResponse.json();
              const deposits = depositsData.deposits || [];
              
              const totalDeposited = deposits
                .filter(d => ['approved', 'completed'].includes(d.status))
                .reduce((sum, d) => sum + parseFloat(d.approved_amount || 0), 0);
              
              const minDeposit = parseFloat(account.min_deposit || 0);
              const depositMet = minDeposit === 0 || totalDeposited >= minDeposit;
              
              return {
                ...account,
                deposits,
                totalDeposited,
                depositMet,
                depositInfo: {
                  required: minDeposit,
                  deposited: totalDeposited,
                  remaining: Math.max(0, minDeposit - totalDeposited)
                }
              };
            }
          } catch (err) {
            console.error(`Failed to fetch deposits for account ${account.id}:`, err);
          }
          
          const minDeposit = parseFloat(account.min_deposit || 0);
          return {
            ...account,
            deposits: [],
            totalDeposited: 0,
            depositMet: minDeposit === 0,
            depositInfo: {
              required: minDeposit,
              deposited: 0,
              remaining: minDeposit
            }
          };
        })
      );
      
      accountsWithDeposits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAccounts(accountsWithDeposits);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountStatus = async (accountId, accountNumber, newStatus, actionName) => {
    setProcessing(accountId);
    setError('');
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/admin/update-account-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: accountId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${actionName} account`);
      }

      const statusEmojis = {
        active: '✅',
        suspended: '⏸️',
        closed: '🔒',
        rejected: '❌'
      };

      let successMessage = `${statusEmojis[newStatus]} Account ${accountNumber} has been ${actionName} successfully!`;
      
      // Add email notification status to the message
      if (result.emailSent) {
        successMessage += ` 📧 Email notification sent to user.`;
      } else if (result.emailWarning) {
        successMessage += ` ⚠️ ${result.emailWarning}`;
      }

      setMessage(successMessage);
      setTimeout(() => setMessage(''), 8000);

      await fetchAllAccounts();
    } catch (error) {
      console.error(`Error ${actionName} account:`, error);
      setError(error.message);
      setTimeout(() => setError(''), 8000);
    } finally {
      setProcessing(null);
    }
  };

  const activateAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'active', 'activated');
  };

  const suspendAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'suspended', 'suspended');
  };

  const closeAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'closed', 'closed');
  };

  const rejectAccount = async (accountId, accountNumber) => {
    await updateAccountStatus(accountId, accountNumber, 'rejected', 'rejected');
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.applications?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.applications?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.applications?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;
    
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'pending' && ['approve', 'approved', 'pending_funding'].includes(account.status)) ||
                      (activeTab === 'suspended' && account.status === 'suspended') ||
                      (activeTab === 'closed' && account.status === 'closed') ||
                      (activeTab === 'rejected' && account.status === 'rejected');
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: accounts.length,
    pending: accounts.filter(a => ['approve', 'approved', 'pending_funding'].includes(a.status)).length,
    suspended: accounts.filter(a => a.status === 'suspended').length,
    closed: accounts.filter(a => a.status === 'closed').length,
    rejected: accounts.filter(a => a.status === 'rejected').length
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏦 Account Management System</h1>
            <p style={styles.subtitle}>Manage and activate bank accounts</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchAllAccounts} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/approve-funding" style={styles.linkButton}>
              💰 Approve Funding
            </Link>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {message && <div style={styles.successBanner}>{message}</div>}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
            <h3 style={styles.statLabel}>Total Accounts</h3>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending Activation</h3>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #8b5cf6'}}>
            <h3 style={styles.statLabel}>Suspended</h3>
            <p style={styles.statValue}>{stats.suspended}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #6b7280'}}>
            <h3 style={styles.statLabel}>Closed</h3>
            <p style={styles.statValue}>{stats.closed}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #dc2626'}}>
            <h3 style={styles.statLabel}>Rejected</h3>
            <p style={styles.statValue}>{stats.rejected}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['all', 'pending', 'suspended', 'closed', 'rejected'].map(tab => (
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
            placeholder="🔍 Search by account number, name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Statuses</option>
            <option value="approve">Approve</option>
            <option value="approved">Approved</option>
            <option value="pending_funding">Pending Funding</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Accounts Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📋</p>
              <p style={styles.emptyText}>No accounts found</p>
            </div>
          ) : (
            <div style={styles.accountsGrid}>
              {filteredAccounts.map(account => (
                <div key={account.id} style={styles.accountCard}>
                  <div style={styles.accountHeader}>
                    <div>
                      <h3 style={styles.accountNumber}>{account.account_number}</h3>
                      <p style={styles.accountType}>{account.account_type?.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      background: account.status === 'approved' ? '#fef3c7' :
                                account.status === 'approve' ? '#fef3c7' :
                                account.status === 'pending_funding' ? '#dbeafe' :
                                account.status === 'suspended' ? '#fee2e2' :
                                account.status === 'closed' ? '#f3f4f6' :
                                account.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                      color: account.status === 'approved' ? '#92400e' :
                            account.status === 'approve' ? '#92400e' :
                            account.status === 'pending_funding' ? '#1e40af' :
                            account.status === 'suspended' ? '#991b1b' :
                            account.status === 'closed' ? '#374151' :
                            account.status === 'rejected' ? '#991b1b' : '#374151'
                    }}>
                      {account.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.accountBody}>
                    {account.applications && (
                      <>
                        <div style={styles.accountInfo}>
                          <span style={styles.infoLabel}>Name:</span>
                          <span style={styles.infoValue}>{account.applications.first_name} {account.applications.last_name}</span>
                        </div>
                        <div style={styles.accountInfo}>
                          <span style={styles.infoLabel}>Email:</span>
                          <span style={styles.infoValue}>{account.applications.email}</span>
                        </div>
                      </>
                    )}
                    <div style={styles.accountInfo}>
                      <span style={styles.infoLabel}>Balance:</span>
                      <span style={styles.infoValue}>${parseFloat(account.balance || 0).toFixed(2)}</span>
                    </div>
                    {account.depositInfo && account.depositInfo.required > 0 && (
                      <>
                        <div style={{...styles.accountInfo, borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginTop: '8px'}}>
                          <span style={styles.infoLabel}>Min. Deposit:</span>
                          <span style={{...styles.infoValue, fontWeight: '700'}}>${account.depositInfo.required.toFixed(2)}</span>
                        </div>
                        <div style={styles.accountInfo}>
                          <span style={styles.infoLabel}>Deposited:</span>
                          <span style={{
                            ...styles.infoValue,
                            color: account.depositMet ? '#059669' : '#f59e0b',
                            fontWeight: '700'
                          }}>
                            ${account.depositInfo.deposited.toFixed(2)}
                          </span>
                        </div>
                        {!account.depositMet && (
                          <div style={styles.accountInfo}>
                            <span style={styles.infoLabel}>Remaining:</span>
                            <span style={{...styles.infoValue, color: '#dc2626', fontWeight: '700'}}>
                              ${account.depositInfo.remaining.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div style={{
                          background: account.depositMet ? '#d1fae5' : '#fef2f2',
                          border: `2px solid ${account.depositMet ? '#059669' : '#dc2626'}`,
                          borderRadius: '8px',
                          padding: '12px',
                          marginTop: '8px'
                        }}>
                          <p style={{
                            margin: 0,
                            fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
                            color: account.depositMet ? '#065f46' : '#991b1b',
                            fontWeight: '600'
                          }}>
                            {account.depositMet ? (
                              <>✅ Deposit requirement met</>
                            ) : (
                              <>⚠️ Awaiting ${account.depositInfo.remaining.toFixed(2)} deposit</>
                            )}
                          </p>
                        </div>
                      </>
                    )}
                    <div style={styles.accountInfo}>
                      <span style={styles.infoLabel}>Created:</span>
                      <span style={styles.infoValue}>{new Date(account.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={styles.accountFooter}>
                    <button
                      onClick={() => activateAccount(account.id, account.account_number)}
                      disabled={processing === account.id || !account.depositMet}
                      style={{
                        ...styles.activateButton,
                        ...((!account.depositMet) && {
                          background: '#9ca3af',
                          cursor: 'not-allowed',
                          opacity: 0.6
                        })
                      }}
                      title={
                        !account.depositMet
                          ? `Minimum deposit of $${account.depositInfo?.required.toFixed(2)} required`
                          : 'Activate account'
                      }
                    >
                      {processing === account.id ? '⏳ Processing...' : 
                       !account.depositMet ? '🔒 Deposit Required' :
                       '🚀 Activate'}
                    </button>
                    <button
                      onClick={() => suspendAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.suspendButton}
                    >
                      {processing === account.id ? '⏳' : '⏸️'} Suspend
                    </button>
                    <button
                      onClick={() => closeAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.closeButton}
                    >
                      {processing === account.id ? '⏳' : '🔒'} Close
                    </button>
                    <button
                      onClick={() => rejectAccount(account.id, account.account_number)}
                      disabled={processing === account.id}
                      style={styles.rejectButton}
                    >
                      {processing === account.id ? '⏳' : '❌'} Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  '@keyframes slideIn': {
    from: {
      transform: 'translateY(-20px)',
      opacity: 0
    },
    to: {
      transform: 'translateY(0)',
      opacity: 1
    }
  },
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
  linkButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    display: 'inline-block'
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
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#991b1b',
    padding: '20px 24px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: 'clamp(0.95rem, 2.2vw, 16px)',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
    border: '2px solid #dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease-out'
  },
  successBanner: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    color: '#065f46',
    padding: '20px 24px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: 'clamp(0.95rem, 2.2vw, 16px)',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
    border: '2px solid #10b981',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease-out'
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
  accountsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  accountCard: {
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  accountNumber: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  accountType: {
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
  accountBody: {
    marginBottom: '16px'
  },
  accountInfo: {
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
  accountFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  activateButton: {
    gridColumn: '1 / -1',
    padding: '10px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  suspendButton: {
    padding: '10px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeButton: {
    padding: '10px',
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  rejectButton: {
    gridColumn: '1 / -1',
    padding: '10px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
