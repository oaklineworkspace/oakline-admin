
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function ManageCryptoWallets() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [walletForm, setWalletForm] = useState({
    cryptoType: 'BTC',
    networkType: '',
    walletAddress: ''
  });
  const [existingWallets, setExistingWallets] = useState({});
  const [editingWallet, setEditingWallet] = useState(null);
  const [editForm, setEditForm] = useState({
    cryptoType: '',
    networkType: '',
    walletAddress: ''
  });

  const cryptoNetworks = {
    'BTC': ['Bitcoin Mainnet', 'BSC (BEP20)'],
    'USDT': ['BSC', 'ERC20', 'TRC20', 'SOL', 'TON'],
    'ETH': ['ERC20', 'Arbitrum', 'Base'],
    'BNB': ['BEP20'],
    'SOL': ['SOL'],
    'TON': ['TON']
  };

  useEffect(() => {
    fetchUsers();
    fetchExistingWallets();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  useEffect(() => {
    if (walletForm.cryptoType && cryptoNetworks[walletForm.cryptoType]) {
      setWalletForm(prev => ({
        ...prev,
        networkType: cryptoNetworks[walletForm.cryptoType][0] || ''
      }));
    }
  }, [walletForm.cryptoType]);

  useEffect(() => {
    if (editForm.cryptoType && cryptoNetworks[editForm.cryptoType]) {
      setEditForm(prev => ({
        ...prev,
        networkType: cryptoNetworks[editForm.cryptoType][0] || ''
      }));
    }
  }, [editForm.cryptoType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/get-users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users || []);
      setFilteredUsers(result.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingWallets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/get-user-wallets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const walletsMap = {};
        result.wallets?.forEach(wallet => {
          if (!walletsMap[wallet.user_id]) {
            walletsMap[wallet.user_id] = [];
          }
          walletsMap[wallet.user_id].push(wallet);
        });
        setExistingWallets(walletsMap);
      }
    } catch (error) {
      console.error('Error fetching existing wallets:', error);
    }
  };

  const handleAssignWallet = async (userId, userName) => {
    const { cryptoType, networkType, walletAddress } = walletForm;
    
    if (!walletAddress || !walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/assign-crypto-wallet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          cryptoType,
          networkType,
          walletAddress: walletAddress.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign wallet');
      }

      setMessage(`✅ Wallet assigned successfully to ${userName}`);
      setWalletForm({
        cryptoType: 'BTC',
        networkType: 'Bitcoin',
        walletAddress: ''
      });
      setSelectedUser(null);
      
      await fetchExistingWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error assigning wallet:', error);
      setError(`Failed to assign wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditWallet = (wallet) => {
    setEditingWallet(wallet.id);
    setEditForm({
      cryptoType: wallet.crypto_type,
      networkType: wallet.network_type,
      walletAddress: wallet.wallet_address
    });
  };

  const handleCancelEdit = () => {
    setEditingWallet(null);
    setEditForm({
      cryptoType: '',
      networkType: '',
      walletAddress: ''
    });
  };

  const handleUpdateWallet = async (wallet, userName) => {
    const { cryptoType, networkType, walletAddress } = editForm;
    
    if (!walletAddress || !walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!networkType || !cryptoNetworks[cryptoType]?.includes(networkType)) {
      setError('Invalid network type for selected crypto');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/assign-crypto-wallet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          walletId: wallet.id,
          userId: wallet.user_id,
          cryptoType,
          networkType,
          walletAddress: walletAddress.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update wallet');
      }

      setMessage(`✅ Wallet updated successfully for ${userName}`);
      setEditingWallet(null);
      setEditForm({
        cryptoType: '',
        networkType: '',
        walletAddress: ''
      });
      
      await fetchExistingWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating wallet:', error);
      setError(`Failed to update wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (walletId, userName, cryptoType) => {
    if (!confirm(`Are you sure you want to delete the ${cryptoType} wallet for ${userName}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/delete-crypto-wallet', {
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

      setMessage(`✅ Wallet deleted successfully for ${userName}`);
      await fetchExistingWallets();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting wallet:', error);
      setError(`Failed to delete wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔐 Manage Crypto Wallets</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            <strong>Instructions:</strong> Assign or edit cryptocurrency wallet addresses for users. 
            Select a user to assign a new wallet, or click "Edit" on existing wallets to update them.
          </p>
        </div>

        {/* Existing Wallets Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Existing Assigned Wallets</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>User Email</th>
                  <th style={styles.th}>User Name</th>
                  <th style={styles.th}>Crypto Type</th>
                  <th style={styles.th}>Network Type</th>
                  <th style={styles.th}>Wallet Address</th>
                  <th style={styles.th}>Assigned By</th>
                  <th style={styles.th}>Updated At</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(existingWallets).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.emptyState}>
                      No wallets assigned yet
                    </td>
                  </tr>
                ) : (
                  Object.entries(existingWallets).flatMap(([userId, wallets]) => {
                    const user = users.find(u => u.id === userId);
                    return wallets.map((wallet, idx) => (
                      <tr key={wallet.id} style={styles.tableRow}>
                        {idx === 0 && (
                          <>
                            <td style={styles.td} rowSpan={wallets.length}>
                              {user?.email || 'Unknown'}
                            </td>
                            <td style={styles.td} rowSpan={wallets.length}>
                              {user?.profiles?.first_name && user?.profiles?.last_name
                                ? `${user.profiles.first_name} ${user.profiles.last_name}`
                                : 'N/A'}
                            </td>
                          </>
                        )}
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <select
                              value={editForm.cryptoType}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                cryptoType: e.target.value 
                              }))}
                              style={styles.select}
                            >
                              {Object.keys(cryptoNetworks).map(crypto => (
                                <option key={crypto} value={crypto}>{crypto}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.cryptoBadge}>{wallet.crypto_type}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <select
                              value={editForm.networkType}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                networkType: e.target.value 
                              }))}
                              style={styles.select}
                            >
                              {cryptoNetworks[editForm.cryptoType]?.map(network => (
                                <option key={network} value={network}>{network}</option>
                              ))}
                            </select>
                          ) : (
                            wallet.network_type
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <input
                              type="text"
                              value={editForm.walletAddress}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                walletAddress: e.target.value 
                              }))}
                              style={styles.input}
                              placeholder="Enter wallet address"
                            />
                          ) : (
                            <span style={styles.walletAddress}>{wallet.wallet_address}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {wallet.assigned_by_email || 'System'}
                        </td>
                        <td style={styles.td}>
                          {new Date(wallet.updated_at || wallet.created_at).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          {editingWallet === wallet.id ? (
                            <div style={styles.editActions}>
                              <button
                                onClick={() => handleUpdateWallet(
                                  wallet,
                                  user?.profiles?.first_name 
                                    ? `${user.profiles.first_name} ${user.profiles.last_name}` 
                                    : user?.email
                                )}
                                disabled={loading || !editForm.walletAddress?.trim()}
                                style={
                                  loading || !editForm.walletAddress?.trim()
                                    ? styles.disabledButton
                                    : styles.saveButton
                                }
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={styles.cancelButton}
                                disabled={loading}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={styles.editActions}>
                              <button
                                onClick={() => handleEditWallet(wallet)}
                                style={styles.editButton}
                                disabled={loading}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWallet(
                                  wallet.id,
                                  user?.profiles?.first_name 
                                    ? `${user.profiles.first_name} ${user.profiles.last_name}` 
                                    : user?.email,
                                  wallet.crypto_type
                                )}
                                style={styles.deleteButton}
                                disabled={loading}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign New Wallets Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>➕ Assign New Wallets</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>User Email</th>
                  <th style={styles.th}>User Name</th>
                  <th style={styles.th}>Crypto Type</th>
                  <th style={styles.th}>Network Type</th>
                  <th style={styles.th}>Wallet Address</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.emptyState}>
                      {searchTerm ? 'No users found matching your search' : 'No users available'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        {user.email || 'No email'}
                        {existingWallets[user.id] && existingWallets[user.id].length > 0 && (
                          <div style={styles.existingWalletsBadge}>
                            {existingWallets[user.id].length} wallet(s) assigned
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {user.profiles?.first_name && user.profiles?.last_name
                          ? `${user.profiles.first_name} ${user.profiles.last_name}`
                          : 'N/A'}
                      </td>
                      <td style={styles.td}>
                        <select
                          value={selectedUser === user.id ? walletForm.cryptoType : 'BTC'}
                          onFocus={() => {
                            if (selectedUser !== user.id) {
                              setSelectedUser(user.id);
                              setWalletForm({
                                cryptoType: 'BTC',
                                networkType: cryptoNetworks['BTC'][0],
                                walletAddress: ''
                              });
                            }
                          }}
                          onChange={(e) => {
                            setWalletForm(prev => ({ 
                              ...prev, 
                              cryptoType: e.target.value,
                              networkType: cryptoNetworks[e.target.value][0]
                            }));
                          }}
                          style={styles.select}
                        >
                          {Object.keys(cryptoNetworks).map(crypto => (
                            <option key={crypto} value={crypto}>{crypto}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          value={selectedUser === user.id && walletForm.networkType ? walletForm.networkType : (selectedUser === user.id ? cryptoNetworks[walletForm.cryptoType][0] : '')}
                          onFocus={() => {
                            if (selectedUser !== user.id) {
                              setSelectedUser(user.id);
                              setWalletForm({
                                cryptoType: 'BTC',
                                networkType: cryptoNetworks['BTC'][0],
                                walletAddress: ''
                              });
                            }
                          }}
                          onChange={(e) => {
                            setWalletForm(prev => ({ ...prev, networkType: e.target.value }));
                          }}
                          style={styles.select}
                        >
                          {(selectedUser === user.id ? cryptoNetworks[walletForm.cryptoType] : cryptoNetworks['BTC']).map(network => (
                            <option key={network} value={network}>{network}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          placeholder="Enter wallet address"
                          value={selectedUser === user.id ? walletForm.walletAddress : ''}
                          onFocus={() => {
                            if (selectedUser !== user.id) {
                              setSelectedUser(user.id);
                              setWalletForm({
                                cryptoType: 'BTC',
                                networkType: cryptoNetworks['BTC'][0],
                                walletAddress: ''
                              });
                            }
                          }}
                          onChange={(e) => {
                            setWalletForm(prev => ({ ...prev, walletAddress: e.target.value }));
                          }}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleAssignWallet(
                            user.id, 
                            user.profiles?.first_name 
                              ? `${user.profiles.first_name} ${user.profiles.last_name}` 
                              : user.email
                          )}
                          disabled={loading || selectedUser !== user.id || !walletForm.walletAddress?.trim()}
                          style={
                            loading || selectedUser !== user.id || !walletForm.walletAddress?.trim()
                              ? styles.disabledButton
                              : styles.assignButton
                          }
                        >
                          Assign Wallet
                        </button>
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
    padding: '40px 20px',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0,
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#64748b',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  searchContainer: {
    marginBottom: '24px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '500px',
    padding: '14px 20px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    border: '1px solid #3b82f6',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  infoText: {
    margin: 0,
    color: '#1e40af',
    fontSize: '14px',
    lineHeight: '1.6',
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
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '16px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#334155',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  assignButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    marginRight: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  disabledButton: {
    padding: '10px 20px',
    backgroundColor: '#cbd5e1',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '16px',
  },
  existingWalletsBadge: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  cryptoBadge: {
    display: 'inline-block',
    padding: '6px 12px',
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
