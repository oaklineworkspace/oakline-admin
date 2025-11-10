import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageAccountOpeningDeposits() {
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(null);
  const [walletForm, setWalletForm] = useState({
    cryptoAssetId: '',
    cryptoType: '',
    networkType: '',
    walletAddress: '',
    memo: '',
    requiredAmount: ''
  });
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    amount: '',
    txHash: '',
    confirmations: '',
    status: '',
    rejectionReason: '',
    adminNotes: ''
  });
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

      // Fetch account opening deposits
      const depositsResponse = await fetch('/api/admin/get-account-opening-deposits', { headers });
      console.log('Deposits response status:', depositsResponse.status, depositsResponse.statusText);
      const depositsResult = await depositsResponse.json();
      console.log('Deposits result:', depositsResult);

      if (!depositsResponse.ok) {
        console.error('Deposits fetch failed:', depositsResult);
        throw new Error(depositsResult.error || 'Failed to fetch deposits');
      }

      // Fetch crypto assets
      const assetsResponse = await fetch('/api/admin/get-crypto-assets', { headers });
      console.log('Assets response status:', assetsResponse.status, assetsResponse.statusText);
      const assetsResult = await assetsResponse.json();
      console.log('Assets result:', assetsResult);

      if (!assetsResponse.ok) {
        console.error('Assets fetch failed:', assetsResult);
        throw new Error(assetsResult.error || 'Failed to fetch crypto assets');
      }

      console.log('Setting accounts:', accountsResult.accounts?.length || 0);
      console.log('Setting deposits:', depositsResult.deposits?.length || 0);
      console.log('Setting crypto assets:', assetsResult.assets?.length || 0);

      setAccounts(accountsResult.accounts || []);
      setDeposits(depositsResult.deposits || []);
      setCryptoAssets(assetsResult.assets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      });
      setError('Failed to load data: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openWalletModal = (account) => {
    // Find existing deposit for this account
    const existingDeposit = deposits.find(d => d.account_id === account.id);
    
    setWalletForm({
      cryptoAssetId: existingDeposit?.crypto_asset_id || '',
      cryptoType: existingDeposit?.crypto_assets?.crypto_type || '',
      networkType: existingDeposit?.crypto_assets?.network_type || '',
      walletAddress: existingDeposit?.admin_assigned_wallets?.wallet_address || '',
      memo: existingDeposit?.admin_assigned_wallets?.memo || '',
      requiredAmount: account.min_deposit || ''
    });
    
    setShowWalletModal(account);
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setProcessing(showWalletModal.id);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('/api/admin/assign-wallet-for-account-opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: showWalletModal.user_id,
          applicationId: showWalletModal.application_id,
          accountId: showWalletModal.id,
          cryptoAssetId: walletForm.cryptoAssetId,
          walletAddress: walletForm.walletAddress,
          memo: walletForm.memo,
          cryptoType: walletForm.cryptoType,
          networkType: walletForm.networkType,
          requiredAmount: parseFloat(walletForm.requiredAmount),
          adminId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign wallet');
      }

      setMessage('✅ Wallet assigned successfully!');
      setTimeout(() => setMessage(''), 5000);
      setShowWalletModal(null);
      await fetchData();
    } catch (error) {
      console.error('Error assigning wallet:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const openUpdateModal = (deposit) => {
    setUpdateForm({
      amount: deposit.amount || '',
      txHash: deposit.tx_hash || '',
      confirmations: deposit.confirmations || '',
      status: deposit.status || 'pending',
      rejectionReason: deposit.rejection_reason || '',
      adminNotes: deposit.admin_notes || ''
    });
    setShowUpdateModal(deposit);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(showUpdateModal.id);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('/api/admin/update-account-opening-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: showUpdateModal.id,
          amount: updateForm.amount ? parseFloat(updateForm.amount) : undefined,
          txHash: updateForm.txHash || undefined,
          confirmations: updateForm.confirmations ? parseInt(updateForm.confirmations) : undefined,
          status: updateForm.status,
          rejectionReason: updateForm.rejectionReason || undefined,
          adminNotes: updateForm.adminNotes || undefined,
          adminId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update deposit');
      }

      setMessage('✅ Deposit updated successfully!');
      setTimeout(() => setMessage(''), 5000);
      setShowUpdateModal(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating deposit:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const handleCryptoAssetChange = (assetId) => {
    const asset = cryptoAssets.find(a => a.id === assetId);
    if (asset) {
      setWalletForm({
        ...walletForm,
        cryptoAssetId: assetId,
        cryptoType: asset.crypto_type,
        networkType: asset.network_type
      });
    }
  };

  const getDepositForAccount = (accountId) => {
    return deposits.find(d => d.account_id === accountId);
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

  const getStatusEmoji = (status) => {
    const emojis = {
      pending: '⏳',
      awaiting_confirmations: '🔄',
      confirmed: '✅',
      approved: '✅',
      completed: '🎉',
      rejected: '❌',
      failed: '❌'
    };
    return emojis[status] || '📋';
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Account Opening Deposits</h1>
            <p style={styles.subtitle}>Assign crypto wallets and track minimum deposits</p>
          </div>
          <Link href="/admin/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
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
          <div style={styles.loading}>Loading data...</div>
        ) : (
          <>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{accounts.length}</div>
                <div style={styles.statLabel}>Accounts Awaiting Funding</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {deposits.filter(d => d.status === 'pending').length}
                </div>
                <div style={styles.statLabel}>Pending Deposits</div>
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
                  <p>No accounts awaiting funding.</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Account</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Min. Deposit</th>
                      <th style={styles.th}>Deposit Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const deposit = getDepositForAccount(account.id);
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
                              <strong>${parseFloat(account.min_deposit || 0).toFixed(2)}</strong>
                            </td>
                            <td style={styles.td}>
                              {deposit ? (
                                <div>
                                  <span style={{
                                    ...styles.statusBadge,
                                    backgroundColor: getStatusColor(deposit.status) + '20',
                                    color: getStatusColor(deposit.status)
                                  }}>
                                    {getStatusEmoji(deposit.status)} {deposit.status}
                                  </span>
                                  {deposit.amount > 0 && (
                                    <div style={styles.amount}>
                                      ${parseFloat(deposit.amount).toFixed(2)} deposited
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={styles.noWallet}>No wallet assigned</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actions}>
                                <button
                                  onClick={() => openWalletModal(account)}
                                  style={{...styles.btn, ...styles.btnPrimary}}
                                  disabled={processing === account.id}
                                >
                                  {deposit ? '📝 Edit Wallet' : '➕ Assign Wallet'}
                                </button>
                                {deposit && (
                                  <button
                                    onClick={() => openUpdateModal(deposit)}
                                    style={{...styles.btn, ...styles.btnSecondary}}
                                    disabled={processing === account.id}
                                  >
                                    📊 Update Deposit
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                                  style={{...styles.btn, ...styles.btnInfo}}
                                >
                                  {isExpanded ? '▲' : '▼'} Details
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && deposit && (
                            <tr>
                              <td colSpan="5" style={styles.expandedCell}>
                                <div style={styles.detailsPanel}>
                                  <h4 style={styles.detailsTitle}>Deposit Details</h4>
                                  <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}>
                                      <strong>Crypto:</strong> {deposit.crypto_assets?.crypto_type}
                                    </div>
                                    <div style={styles.detailItem}>
                                      <strong>Network:</strong> {deposit.crypto_assets?.network_type}
                                    </div>
                                    <div style={styles.detailItem}>
                                      <strong>Wallet:</strong> 
                                      <code style={styles.code}>
                                        {deposit.admin_assigned_wallets?.wallet_address || 'N/A'}
                                      </code>
                                    </div>
                                    {deposit.admin_assigned_wallets?.memo && (
                                      <div style={styles.detailItem}>
                                        <strong>Memo:</strong> {deposit.admin_assigned_wallets.memo}
                                      </div>
                                    )}
                                    <div style={styles.detailItem}>
                                      <strong>Required:</strong> ${parseFloat(deposit.required_amount || 0).toFixed(2)}
                                    </div>
                                    <div style={styles.detailItem}>
                                      <strong>Deposited:</strong> ${parseFloat(deposit.amount || 0).toFixed(2)}
                                    </div>
                                    <div style={styles.detailItem}>
                                      <strong>Approved:</strong> ${parseFloat(deposit.approved_amount || 0).toFixed(2)}
                                    </div>
                                    <div style={styles.detailItem}>
                                      <strong>Confirmations:</strong> {deposit.confirmations}/{deposit.required_confirmations}
                                    </div>
                                    {deposit.tx_hash && (
                                      <div style={styles.detailItem}>
                                        <strong>TX Hash:</strong> 
                                        <code style={styles.code}>{deposit.tx_hash}</code>
                                      </div>
                                    )}
                                    {deposit.admin_notes && (
                                      <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                                        <strong>Admin Notes:</strong> 
                                        <p style={styles.notes}>{deposit.admin_notes}</p>
                                      </div>
                                    )}
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

        {/* Wallet Assignment Modal */}
        {showWalletModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>
                {getDepositForAccount(showWalletModal.id) ? 'Edit' : 'Assign'} Crypto Wallet
              </h2>
              <form onSubmit={handleWalletSubmit}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Crypto Asset *</label>
                    <select
                      value={walletForm.cryptoAssetId}
                      onChange={(e) => handleCryptoAssetChange(e.target.value)}
                      style={styles.input}
                      required
                    >
                      <option value="">Select crypto asset</option>
                      {cryptoAssets.filter(a => a.status === 'active').map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.crypto_type} ({asset.symbol}) - {asset.network_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Required Amount (USD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={walletForm.requiredAmount}
                      onChange={(e) => setWalletForm({...walletForm, requiredAmount: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Wallet Address *</label>
                    <input
                      type="text"
                      value={walletForm.walletAddress}
                      onChange={(e) => setWalletForm({...walletForm, walletAddress: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Memo/Tag (Optional)</label>
                    <input
                      type="text"
                      value={walletForm.memo}
                      onChange={(e) => setWalletForm({...walletForm, memo: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowWalletModal(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.btn, ...styles.btnPrimary}}
                    disabled={processing === showWalletModal.id}
                  >
                    {processing === showWalletModal.id ? 'Saving...' : 'Save Wallet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Deposit Modal */}
        {showUpdateModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Update Deposit Status</h2>
              <form onSubmit={handleUpdateSubmit}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Amount Deposited (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={updateForm.amount}
                      onChange={(e) => setUpdateForm({...updateForm, amount: e.target.value})}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirmations</label>
                    <input
                      type="number"
                      value={updateForm.confirmations}
                      onChange={(e) => setUpdateForm({...updateForm, confirmations: e.target.value})}
                      style={styles.input}
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Transaction Hash</label>
                    <input
                      type="text"
                      value={updateForm.txHash}
                      onChange={(e) => setUpdateForm({...updateForm, txHash: e.target.value})}
                      style={styles.input}
                    />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Status *</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="awaiting_confirmations">Awaiting Confirmations</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {(updateForm.status === 'rejected' || updateForm.status === 'failed') && (
                    <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                      <label style={styles.label}>Rejection Reason</label>
                      <textarea
                        value={updateForm.rejectionReason}
                        onChange={(e) => setUpdateForm({...updateForm, rejectionReason: e.target.value})}
                        style={{...styles.input, minHeight: '80px'}}
                      />
                    </div>
                  )}

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Admin Notes</label>
                    <textarea
                      value={updateForm.adminNotes}
                      onChange={(e) => setUpdateForm({...updateForm, adminNotes: e.target.value})}
                      style={{...styles.input, minHeight: '100px'}}
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.btn, ...styles.btnPrimary}}
                    disabled={processing === showUpdateModal.id}
                  >
                    {processing === showUpdateModal.id ? 'Updating...' : 'Update Deposit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminAuth>
  );
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
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
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
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  amount: {
    fontSize: '13px',
    color: '#059669',
    marginTop: '4px',
    fontWeight: '600'
  },
  noWallet: {
    color: '#94a3b8',
    fontStyle: 'italic'
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
  btnPrimary: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#475569'
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
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  detailItem: {
    fontSize: '14px'
  },
  code: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    display: 'block',
    marginTop: '4px',
    wordBreak: 'break-all'
  },
  notes: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    margin: '8px 0 0 0',
    fontSize: '14px',
    lineHeight: '1.6'
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
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  }
};
