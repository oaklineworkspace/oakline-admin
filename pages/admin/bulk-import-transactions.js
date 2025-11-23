import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminAuth from '../../components/AdminAuth';
import { supabase } from '../../lib/supabaseClient';
import { adminPageStyles } from '../../lib/adminPageStyles';

const styles = {
  ...adminPageStyles,
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: 'monospace',
    border: '1px solid #cbd5e0',
    borderRadius: '8px',
    resize: 'vertical'
  },
  previewContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  creditAmount: {
    color: '#059669',
    fontWeight: '600'
  },
  debitAmount: {
    color: '#dc2626',
    fontWeight: '600'
  }
};

export default function BulkImportTransactions() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [transactionText, setTransactionText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectAllAccounts, setSelectAllAccounts] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      setMessage('❌ Failed to load data: ' + error.message);
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
      setMessage('❌ Failed to load accounts: ' + error.message);
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
      setMessage('❌ Please select a user');
      return;
    }

    if (selectedAccounts.length === 0) {
      setMessage('❌ Please select at least one account');
      return;
    }

    if (parsedTransactions.length === 0) {
      setMessage('❌ No transactions to import');
      return;
    }

    setImporting(true);
    setMessage('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setMessage('❌ Authentication session expired');
        setImporting(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch('/api/admin/bulk-import-transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUser,
          accountIds: selectedAccounts,
          transactions: parsedTransactions
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully imported ${result.imported} transactions!`);
        setTransactionText('');
        setParsedTransactions([]);
        setSelectedUser('');
        setSelectedAccounts([]);
        setSelectAllAccounts(false);
      } else {
        setMessage(`❌ ${result.error || 'Import failed'}`);
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
      setMessage('❌ Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Bulk Import Transactions</h1>
            <p style={styles.subtitle}>Import pre-made transaction history for users</p>
          </div>
          <button onClick={() => router.push('/admin/admin-dashboard')} style={styles.backButton}>
            ← Dashboard
          </button>
        </div>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: message.includes('✅') ? '#059669' : '#dc2626'
          }}>
            {message}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Step 1: Select User & Accounts</h2>
            
            <div style={styles.field}>
              <label style={styles.label}>Select User *</label>
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
              <div style={styles.field}>
                <label style={styles.label}>Select Accounts *</label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectAllAccounts}
                    onChange={handleSelectAllToggle}
                  />
                  <label htmlFor="selectAll" style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    Select All ({accounts.length})
                  </label>
                </div>
                {accounts.map(account => (
                  <div key={account.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      id={account.id}
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleAccountToggle(account.id)}
                    />
                    <label htmlFor={account.id} style={{ marginLeft: '8px', cursor: 'pointer' }}>
                      {account.account_number} - {account.account_type} (Balance: ${parseFloat(account.balance || 0).toFixed(2)})
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Step 2: Paste Transaction Data</h2>
            <p style={{ color: '#718096', fontSize: '14px', marginBottom: '12px' }}>
              Format: Description — $Amount (one per line)
            </p>
            <textarea
              value={transactionText}
              onChange={handleTextChange}
              placeholder="Example:&#10;Payment for feature film — $150,000&#10;Luxury jewelry purchase — $12,000&#10;Fashion stylist fees — $7,000"
              style={styles.textarea}
            />
          </div>

          {parsedTransactions.length > 0 && (
            <div style={styles.formSection}>
              <h2 style={styles.sectionTitle}>Step 3: Preview ({parsedTransactions.length} transactions)</h2>
              <div style={styles.previewContainer}>
                {parsedTransactions.map((tx, idx) => (
                  <div key={idx} style={styles.previewItem}>
                    <span>{tx.description}</span>
                    <span style={tx.isCredit ? styles.creditAmount : styles.debitAmount}>
                      {tx.isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedAccounts.length === 0}
                  style={{
                    ...styles.button,
                    opacity: importing || selectedAccounts.length === 0 ? 0.6 : 1,
                    cursor: importing || selectedAccounts.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {importing ? '⏳ Importing...' : '✅ Import Transactions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}
