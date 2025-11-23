import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

// Add animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  if (!document.querySelector('#bulk-import-animations')) {
    styleSheet.id = 'bulk-import-animations';
    document.head.appendChild(styleSheet);
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'white',
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
  headerContent: {
    flex: 1
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
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  alert: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successAlert: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  section: {
    backgroundColor: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(1.1rem, 2.5vw, 20px)',
    color: '#1A3E6F',
    fontWeight: '700',
    borderBottom: '2px solid #1e40af',
    paddingBottom: '12px'
  },
  fieldGroup: {
    marginBottom: '20px'
  },
  fieldGroupLastChild: {
    marginBottom: 0
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748'
  },
  required: {
    color: '#e53e3e'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'all 0.2s'
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontFamily: 'monospace',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    resize: 'vertical',
    outline: 'none',
    transition: 'all 0.2s'
  },
  accountCheckboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    flex: 1
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#1e40af'
  },
  accountInfo: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#2d3748'
  },
  accountBalance: {
    color: '#059669',
    fontWeight: '600'
  },
  previewContainer: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '16px'
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  previewItemLast: {
    borderBottom: 'none'
  },
  previewDescription: {
    flex: 1,
    color: '#2d3748',
    minWidth: 0,
    wordBreak: 'break-word'
  },
  previewAmount: {
    marginLeft: '16px',
    fontWeight: '600',
    minWidth: '120px',
    textAlign: 'right'
  },
  creditAmount: {
    color: '#059669'
  },
  debitAmount: {
    color: '#dc2626'
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  summaryLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    color: '#718096',
    marginBottom: '8px'
  },
  summaryValue: {
    fontSize: 'clamp(1.2rem, 3vw, 20px)',
    fontWeight: '700',
    color: '#1A3E6F'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  submitButton: {
    flex: '1',
    minWidth: '200px',
    padding: 'clamp(0.75rem, 2vw, 12px) clamp(1.5rem, 4vw, 24px)',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  resetButton: {
    flex: '1',
    minWidth: '150px',
    padding: 'clamp(0.75rem, 2vw, 12px) clamp(1.5rem, 4vw, 24px)',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  loadingText: {
    color: '#718096',
    fontSize: 'clamp(0.9rem, 2vw, 14px)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096'
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '12px'
  }
};

export default function BulkImportTransactions() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [transactionText, setTransactionText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectAllAccounts, setSelectAllAccounts] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Missing authorization token');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const usersRes = await fetch('/api/admin/get-users', { headers });
      const usersData = await usersRes.json();

      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users');

      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to load users: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = async (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    setSelectedAccounts([]);
    setSelectAllAccounts(false);

    if (!userId) {
      setAccounts([]);
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Missing authorization token');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(`/api/admin/get-user-accounts?userId=${userId}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch accounts');

      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setMessage('Failed to load accounts: ' + error.message);
      setMessageType('error');
    }
  };

  const parseTransactions = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const transactions = [];

    lines.forEach(line => {
      const match = line.match(/^(.+?)\s*[—–-]\s*\$?([\d,]+(?:\.\d{2})?)\s*$/);
      if (match) {
        const description = match[1].trim();
        const amount = parseFloat(match[2].replace(/,/g, ''));

        const isCredit = /payment|payout|income|deposit|refund|interest|dividend|settlement|endorsement|sponsorship|collaboration|brand/i.test(description);

        transactions.push({
          description,
          amount,
          isCredit,
          type: isCredit ? 'credit' : 'debit'
        });
      }
    });

    setParsedTransactions(transactions);
    return transactions;
  };

  const handleTextChange = (e) => {
    setTransactionText(e.target.value);
    parseTransactions(e.target.value);
  };

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAllToggle = (e) => {
    if (e.target.checked) {
      setSelectedAccounts(accounts.map(a => a.id));
      setSelectAllAccounts(true);
    } else {
      setSelectedAccounts([]);
      setSelectAllAccounts(false);
    }
  };

  const handleImport = async () => {
    if (!selectedUser) {
      setMessage('Please select a user');
      setMessageType('error');
      return;
    }

    if (selectedAccounts.length === 0) {
      setMessage('Please select at least one account');
      setMessageType('error');
      return;
    }

    if (parsedTransactions.length === 0) {
      setMessage('No transactions to import');
      setMessageType('error');
      return;
    }

    const totalTransactions = parsedTransactions.length * selectedAccounts.length;

    setLoadingBanner({
      visible: true,
      current: 0,
      total: totalTransactions,
      action: 'Importing Transactions',
      message: 'Processing your transaction data...'
    });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessage('Authentication session expired');
        setMessageType('error');
        setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      let totalImported = 0;
      let allErrors = [];

      // Import transactions for each account sequentially
      for (let accountIdx = 0; accountIdx < selectedAccounts.length; accountIdx++) {
        const accountId = selectedAccounts[accountIdx];

        try {
          const response = await fetch('/api/admin/bulk-import-transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userId: selectedUser,
              accountId: accountId,
              transactions: parsedTransactions
            })
          });

          const result = await response.json();

          if (response.ok) {
            totalImported += result.imported;

            // Update progress banner
            const currentProgress = (accountIdx + 1) * parsedTransactions.length;
            setLoadingBanner({
              visible: true,
              current: currentProgress,
              total: totalTransactions,
              action: 'Importing Transactions',
              message: `Processing account ${accountIdx + 1} of ${selectedAccounts.length}...`
            });
          } else {
            allErrors.push(`Account ${accountIdx + 1}: ${result.error || 'Import failed'}`);
          }
        } catch (error) {
          console.error('Error importing for account:', error);
          allErrors.push(`Account ${accountIdx + 1}: ${error.message}`);
        }
      }

      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });

      if (allErrors.length === 0) {
        setMessage(`✅ Successfully imported ${totalImported} transactions across ${selectedAccounts.length} account(s)!`);
        setMessageType('success');
        setTransactionText('');
        setParsedTransactions([]);
        setSelectedUser('');
        setSelectedAccounts([]);
        setSelectAllAccounts(false);
        setTimeout(() => setMessage(''), 5000);
      } else if (totalImported > 0) {
        setMessage(`✅ Imported ${totalImported} transactions with some errors: ${allErrors.join('; ')}`);
        setMessageType('success');
      } else {
        setMessage(`❌ Failed to import: ${allErrors.join('; ')}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
      setMessage('Failed to import transactions: ' + error.message);
      setMessageType('error');
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
    }
  };

  const handleReset = () => {
    setTransactionText('');
    setParsedTransactions([]);
    setSelectedUser('');
    setSelectedAccounts([]);
    setSelectAllAccounts(false);
    setMessage('');
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading...</p>
          </div>
        </div>
      </AdminAuth>
    );
  }

  const totalCredits = parsedTransactions.filter(t => t.isCredit).reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = parsedTransactions.filter(t => !t.isCredit).reduce((sum, t) => sum + t.amount, 0);

  return (
    <AdminAuth>
      <div style={styles.container}>
        <AdminLoadingBanner
          isVisible={loadingBanner.visible}
          current={loadingBanner.current}
          total={loadingBanner.total}
          action={loadingBanner.action}
          message={loadingBanner.message}
        />

        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>📊 Bulk Import Transactions</h1>
            <p style={styles.subtitle}>Import transaction history for user accounts</p>
          </div>
          <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
            ← Dashboard
          </button>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            ...(messageType === 'success' ? styles.successAlert : styles.errorAlert)
          }}>
            {message}
            <button
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={styles.content}>
          {/* Step 1: User & Account Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Step 1: Select User & Accounts</h2>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Select User <span style={styles.required}>*</span>
              </label>
              <select
                value={selectedUser}
                onChange={handleUserChange}
                style={styles.select}
              >
                <option value="">Choose a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && accounts.length > 0 && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Select Accounts <span style={styles.required}>*</span>
                </label>
                <div style={{ marginBottom: '12px' }}>
                  <div style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={selectAllAccounts}
                      onChange={handleSelectAllToggle}
                      style={styles.checkbox}
                    />
                    <label htmlFor="selectAll" style={{ ...styles.checkboxLabel, flex: 1, margin: 0 }}>
                      <span style={{ fontWeight: '600' }}>Select All ({accounts.length} accounts)</span>
                    </label>
                  </div>
                </div>
                <div style={styles.accountCheckboxGroup}>
                  {accounts.map(account => (
                    <div key={account.id} style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id={account.id}
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => handleAccountToggle(account.id)}
                        style={styles.checkbox}
                      />
                      <label htmlFor={account.id} style={{ ...styles.checkboxLabel, margin: 0 }}>
                        <div style={styles.accountInfo}>
                          <strong>{account.account_number}</strong> - {account.account_type}
                          <div style={{ marginTop: '4px', fontSize: 'clamp(0.8rem, 2vw, 13px)', color: '#718096' }}>
                            Balance: <span style={styles.accountBalance}>${parseFloat(account.balance || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Paste Transaction Data */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Step 2: Paste Transaction Data</h2>
            <p style={{ color: '#718096', fontSize: 'clamp(0.85rem, 2vw, 14px)', marginBottom: '12px' }}>
              Format: <strong>Description — $Amount</strong> (one per line). Credits and debits are auto-detected.
            </p>
            <textarea
              value={transactionText}
              onChange={handleTextChange}
              placeholder="Example:&#10;Payment for feature film — $150,000&#10;Luxury jewelry purchase — $12,000&#10;Fashion stylist fees — $7,000"
              style={styles.textarea}
            />
          </div>

          {/* Step 3: Preview & Summary */}
          {parsedTransactions.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 3: Review & Import</h2>

              {/* Summary Cards */}
              <div style={styles.summary}>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Total Transactions</div>
                  <div style={styles.summaryValue}>{parsedTransactions.length}</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Total Credits</div>
                  <div style={{ ...styles.summaryValue, color: '#059669' }}>+${totalCredits.toFixed(2)}</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Total Debits</div>
                  <div style={{ ...styles.summaryValue, color: '#dc2626' }}>-${totalDebits.toFixed(2)}</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Net Change</div>
                  <div style={{
                    ...styles.summaryValue,
                    color: (totalCredits - totalDebits) >= 0 ? '#059669' : '#dc2626'
                  }}>
                    {(totalCredits - totalDebits) >= 0 ? '+' : '-'}${Math.abs(totalCredits - totalDebits).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Transaction Preview */}
              <label style={styles.label}>Transaction Preview</label>
              <div style={styles.previewContainer}>
                {parsedTransactions.map((tx, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.previewItem,
                      ...(idx === parsedTransactions.length - 1 ? styles.previewItemLast : {})
                    }}
                  >
                    <span style={styles.previewDescription}>{idx + 1}. {tx.description}</span>
                    <span
                      style={{
                        ...styles.previewAmount,
                        ...(tx.isCredit ? styles.creditAmount : styles.debitAmount)
                      }}
                    >
                      {tx.isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ ...styles.buttonGroup, marginTop: '20px' }}>
                <button
                  onClick={handleImport}
                  disabled={selectedAccounts.length === 0}
                  style={{
                    ...styles.submitButton,
                    ...(selectedAccounts.length === 0 ? styles.submitButtonDisabled : {})
                  }}
                >
                  ✅ Import {selectedAccounts.length > 0 ? selectedAccounts.length : '0'} Account{selectedAccounts.length !== 1 ? 's' : ''}
                </button>
                <button onClick={handleReset} style={styles.resetButton}>
                  🔄 Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}
