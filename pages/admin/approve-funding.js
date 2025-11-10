
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ApproveFunding() {
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expandedAccount, setExpandedAccount] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const [accountsResponse, depositsResponse] = await Promise.all([
        fetch('/api/admin/get-accounts?status=pending_funding', { headers }),
        fetch('/api/admin/get-account-opening-deposits', { headers })
      ]);

      const [accountsResult, depositsResult] = await Promise.all([
        accountsResponse.json(),
        depositsResponse.json()
      ]);

      if (!accountsResponse.ok) {
        throw new Error(accountsResult.error || 'Failed to fetch accounts');
      }

      if (!depositsResponse.ok) {
        throw new Error(depositsResult.error || 'Failed to fetch deposits');
      }

      setAccounts(accountsResult.accounts || []);
      setDeposits(depositsResult.deposits || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const confirmFunding = async (accountId, accountNumber) => {
    const account = accounts.find(a => a.id === accountId);
    const accountDeposits = deposits.filter(d => d.account_id === accountId && d.status === 'completed');
    const totalDeposited = accountDeposits.reduce((sum, d) => sum + parseFloat(d.approved_amount || 0), 0);
    const minDeposit = parseFloat(account?.min_deposit || 0);

    if (totalDeposited < minDeposit) {
      setError(`Cannot confirm funding. Required: $${minDeposit.toFixed(2)}, Deposited: $${totalDeposited.toFixed(2)}`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!window.confirm(`Confirm funding and activate account ${accountNumber}?\nTotal deposited: $${totalDeposited.toFixed(2)}`)) {
      return;
    }

    setProcessing(accountId);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch('/api/admin/confirm-account-funding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          adminId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm funding');
      }

      setMessage(`✅ Account ${accountNumber} activated successfully!`);
      setTimeout(() => setMessage(''), 5000);

      await fetchData();
    } catch (error) {
      console.error('Error confirming funding:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const getDepositsForAccount = (accountId) => {
    return deposits.filter(d => d.account_id === accountId);
  };

  const getTotalDeposited = (accountId) => {
    const accountDeposits = deposits.filter(
      d => d.account_id === accountId && (d.status === 'completed' || d.status === 'approved')
    );
    return accountDeposits.reduce((sum, d) => sum + parseFloat(d.approved_amount || 0), 0);
  };

  const canConfirmFunding = (account) => {
    const totalDeposited = getTotalDeposited(account.id);
    const minDeposit = parseFloat(account.min_deposit || 0);
    return totalDeposited >= minDeposit;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      awaiting_confirmations: '#3b82f6',
      confirmed: '#10b981',
      approved: '#10b981',
      completed: '#059669',
      rejected: '#ef4444',
      failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>🎉 Approve Account Funding</h1>
            <p style={styles.subtitle}>Confirm minimum deposits and activate accounts</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchData} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/manage-account-opening-deposits" style={styles.linkButton}>
              💳 Manage Deposits
            </Link>
            <Link href="/admin/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div style={{...styles.alert, ...styles.alertError}}>
            {error}
          </div>
        )}

        {message && (
          <div style={{...styles.alert, ...styles.alertSuccess}}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading accounts...</p>
          </div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
                <h3 style={styles.statLabel}>Awaiting Funding</h3>
                <p style={styles.statValue}>{accounts.length}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
                <h3 style={styles.statLabel}>Ready to Activate</h3>
                <p style={styles.statValue}>
                  {accounts.filter(a => canConfirmFunding(a)).length}
                </p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                <h3 style={styles.statLabel}>Completed Deposits</h3>
                <p style={styles.statValue}>
                  {deposits.filter(d => d.status === 'completed').length}
                </p>
              </div>
            </div>

            <div style={styles.tableContainer}>
              {accounts.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>📋</p>
                  <p style={styles.emptyText}>No accounts awaiting funding confirmation</p>
                  <Link href="/admin/approve-applications" style={styles.emptyLink}>
                    Go to Approve Applications
                  </Link>
                </div>
              ) : (
                <div style={styles.cardsGrid}>
                  {accounts.map((account) => {
                    const accountDeposits = getDepositsForAccount(account.id);
                    const totalDeposited = getTotalDeposited(account.id);
                    const minDeposit = parseFloat(account.min_deposit || 0);
                    const isReady = canConfirmFunding(account);
                    const isExpanded = expandedAccount === account.id;
                    
                    return (
                      <div key={account.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                          <div>
                            <h3 style={styles.accountNumber}>{account.account_number}</h3>
                            <p style={styles.accountType}>{account.account_type}</p>
                            <p style={styles.userName}>
                              {account.applications?.first_name} {account.applications?.last_name}
                            </p>
                            <p style={styles.userEmail}>{account.applications?.email}</p>
                          </div>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: isReady ? '#d1fae5' : '#fef3c7',
                            color: isReady ? '#065f46' : '#92400e'
                          }}>
                            {isReady ? '✅ Ready' : '⏳ Pending'}
                          </span>
                        </div>

                        <div style={styles.cardBody}>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Min. Required:</span>
                            <span style={{...styles.infoValue, color: '#1e40af', fontWeight: '600'}}>
                              ${minDeposit.toFixed(2)}
                            </span>
                          </div>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Total Deposited:</span>
                            <span style={{...styles.infoValue, color: isReady ? '#059669' : '#f59e0b', fontWeight: '600'}}>
                              ${totalDeposited.toFixed(2)}
                            </span>
                          </div>
                          {!isReady && minDeposit > 0 && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Remaining:</span>
                              <span style={{...styles.infoValue, color: '#f59e0b', fontWeight: '600'}}>
                                ${(minDeposit - totalDeposited).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Deposits Count:</span>
                            <span style={styles.infoValue}>
                              {accountDeposits.length} deposit{accountDeposits.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div style={styles.cardFooter}>
                          <button
                            onClick={() => confirmFunding(account.id, account.account_number)}
                            style={{
                              ...styles.btn,
                              ...(isReady ? styles.btnSuccess : styles.btnDisabled),
                              flex: 2
                            }}
                            disabled={!isReady || processing === account.id}
                          >
                            {processing === account.id ? '⏳ Processing...' : '🎉 Confirm & Activate'}
                          </button>
                          <button
                            onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                            style={{...styles.btn, ...styles.btnInfo, flex: 1}}
                          >
                            {isExpanded ? '▲' : '▼'} Details
                          </button>
                        </div>

                        {isExpanded && (
                          <div style={styles.expandedSection}>
                            <h4 style={styles.detailsTitle}>💰 Deposit History</h4>
                            
                            {accountDeposits.length === 0 ? (
                              <div style={styles.noDeposits}>
                                <p>No deposits recorded yet</p>
                                <Link 
                                  href="/admin/manage-account-opening-deposits"
                                  style={styles.manageLink}
                                >
                                  Assign Crypto Wallet
                                </Link>
                              </div>
                            ) : (
                              <>
                                <div style={styles.depositsList}>
                                  {accountDeposits.map((deposit, idx) => (
                                    <div key={deposit.id} style={styles.depositCard}>
                                      <div style={styles.depositHeader}>
                                        <span style={styles.depositNumber}>Deposit #{idx + 1}</span>
                                        <span style={{
                                          ...styles.depositStatus,
                                          backgroundColor: getStatusColor(deposit.status) + '20',
                                          color: getStatusColor(deposit.status)
                                        }}>
                                          {deposit.status}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.depositDetails}>
                                        <div style={styles.depositRow}>
                                          <span style={styles.depositLabel}>Crypto:</span>
                                          <span>{deposit.crypto_assets?.crypto_type || 'N/A'}</span>
                                        </div>
                                        <div style={styles.depositRow}>
                                          <span style={styles.depositLabel}>Network:</span>
                                          <span>{deposit.crypto_assets?.network_type || 'N/A'}</span>
                                        </div>
                                        <div style={styles.depositRow}>
                                          <span style={styles.depositLabel}>Amount:</span>
                                          <strong style={{color: '#059669'}}>
                                            ${parseFloat(deposit.amount || 0).toFixed(2)}
                                          </strong>
                                        </div>
                                        <div style={styles.depositRow}>
                                          <span style={styles.depositLabel}>Approved:</span>
                                          <strong style={{color: '#1e40af'}}>
                                            ${parseFloat(deposit.approved_amount || 0).toFixed(2)}
                                          </strong>
                                        </div>
                                        <div style={styles.depositRow}>
                                          <span style={styles.depositLabel}>Confirmations:</span>
                                          <span>
                                            {deposit.confirmations}/{deposit.required_confirmations}
                                          </span>
                                        </div>
                                        {deposit.tx_hash && (
                                          <div style={{...styles.depositRow, gridColumn: '1 / -1'}}>
                                            <span style={styles.depositLabel}>TX Hash:</span>
                                            <code style={styles.code}>{deposit.tx_hash}</code>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div style={styles.summary}>
                                  <div style={styles.summaryRow}>
                                    <span>Total Required:</span>
                                    <strong>${minDeposit.toFixed(2)}</strong>
                                  </div>
                                  <div style={styles.summaryRow}>
                                    <span>Total Deposited:</span>
                                    <strong style={{color: '#059669'}}>${totalDeposited.toFixed(2)}</strong>
                                  </div>
                                  <div style={styles.summaryRow}>
                                    <span>Remaining:</span>
                                    <strong style={{color: isReady ? '#059669' : '#f59e0b'}}>
                                      ${Math.max(0, minDeposit - totalDeposited).toFixed(2)}
                                    </strong>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
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
    transition: 'transform 0.2s',
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
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  alertError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  },
  alertSuccess: {
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7'
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
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
    fontWeight: '600',
    marginBottom: '16px'
  },
  emptyLink: {
    display: 'inline-block',
    padding: '10px 24px',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  cardsGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: {
    padding: 'clamp(12px, 3vw, 16px)',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  accountNumber: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  accountType: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#64748b',
    textTransform: 'capitalize'
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#334155'
  },
  userEmail: {
    margin: 0,
    fontSize: 'clamp(0.75rem, 1.8vw, 13px)',
    color: '#64748b'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  cardBody: {
    padding: 'clamp(12px, 3vw, 16px)'
  },
  infoRow: {
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
  cardFooter: {
    padding: 'clamp(12px, 3vw, 16px)',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  expandedSection: {
    padding: 'clamp(12px, 3vw, 16px)',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0'
  },
  detailsTitle: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#1e40af'
  },
  noDeposits: {
    textAlign: 'center',
    padding: '30px',
    background: '#fef3c7',
    borderRadius: '8px',
    color: '#92400e'
  },
  manageLink: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '8px 16px',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: 'clamp(0.8rem, 2vw, 14px)'
  },
  depositsList: {
    display: 'grid',
    gap: '12px',
    marginBottom: '16px'
  },
  depositCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px'
  },
  depositHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0'
  },
  depositNumber: {
    fontWeight: '600',
    color: '#1e40af',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  depositStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '600'
  },
  depositDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'clamp(0.8rem, 2vw, 13px)'
  },
  depositLabel: {
    color: '#64748b',
    marginRight: '8px'
  },
  code: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.7rem, 1.6vw, 11px)',
    fontFamily: 'monospace',
    display: 'block',
    marginTop: '4px',
    wordBreak: 'break-all'
  },
  summary: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    marginBottom: '8px'
  },
  btn: {
    flex: 1,
    minWidth: '100px',
    padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)',
    borderRadius: '6px',
    border: 'none',
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  },
  btnSuccess: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white'
  },
  btnDisabled: {
    background: '#e2e8f0',
    color: '#94a3b8',
    cursor: 'not-allowed'
  },
  btnInfo: {
    background: '#dbeafe',
    color: '#1e40af'
  }
};
