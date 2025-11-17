
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateTransactions() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [yearStart, setYearStart] = useState(2023);
  const [yearEnd, setYearEnd] = useState(2025);
  const [countMode, setCountMode] = useState('manual');
  const [manualCount, setManualCount] = useState(100);

  const transactionTypes = [
    { value: 'deposit', label: '💰 Deposit' },
    { value: 'withdrawal', label: '💸 Withdrawal' },
    { value: 'transfer', label: '🔄 Transfer' },
    { value: 'zelle_send', label: '📤 Zelle Send' },
    { value: 'zelle_receive', label: '📥 Zelle Receive' },
    { value: 'crypto_send', label: '₿ Crypto Send' },
    { value: 'crypto_receive', label: '₿ Crypto Receive' },
    { value: 'card_purchase', label: '💳 Card Purchase' },
    { value: 'bank_charge', label: '🏦 Bank Charge' },
    { value: 'refund', label: '↩️ Refund' },
    { value: 'reversal', label: '🔙 Reversal' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i + 5);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserAccounts(selectedUser);
    } else {
      setAccounts([]);
      setSelectedAccount('');
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/get-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch(`/api/admin/get-user-accounts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      setError('Error fetching accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTransactionType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const selectAllTypes = () => {
    setSelectedTypes(transactionTypes.map(t => t.value));
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  const handleGenerate = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }
    if (selectedTypes.length === 0) {
      setError('Please select at least one transaction type');
      return;
    }
    if (yearStart > yearEnd) {
      setError('Start year cannot be greater than end year');
      return;
    }
    if (countMode === 'manual' && (!manualCount || manualCount < 1)) {
      setError('Please enter a valid count');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/generate-fake-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: selectedUser,
          account_id: selectedAccount,
          transaction_types: selectedTypes,
          year_start: yearStart,
          year_end: yearEnd,
          count_mode: countMode,
          manual_count: countMode === 'manual' ? manualCount : null
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(
          `✅ Successfully generated ${result.total_transactions_generated} transactions!\n` +
          `📅 Date range: ${new Date(result.first_transaction_date).toLocaleDateString()} - ${new Date(result.last_transaction_date).toLocaleDateString()}`
        );
        // Reset form
        setSelectedTypes([]);
        setCountMode('manual');
        setManualCount(100);
      } else {
        setError(result.error || 'Failed to generate transactions');
      }
    } catch (err) {
      setError('Error generating transactions: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🎲 Generate Fake Transactions</h1>
            <p style={styles.subtitle}>Create realistic transaction history for testing</p>
          </div>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        <div style={styles.card}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>1️⃣ Select User</h3>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="">-- Select User --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email} - {user.profiles?.first_name} {user.profiles?.last_name}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>2️⃣ Select Account</h3>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.select}
                disabled={loading || !accounts.length}
              >
                <option value="">-- Select Account --</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type} - {account.account_number} (Balance: ${parseFloat(account.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>3️⃣ Select Transaction Types</h3>
            <div style={styles.typeButtonGroup}>
              <button onClick={selectAllTypes} style={styles.actionButton}>✓ Select All</button>
              <button onClick={clearAllTypes} style={styles.actionButton}>✕ Clear All</button>
            </div>
            <div style={styles.typeGrid}>
              {transactionTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => toggleTransactionType(type.value)}
                  style={{
                    ...styles.typeButton,
                    ...(selectedTypes.includes(type.value) ? styles.typeButtonSelected : {})
                  }}
                >
                  {type.label}
                  {selectedTypes.includes(type.value) && ' ✓'}
                </button>
              ))}
            </div>
            {selectedTypes.length > 0 && (
              <div style={styles.selectedCount}>
                {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>4️⃣ Select Year Range</h3>
            <div style={styles.yearRangeContainer}>
              <div style={styles.yearInputGroup}>
                <label style={styles.label}>Start Year:</label>
                <select
                  value={yearStart}
                  onChange={(e) => setYearStart(Number(e.target.value))}
                  style={styles.select}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <span style={styles.yearRangeSeparator}>to</span>
              <div style={styles.yearInputGroup}>
                <label style={styles.label}>End Year:</label>
                <select
                  value={yearEnd}
                  onChange={(e) => setYearEnd(Number(e.target.value))}
                  style={styles.select}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>5️⃣ Number of Transactions</h3>
            <div style={styles.countModeContainer}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="manual"
                  checked={countMode === 'manual'}
                  onChange={(e) => setCountMode(e.target.value)}
                  style={styles.radio}
                />
                <span>Manual Count</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="random"
                  checked={countMode === 'random'}
                  onChange={(e) => setCountMode(e.target.value)}
                  style={styles.radio}
                />
                <span>Random (300-900)</span>
              </label>
            </div>
            {countMode === 'manual' && (
              <input
                type="number"
                min="1"
                max="10000"
                value={manualCount}
                onChange={(e) => setManualCount(Number(e.target.value))}
                style={styles.input}
                placeholder="Enter number of transactions"
              />
            )}
          </div>

          <div style={styles.formSection}>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedUser || !selectedAccount || selectedTypes.length === 0}
              style={{
                ...styles.generateButton,
                ...(generating ? styles.generateButtonDisabled : {})
              }}
            >
              {generating ? '⏳ Generating...' : '🎲 Generate Transactions'}
            </button>
          </div>
        </div>
      </div>
      <AdminFooter />
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(12px, 3vw, 20px)',
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
    fontWeight: '500',
    whiteSpace: 'pre-line'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 30px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: 'clamp(1rem, 2.5vw, 18px)',
    fontWeight: 'bold',
    color: '#3730a3',
    marginBottom: '15px'
  },
  select: {
    width: '100%',
    padding: 'clamp(0.7rem, 2vw, 12px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    boxSizing: 'border-box',
    background: 'white',
    cursor: 'pointer'
  },
  typeButtonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: 'clamp(0.8rem, 1.8vw, 13px)',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#475569'
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
    marginBottom: '15px'
  },
  typeButton: {
    padding: '12px 16px',
    background: 'white',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#475569'
  },
  typeButtonSelected: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#667eea',
    color: 'white',
    fontWeight: '600'
  },
  selectedCount: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#667eea',
    fontWeight: '600',
    padding: '8px',
    background: '#f8fafc',
    borderRadius: '6px',
    textAlign: 'center'
  },
  yearRangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  yearInputGroup: {
    flex: 1,
    minWidth: '150px'
  },
  label: {
    display: 'block',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px'
  },
  yearRangeSeparator: {
    fontSize: 'clamp(0.9rem, 2vw, 16px)',
    fontWeight: '600',
    color: '#64748b'
  },
  countModeContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    cursor: 'pointer',
    fontWeight: '500'
  },
  radio: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: 'clamp(0.7rem, 2vw, 12px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    boxSizing: 'border-box'
  },
  generateButton: {
    width: '100%',
    padding: 'clamp(0.9rem, 2.5vw, 16px)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(1rem, 2.5vw, 18px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
  },
  generateButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  }
};
