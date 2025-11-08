
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageAccountOpeningWallets() {
  const [wallets, setWallets] = useState([]);
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [availableCryptoAssets, setAvailableCryptoAssets] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingWallet, setEditingWallet] = useState(null);
  
  const [formData, setFormData] = useState({
    cryptoType: '',
    networkType: '',
    walletAddress: '',
    memo: ''
  });

  const [editFormData, setEditFormData] = useState({
    cryptoType: '',
    networkType: '',
    walletAddress: '',
    memo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      // Fetch crypto assets
      const assetsResponse = await fetch('/api/admin/get-crypto-assets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const assetsResult = await assetsResponse.json();
      if (!assetsResponse.ok) {
        throw new Error(assetsResult.error || 'Failed to fetch crypto assets');
      }

      // Only use active assets
      const activeAssets = (assetsResult.assets || []).filter(a => a.status === 'active');
      setCryptoAssets(activeAssets);

      // Group assets by crypto type
      if (assetsResult.grouped) {
        setAvailableCryptoAssets(assetsResult.grouped);
        // Set initial form data
        const firstCrypto = Object.keys(assetsResult.grouped)[0];
        if (firstCrypto) {
          setFormData({
            cryptoType: firstCrypto,
            networkType: assetsResult.grouped[firstCrypto][0] || '',
            walletAddress: '',
            memo: ''
          });
        }
      }

      // Fetch existing wallets
      await fetchWallets();

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update network type when crypto type changes
  useEffect(() => {
    const networks = availableCryptoAssets[formData.cryptoType] || [];
    if (networks.length > 0 && !networks.includes(formData.networkType)) {
      setFormData(prev => ({
        ...prev,
        networkType: networks[0]
      }));
    }
  }, [formData.cryptoType, availableCryptoAssets]);

  useEffect(() => {
    const networks = availableCryptoAssets[editFormData.cryptoType] || [];
    if (networks.length > 0 && !networks.includes(editFormData.networkType)) {
      setEditFormData(prev => ({
        ...prev,
        networkType: networks[0]
      }));
    }
  }, [editFormData.cryptoType, availableCryptoAssets]);

  const fetchWallets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/get-account-opening-wallets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch wallets');
      }

      setWallets(result.wallets || []);
    } catch (err) {
      console.error('Error fetching wallets:', err);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.cryptoType || !formData.networkType || !formData.walletAddress.trim()) {
      setError('Crypto type, network type and wallet address are required');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Find matching crypto asset
      const matchingAsset = cryptoAssets.find(
        asset => asset.crypto_type === formData.cryptoType && 
                 asset.network_type === formData.networkType
      );

      if (!matchingAsset) {
        throw new Error('No matching crypto asset found');
      }

      const response = await fetch('/api/admin/manage-account-opening-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cryptoAssetId: matchingAsset.id,
          walletAddress: formData.walletAddress.trim(),
          memo: formData.memo.trim() || null
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add wallet');
      }

      setMessage('✅ Wallet added successfully!');
      // Reset to first available crypto type
      const firstCrypto = Object.keys(availableCryptoAssets)[0];
      setFormData({
        cryptoType: firstCrypto,
        networkType: availableCryptoAssets[firstCrypto]?.[0] || '',
        walletAddress: '',
        memo: ''
      });
      await fetchWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error adding wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (wallet) => {
    setEditingWallet(wallet.id);
    
    const cryptoType = wallet.crypto_assets?.crypto_type || wallet.crypto_type || '';
    const networkType = wallet.crypto_assets?.network_type || wallet.network_type || '';
    
    setEditFormData({
      cryptoType: cryptoType,
      networkType: networkType,
      walletAddress: wallet.wallet_address || '',
      memo: wallet.memo || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingWallet(null);
    setEditFormData({
      cryptoType: '',
      networkType: '',
      walletAddress: '',
      memo: ''
    });
  };

  const handleUpdate = async (walletId) => {
    setError('');
    setMessage('');

    if (!editFormData.cryptoType || !editFormData.networkType || !editFormData.walletAddress.trim()) {
      setError('Crypto type, network type and wallet address are required');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Find matching crypto asset
      const matchingAsset = cryptoAssets.find(
        asset => asset.crypto_type === editFormData.cryptoType && 
                 asset.network_type === editFormData.networkType
      );

      if (!matchingAsset) {
        throw new Error('No matching crypto asset found');
      }

      const response = await fetch('/api/admin/manage-account-opening-wallet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          walletId,
          cryptoAssetId: matchingAsset.id,
          walletAddress: editFormData.walletAddress.trim(),
          memo: editFormData.memo.trim() || null
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update wallet');
      }

      setMessage('✅ Wallet updated successfully!');
      setEditingWallet(null);
      await fetchWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (walletId) => {
    if (!confirm('Are you sure you want to delete this wallet? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/manage-account-opening-wallet', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ walletId })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete wallet');
      }

      setMessage('✅ Wallet deleted successfully!');
      await fetchWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏦 Manage Account Opening Crypto Wallets</h1>
          <Link href="/admin/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            <strong>Purpose:</strong> These wallets are used for account opening minimum deposit requirements.
            Users will deposit crypto to these addresses to fulfill their minimum deposit requirements for account activation.
          </p>
        </div>

        {/* Add New Wallet Form */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>➕ Add New Account Opening Wallet</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Crypto Type *</label>
                <select
                  value={formData.cryptoType}
                  onChange={(e) => setFormData(prev => ({ ...prev, cryptoType: e.target.value }))}
                  style={styles.select}
                  required
                >
                  {Object.keys(availableCryptoAssets).length > 0 ? (
                    Object.keys(availableCryptoAssets).map(crypto => (
                      <option key={crypto} value={crypto}>{crypto}</option>
                    ))
                  ) : (
                    <option value="">Loading...</option>
                  )}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Network Type *</label>
                <select
                  value={formData.networkType}
                  onChange={(e) => setFormData(prev => ({ ...prev, networkType: e.target.value }))}
                  style={styles.select}
                  required
                >
                  {(availableCryptoAssets[formData.cryptoType] || []).map(network => (
                    <option key={network} value={network}>{network}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Wallet Address *</label>
                <input
                  type="text"
                  value={formData.walletAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                  placeholder="Enter wallet address"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo / Tag (Optional)</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="For XRP, TON, etc."
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <button
                  type="submit"
                  disabled={loading}
                  style={loading ? styles.disabledButton : styles.submitButton}
                >
                  {loading ? 'Adding...' : 'Add Wallet'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Wallets Table */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>📋 Existing Account Opening Wallets</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Crypto Type</th>
                  <th style={styles.th}>Network</th>
                  <th style={styles.th}>Wallet Address</th>
                  <th style={styles.th}>Memo/Tag</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.emptyState}>
                      No account opening wallets found. Add your first wallet above.
                    </td>
                  </tr>
                ) : (
                  wallets.map(wallet => {
                    const cryptoType = wallet.crypto_assets?.crypto_type || wallet.crypto_type || 'N/A';
                    const networkType = wallet.crypto_assets?.network_type || wallet.network_type || 'N/A';
                    const symbol = wallet.crypto_assets?.symbol || '';
                    
                    return (
                      <tr key={wallet.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <select
                              value={editFormData.cryptoType}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, cryptoType: e.target.value }))}
                              style={styles.selectSmall}
                            >
                              {Object.keys(availableCryptoAssets).map(crypto => (
                                <option key={crypto} value={crypto}>{crypto}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.cryptoBadge}>{cryptoType} {symbol && `(${symbol})`}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <select
                              value={editFormData.networkType}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, networkType: e.target.value }))}
                              style={styles.selectSmall}
                            >
                              {(availableCryptoAssets[editFormData.cryptoType] || []).map(network => (
                                <option key={network} value={network}>{network}</option>
                              ))}
                            </select>
                          ) : (
                            networkType
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <input
                              type="text"
                              value={editFormData.walletAddress}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                              style={styles.inputSmall}
                            />
                          ) : (
                            <span style={styles.walletAddress}>{wallet.wallet_address}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <input
                              type="text"
                              value={editFormData.memo}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, memo: e.target.value }))}
                              style={styles.inputSmall}
                              placeholder="Optional"
                            />
                          ) : (
                            <span style={{fontSize: '12px', color: '#64748b'}}>{wallet.memo || '-'}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {new Date(wallet.created_at).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleUpdate(wallet.id)}
                                disabled={loading}
                                style={styles.saveButton}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={loading}
                                style={styles.cancelButton}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleEdit(wallet)}
                                disabled={loading}
                                style={styles.editButton}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(wallet.id)}
                                disabled={loading}
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#64748b',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fca5a5',
    borderLeft: '4px solid #dc2626',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#059669',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #6ee7b7',
    borderLeft: '4px solid #059669',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    border: '1px solid #3b82f6',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  infoText: {
    margin: 0,
    color: '#1e40af',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  formSection: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '20px',
  },
  form: {
    width: '100%',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    alignItems: 'end',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px',
  },
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
    backgroundColor: 'white',
  },
  selectSmall: {
    padding: '8px',
    fontSize: '13px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '100%',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  inputSmall: {
    padding: '8px',
    fontSize: '13px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '100%',
  },
  submitButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  disabledButton: {
    padding: '10px 24px',
    backgroundColor: '#cbd5e1',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'not-allowed',
  },
  tableSection: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#334155',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '16px',
  },
  cryptoBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#475569',
    wordBreak: 'break-all',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '6px 12px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
