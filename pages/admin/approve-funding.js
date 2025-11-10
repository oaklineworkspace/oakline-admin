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

      // Fetch accounts that are pending funding (awaiting minimum deposit)
      const accountsResponse = await fetch('/api/admin/get-accounts?status=pending_funding', { headers });
      const accountsResult = await accountsResponse.json();

      if (!accountsResponse.ok) {
        throw new Error(accountsResult.error || 'Failed to fetch accounts');
      }

      // Fetch deposits for these accounts
      const depositsResponse = await fetch('/api/admin/get-account-opening-deposits', { headers });
      const depositsResult = await depositsResponse.json();

      if (!depositsResponse.ok) {
        throw new Error(depositsResult.error || 'Failed to fetch deposits');
      }

      setAccounts(accountsResult.accounts || []);
      setDeposits(depositsResult.deposits || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data: ' + error.message);
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

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Approve Account Funding</h1>
            <p style={styles.subtitle}>Confirm minimum deposits and activate accounts</p>
          </div>
          <div style={styles.headerActions}>
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
          <div style={styles.loading}>Loading accounts...</div>
        ) : (
          <>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{accounts.length}</div>
                <div style={styles.statLabel}>Accounts Awaiting Funding</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {accounts.filter(a => canConfirmFunding(a)).length}
                </div>
                <div style={styles.statLabel}>Ready to Activate</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {deposits.filter(d => d.status === 'completed').length}
                </div>
                <div style={styles.statLabel}>Completed Deposits</div>
              </div>
            </div>

            <div style={styles.tableContainer}>
              {accounts.length === 0 ? (
                <div style={styles.empty}>
                  <p>No accounts awaiting funding confirmation.</p>
                  <Link href="/admin/approve-applications" style={styles.emptyLink}>
                    Go to Approve Applications
                  </Link>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Account</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Min. Deposit</th>
                      <th style={styles.th}>Total Deposited</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const accountDeposits = getDepositsForAccount(account.id);
                      const totalDeposited = getTotalDeposited(account.id);
                      const minDeposit = parseFloat(account.min_deposit || 0);
                      const isReady = canConfirmFunding(account);
                      const isExpanded = expandedAccount === account.id;
                      
                      return (
                        <React.Fragment key={account.id}>
                          <tr style={styles.tr}>
                            <td style={styles.td}>
                              <div>
                                <strong>{account.account_number}</strong>
                                <div style={styles.accountType}>{account.account_type}</div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div>
                                <strong>
                                  {account.applications?.first_name} {account.applications?.last_name}
                                </strong>
                                <div style={styles.email}>{account.applications?.email}</div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <strong style={{color: '#1e40af'}}>${minDeposit.toFixed(2)}</strong>
                            </td>
                            <td style={styles.td}>
                              <strong style={{color: isReady ? '#059669' : '#f59e0b'}}>
                                ${totalDeposited.toFixed(2)}
                              </strong>
                              {!isReady && minDeposit > 0 && (
                                <div style={styles.remaining}>
                                  ${(minDeposit - totalDeposited).toFixed(2)} remaining
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>
                              {isReady ? (
                                <span style={{...styles.badge, ...styles.badgeSuccess}}>
                                  ✅ Ready to Activate
                                </span>
                              ) : (
                                <span style={{...styles.badge, ...styles.badgeWarning}}>
                                  ⏳ Awaiting Deposit
                                </span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actions}>
                                <button
                                  onClick={() => confirmFunding(account.id, account.account_number)}
                                  style={{
                                    ...styles.btn,
                                    ...(isReady ? styles.btnSuccess : styles.btnDisabled)
                                  }}
                                  disabled={!isReady || processing === account.id}
                                >
                                  {processing === account.id ? '⏳ Processing...' : '🎉 Confirm & Activate'}
                                </button>
                                <button
                                  onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                                  style={{...styles.btn, ...styles.btnInfo}}
                                >
                                  {isExpanded ? '▲ Hide' : '▼ Details'} ({accountDeposits.length})
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan="6" style={styles.expandedCell}>
                                <div style={styles.detailsPanel}>
                                  <h4 style={styles.detailsTitle}>Deposit History</h4>
                                  
                                  {accountDeposits.length === 0 ? (
                                    <div style={styles.noDeposits}>
                                      <p>No deposits recorded yet.</p>
                                      <Link 
                                        href="/admin/manage-account-opening-deposits"
                                        style={styles.manageLink}
                                      >
                                        Assign Crypto Wallet
                                      </Link>
                                    </div>
                                  ) : (
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
                                                <code style={styles.txHash}>{deposit.tx_hash}</code>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AdminAuth>
  );
}

function getStatusColor(status) {
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
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  backButton: {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  linkButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'transform 0.2s'
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500'
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '24px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    background: '#f8fafc',
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#1e293b',
    borderBottom: '2px solid #e2e8f0'
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s'
  },
  td: {
    padding: '16px',
    color: '#334155'
  },
  accountType: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px'
  },
  email: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px'
  },
  remaining: {
    fontSize: '13px',
    color: '#f59e0b',
    marginTop: '4px',
    fontWeight: '600'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  badgeSuccess: {
    background: '#d1fae5',
    color: '#065f46'
  },
  badgeWarning: {
    background: '#fef3c7',
    color: '#92400e'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
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
  },
  expandedCell: {
    background: '#f8fafc',
    padding: '0'
  },
  detailsPanel: {
    padding: '24px'
  },
  detailsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '16px'
  },
  noDeposits: {
    textAlign: 'center',
    padding: '40px',
    background: '#fef3c7',
    borderRadius: '8px',
    color: '#92400e'
  },
  manageLink: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 20px',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600'
  },
  depositsList: {
    display: 'grid',
    gap: '16px',
    marginBottom: '24px'
  },
  depositCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px'
  },
  depositHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0'
  },
  depositNumber: {
    fontWeight: '600',
    color: '#1e40af'
  },
  depositStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  depositDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  depositLabel: {
    color: '#64748b',
    marginRight: '12px'
  },
  txHash: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    marginTop: '4px'
  },
  summary: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    marginBottom: '8px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  },
  emptyLink: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 24px',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600'
  }
};
