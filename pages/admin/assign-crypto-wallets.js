import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';

export default function AssignCryptoWallets() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState({});
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
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

  const handleAssignWallet = async (userId, cryptoType) => {
    const walletAddress = assignments[`${userId}-${cryptoType}`];
    
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
          walletAddress: walletAddress.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign wallet');
      }

      setMessage(`✅ Wallet assigned successfully for ${cryptoType}`);
      setAssignments(prev => ({
        ...prev,
        [`${userId}-${cryptoType}`]: ''
      }));

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error assigning wallet:', error);
      setError(`Failed to assign wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (userId, cryptoType, value) => {
    setAssignments(prev => ({
      ...prev,
      [`${userId}-${cryptoType}`]: value
    }));
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
          <h1 style={styles.title}>₿ Assign Crypto Wallets</h1>
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
            <strong>Instructions:</strong> Assign or update cryptocurrency wallet addresses for users. 
            Supported currencies: BTC, USDT, ETH, BNB
          </p>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>User Email</th>
                <th style={styles.th}>User Name</th>
                <th style={styles.th}>Crypto Type</th>
                <th style={styles.th}>Wallet Address</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.emptyState}>
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const cryptoTypes = ['BTC', 'USDT', 'ETH', 'BNB'];
                  return cryptoTypes.map((cryptoType, index) => (
                    <tr key={`${user.id}-${cryptoType}`} style={styles.tableRow}>
                      {index === 0 && (
                        <>
                          <td style={{...styles.td, ...styles.verticalAlign}} rowSpan={cryptoTypes.length}>
                            {user.email || 'No email'}
                          </td>
                          <td style={{...styles.td, ...styles.verticalAlign}} rowSpan={cryptoTypes.length}>
                            {user.profiles?.first_name && user.profiles?.last_name
                              ? `${user.profiles.first_name} ${user.profiles.last_name}`
                              : 'N/A'}
                          </td>
                        </>
                      )}
                      <td style={styles.td}>
                        <span style={styles.cryptoBadge}>{cryptoType}</span>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          placeholder={`Enter ${cryptoType} wallet address`}
                          value={assignments[`${user.id}-${cryptoType}`] || ''}
                          onChange={(e) => handleInputChange(user.id, cryptoType, e.target.value)}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleAssignWallet(user.id, cryptoType)}
                          disabled={loading || !assignments[`${user.id}-${cryptoType}`]?.trim()}
                          style={
                            loading || !assignments[`${user.id}-${cryptoType}`]?.trim()
                              ? styles.disabledButton
                              : styles.assignButton
                          }
                        >
                          Assign / Update
                        </button>
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1400px',
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
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
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
  verticalAlign: {
    verticalAlign: 'top',
  },
  cryptoBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
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
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '16px',
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
