
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageCryptoAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);
  
  const [formData, setFormData] = useState({
    cryptoType: 'Bitcoin',
    symbol: 'BTC',
    networkType: 'Bitcoin',
    depositFeePercent: 0.05,
    confirmationsRequired: 3,
    minDeposit: 0.00001,
    decimals: 8,
    isStablecoin: false
  });

  const [editFormData, setEditFormData] = useState({
    cryptoType: '',
    symbol: '',
    networkType: '',
    depositFeePercent: 0,
    confirmationsRequired: 0,
    minDeposit: 0,
    decimals: 8,
    isStablecoin: false
  });

  const cryptoOptions = [
    { name: 'Bitcoin', symbol: 'BTC', decimals: 8, isStablecoin: false },
    { name: 'Ethereum', symbol: 'ETH', decimals: 18, isStablecoin: false },
    { name: 'Tether USD', symbol: 'USDT', decimals: 6, isStablecoin: true },
    { name: 'USD Coin', symbol: 'USDC', decimals: 6, isStablecoin: true },
    { name: 'BNB', symbol: 'BNB', decimals: 18, isStablecoin: false },
    { name: 'Cardano', symbol: 'ADA', decimals: 6, isStablecoin: false },
    { name: 'Solana', symbol: 'SOL', decimals: 9, isStablecoin: false },
    { name: 'Polygon', symbol: 'MATIC', decimals: 18, isStablecoin: false },
    { name: 'Avalanche', symbol: 'AVAX', decimals: 18, isStablecoin: false },
    { name: 'Litecoin', symbol: 'LTC', decimals: 8, isStablecoin: false },
    { name: 'XRP', symbol: 'XRP', decimals: 6, isStablecoin: false },
    { name: 'TON', symbol: 'TON', decimals: 9, isStablecoin: false }
  ];

  const networkOptions = [
    'Bitcoin',
    'BNB Smart Chain (BEP20)',
    'Ethereum (ERC20)',
    'Arbitrum One',
    'Optimism',
    'Base',
    'Tron (TRC20)',
    'Solana (SOL)',
    'Polygon (MATIC)',
    'Avalanche (C-Chain)',
    'Litecoin',
    'XRP Ledger',
    'The Open Network (TON)',
    'Cardano'
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    const selectedCrypto = cryptoOptions.find(c => c.name === formData.cryptoType);
    if (selectedCrypto) {
      setFormData(prev => ({
        ...prev,
        symbol: selectedCrypto.symbol,
        decimals: selectedCrypto.decimals,
        isStablecoin: selectedCrypto.isStablecoin
      }));
    }
  }, [formData.cryptoType]);

  useEffect(() => {
    const selectedCrypto = cryptoOptions.find(c => c.name === editFormData.cryptoType);
    if (selectedCrypto) {
      setEditFormData(prev => ({
        ...prev,
        symbol: selectedCrypto.symbol,
        decimals: selectedCrypto.decimals,
        isStablecoin: selectedCrypto.isStablecoin
      }));
    }
  }, [editFormData.cryptoType]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      const response = await fetch('/api/admin/get-all-crypto-assets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch assets');
      }

      setAssets(result.assets || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/manage-crypto-asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add crypto asset');
      }

      setMessage('✅ Crypto asset added successfully!');
      setFormData({
        cryptoType: 'Bitcoin',
        symbol: 'BTC',
        networkType: 'Bitcoin',
        depositFeePercent: 0.05,
        confirmationsRequired: 3,
        minDeposit: 0.00001,
        decimals: 8,
        isStablecoin: false
      });
      await fetchAssets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error adding asset:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset.id);
    setEditFormData({
      cryptoType: asset.crypto_type,
      symbol: asset.symbol,
      networkType: asset.network_type,
      depositFeePercent: parseFloat(asset.deposit_fee_percent) || 0,
      confirmationsRequired: asset.confirmations_required || 0,
      minDeposit: parseFloat(asset.min_deposit) || 0,
      decimals: asset.decimals || 8,
      isStablecoin: asset.is_stablecoin || false
    });
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setEditFormData({
      cryptoType: '',
      symbol: '',
      networkType: '',
      depositFeePercent: 0,
      confirmationsRequired: 0,
      minDeposit: 0,
      decimals: 8,
      isStablecoin: false
    });
  };

  const handleUpdate = async (assetId) => {
    setError('');
    setMessage('');

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/manage-crypto-asset', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          assetId,
          ...editFormData
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update asset');
      }

      setMessage('✅ Asset updated successfully!');
      setEditingAsset(null);
      await fetchAssets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating asset:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (assetId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/manage-crypto-asset', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          assetId,
          status: newStatus
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      setMessage(`✅ Asset ${newStatus === 'active' ? 'activated' : 'disabled'} successfully!`);
      await fetchAssets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!confirm('Are you sure you want to delete this crypto asset? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/manage-crypto-asset', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ assetId })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete asset');
      }

      setMessage('✅ Asset deleted successfully!');
      await fetchAssets();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting asset:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚙️ Manage Crypto Assets</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            <strong>Purpose:</strong> Configure supported cryptocurrencies, their networks, deposit fees, and confirmation requirements.
            Changes here will affect all crypto deposit operations across the platform.
          </p>
        </div>

        {/* Add New Asset Form */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>➕ Add New Crypto Asset</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Crypto Type</label>
                <select
                  value={formData.cryptoType}
                  onChange={(e) => setFormData(prev => ({ ...prev, cryptoType: e.target.value }))}
                  style={styles.select}
                  required
                >
                  {cryptoOptions.map(crypto => (
                    <option key={crypto.name} value={crypto.name}>{crypto.name} ({crypto.symbol})</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Network Type</label>
                <select
                  value={formData.networkType}
                  onChange={(e) => setFormData(prev => ({ ...prev, networkType: e.target.value }))}
                  style={styles.select}
                  required
                >
                  {networkOptions.map(network => (
                    <option key={network} value={network}>{network}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.depositFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositFeePercent: parseFloat(e.target.value) }))}
                  placeholder="e.g., 0.05 for 0.05%"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirmations Required</label>
                <input
                  type="number"
                  min="0"
                  value={formData.confirmationsRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmationsRequired: parseInt(e.target.value) }))}
                  placeholder="e.g., 3"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Min Deposit</label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={formData.minDeposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, minDeposit: parseFloat(e.target.value) }))}
                  placeholder="e.g., 0.00001"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <button
                  type="submit"
                  disabled={loading}
                  style={loading ? styles.disabledButton : styles.submitButton}
                >
                  {loading ? 'Adding...' : 'Add Asset'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Assets Table */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>📋 Crypto Assets Configuration</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Crypto</th>
                  <th style={styles.th}>Network</th>
                  <th style={styles.th}>Fee %</th>
                  <th style={styles.th}>Confirmations</th>
                  <th style={styles.th}>Min Deposit</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.emptyState}>
                      No crypto assets configured. Add your first asset above.
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <select
                            value={editFormData.cryptoType}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, cryptoType: e.target.value }))}
                            style={styles.selectSmall}
                          >
                            {cryptoOptions.map(crypto => (
                              <option key={crypto.name} value={crypto.name}>{crypto.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={styles.cryptoBadge}>
                            {asset.crypto_type} ({asset.symbol})
                            {asset.is_stablecoin && <span style={styles.stablecoinBadge}>💵</span>}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <select
                            value={editFormData.networkType}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, networkType: e.target.value }))}
                            style={styles.selectSmall}
                          >
                            {networkOptions.map(network => (
                              <option key={network} value={network}>{network}</option>
                            ))}
                          </select>
                        ) : (
                          asset.network_type
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFormData.depositFeePercent}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, depositFeePercent: parseFloat(e.target.value) }))}
                            style={styles.inputSmall}
                          />
                        ) : (
                          `${parseFloat(asset.deposit_fee_percent || 0).toFixed(2)}%`
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editFormData.confirmationsRequired}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, confirmationsRequired: parseInt(e.target.value) }))}
                            style={styles.inputSmall}
                          />
                        ) : (
                          asset.confirmations_required
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <input
                            type="number"
                            step="0.00000001"
                            min="0"
                            value={editFormData.minDeposit}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, minDeposit: parseFloat(e.target.value) }))}
                            style={styles.inputSmall}
                          />
                        ) : (
                          <span style={{fontSize: '12px', fontFamily: 'monospace'}}>
                            {parseFloat(asset.min_deposit || 0).toFixed(8)}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={asset.status === 'active' ? styles.statusActive : styles.statusDisabled}>
                          {asset.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {editingAsset === asset.id ? (
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => handleUpdate(asset.id)}
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
                              onClick={() => handleEdit(asset)}
                              disabled={loading}
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(asset.id, asset.status)}
                              disabled={loading}
                              style={asset.status === 'active' ? styles.disableButton : styles.enableButton}
                            >
                              {asset.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              disabled={loading}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
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
  stablecoinBadge: {
    marginLeft: '6px',
    fontSize: '12px',
  },
  statusActive: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusDisabled: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
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
  disableButton: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  enableButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
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
