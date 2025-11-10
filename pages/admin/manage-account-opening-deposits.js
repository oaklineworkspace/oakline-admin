
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
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [walletForm, setWalletForm] = useState({
    cryptoAssetId: '',
    cryptoType: '',
    networkType: '',
    walletAddress: '',
    memo: '',
    requiredAmount: ''
  });
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

      const [accountsResponse, depositsResponse, assetsResponse] = await Promise.all([
        fetch('/api/admin/get-accounts?status=pending_funding', { headers }),
        fetch('/api/admin/get-account-opening-deposits', { headers }),
        fetch('/api/admin/get-crypto-assets', { headers })
      ]);

      const [accountsResult, depositsResult, assetsResult] = await Promise.all([
        accountsResponse.json(),
        depositsResponse.json(),
        assetsResponse.json()
      ]);

      if (!accountsResponse.ok) {
        throw new Error(accountsResult.error || 'Failed to fetch accounts');
      }

      if (!depositsResponse.ok) {
        throw new Error(depositsResult.error || 'Failed to fetch deposits');
      }

      if (!assetsResponse.ok) {
        throw new Error(assetsResult.error || 'Failed to fetch crypto assets');
      }

      setAccounts(accountsResult.accounts || []);
      setDeposits(depositsResult.deposits || []);
      setCryptoAssets(assetsResult.assets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openWalletModal = (account) => {
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
        throw new Error(result.error || result.details || 'Failed to update deposit');
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

  const handleDeleteDeposit = async () => {
    if (!showDeleteConfirm) return;

    setProcessing(showDeleteConfirm.id);
    setError('');

    try {
      const response = await fetch('/api/admin/delete-account-opening-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: showDeleteConfirm.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to delete deposit');
      }

      setMessage('✅ Deposit deleted successfully!');
      setTimeout(() => setMessage(''), 5000);
      setShowDeleteConfirm(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting deposit:', error);
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
            <h1 style={styles.title}>💳 Manage Account Opening Deposits</h1>
            <p style={styles.subtitle}>Assign crypto wallets and track minimum deposits</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchData} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
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
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: '4px solid #1e40af'}}>
                <h3 style={styles.statLabel}>Total Accounts</h3>
                <p style={styles.statValue}>{accounts.length}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                <h3 style={styles.statLabel}>Pending Deposits</h3>
                <p style={styles.statValue}>
                  {deposits.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #059669'}}>
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
                  <p style={styles.emptyText}>No accounts awaiting funding</p>
                </div>
              ) : (
                <div style={styles.cardsGrid}>
                  {accounts.map((account) => {
                    const deposit = getDepositForAccount(account.id);
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
                          {deposit && (
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: getStatusColor(deposit.status) + '20',
                              color: getStatusColor(deposit.status)
                            }}>
                              {getStatusEmoji(deposit.status)} {deposit.status}
                            </span>
                          )}
                        </div>

                        <div style={styles.cardBody}>
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Min. Deposit:</span>
                            <span style={styles.infoValue}>
                              ${parseFloat(account.min_deposit || 0).toFixed(2)}
                            </span>
                          </div>
                          {deposit && deposit.amount > 0 && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Deposited:</span>
                              <span style={{...styles.infoValue, color: '#059669', fontWeight: '600'}}>
                                ${parseFloat(deposit.amount).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={styles.cardFooter}>
                          <button
                            onClick={() => openWalletModal(account)}
                            style={{...styles.btn, ...styles.btnPrimary}}
                            disabled={processing === account.id}
                          >
                            {deposit ? '📝 Edit Wallet' : '➕ Assign Wallet'}
                          </button>
                          {deposit && (
                            <>
                              <button
                                onClick={() => openUpdateModal(deposit)}
                                style={{...styles.btn, ...styles.btnSecondary}}
                                disabled={processing === account.id}
                              >
                                📊 Update
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(deposit)}
                                style={{...styles.btn, ...styles.btnDanger}}
                                disabled={processing === account.id}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                            style={{...styles.btn, ...styles.btnInfo}}
                          >
                            {isExpanded ? '▲' : '▼'} Details
                          </button>
                        </div>

                        {isExpanded && deposit && (
                          <div style={styles.expandedSection}>
                            <h4 style={styles.detailsTitle}>Deposit Details</h4>
                            <div style={styles.detailsGrid}>
                              <div style={styles.detailItem}>
                                <strong>Crypto:</strong> {deposit.crypto_assets?.crypto_type || 'N/A'}
                              </div>
                              <div style={styles.detailItem}>
                                <strong>Network:</strong> {deposit.crypto_assets?.network_type || 'N/A'}
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
                                <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Wallet Assignment Modal */}
        {showWalletModal && (
          <div style={styles.modalOverlay} onClick={() => setShowWalletModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {getDepositForAccount(showWalletModal.id) ? 'Edit' : 'Assign'} Crypto Wallet
                </h2>
                <button onClick={() => setShowWalletModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <form onSubmit={handleWalletSubmit}>
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

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Wallet Address *</label>
                    <input
                      type="text"
                      value={walletForm.walletAddress}
                      onChange={(e) => setWalletForm({...walletForm, walletAddress: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Memo/Tag (Optional)</label>
                    <input
                      type="text"
                      value={walletForm.memo}
                      onChange={(e) => setWalletForm({...walletForm, memo: e.target.value})}
                      style={styles.input}
                    />
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
          </div>
        )}

        {/* Update Deposit Modal */}
        {showUpdateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowUpdateModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Update Deposit Status</h2>
                <button onClick={() => setShowUpdateModal(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <form onSubmit={handleUpdateSubmit}>
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

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Transaction Hash</label>
                    <input
                      type="text"
                      value={updateForm.txHash}
                      onChange={(e) => setUpdateForm({...updateForm, txHash: e.target.value})}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
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
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Rejection Reason</label>
                      <textarea
                        value={updateForm.rejectionReason}
                        onChange={(e) => setUpdateForm({...updateForm, rejectionReason: e.target.value})}
                        style={{...styles.input, minHeight: '80px'}}
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Admin Notes</label>
                    <textarea
                      value={updateForm.adminNotes}
                      onChange={(e) => setUpdateForm({...updateForm, adminNotes: e.target.value})}
                      style={{...styles.input, minHeight: '100px'}}
                    />
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
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
            <div style={{...styles.modal, maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>⚠️ Confirm Delete</h2>
                <button onClick={() => setShowDeleteConfirm(null)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <p style={{marginBottom: '20px'}}>
                  Are you sure you want to delete this deposit? This action cannot be undone.
                </p>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{...styles.btn, ...styles.btnSecondary}}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteDeposit}
                    style={{...styles.btn, ...styles.btnDanger}}
                    disabled={processing === showDeleteConfirm.id}
                  >
                    {processing === showDeleteConfirm.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
    fontWeight: '600'
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
    color: '#64748b'
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
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  detailItem: {
    fontSize: 'clamp(0.8rem, 2vw, 14px)'
  },
  code: {
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
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
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    lineHeight: '1.6'
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
  btnDanger: {
    background: '#dc2626',
    color: 'white'
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
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
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
    lineHeight: 1,
    padding: 0
  },
  modalBody: {
    padding: '20px'
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
    outline: 'none',
    fontFamily: 'inherit'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    flexWrap: 'wrap'
  }
};
