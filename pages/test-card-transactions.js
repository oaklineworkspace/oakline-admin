
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function TestCardTransactions() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('Test Merchant');
  const [location, setLocation] = useState('Test Location');
  const [transactionType, setTransactionType] = useState('purchase');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transactionResult, setTransactionResult] = useState(null);

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchCards();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setError('');
      fetchCards();
    } else {
      setError('Invalid password');
    }
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          *,
          profiles!inner(first_name, last_name, email),
          accounts!inner(account_number, account_type, balance)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError('Failed to fetch cards');
    }
  };

  const handleProcessTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCard || !amount || parseFloat(amount) <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setTransactionResult(null);

    try {
      const response = await fetch('/api/admin/process-card-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: selectedCard,
          amount: parseFloat(amount),
          merchant,
          location,
          transactionType
        }),
      });

      const result = await response.json();
      setTransactionResult(result);

      if (result.success) {
        setMessage('✅ Transaction processed successfully!');
        
        // Refresh cards to show updated spending
        fetchCards();
        
        // Reset form
        setAmount('');
        setMerchant('Test Merchant');
        setLocation('Test Location');
      } else {
        setError(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      setError('Failed to process transaction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCardDisplay = (card) => {
    const maskedNumber = card.card_number.replace(/\d{4}-\d{4}-\d{4}-(\d{4})/, '****-****-****-$1');
    const ownerName = `${card.profiles.first_name} ${card.profiles.last_name}`;
    const accountInfo = `${card.accounts.account_type.replace(/_/g, ' ').toUpperCase()} - Balance: $${parseFloat(card.accounts.balance).toFixed(2)}`;
    
    return `${maskedNumber} - ${ownerName} - ${accountInfo}`;
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🏦 Admin Transaction Testing</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter admin password"
                required
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              🔐 Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 Test Card Transactions</h1>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {transactionResult && (
        <div style={transactionResult.success ? styles.resultSuccess : styles.resultError}>
          <h3>{transactionResult.success ? '✅ Transaction Successful' : '❌ Transaction Failed'}</h3>
          <pre style={styles.resultJson}>
            {JSON.stringify(transactionResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={styles.formContainer}>
        <form onSubmit={handleProcessTransaction} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Select Card *</label>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Choose a card</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {getCardDisplay(card)}
                </option>
              ))}
            </select>
          </div>

          {selectedCard && (
            <div style={styles.cardInfo}>
              {(() => {
                const card = cards.find(c => c.id == selectedCard);
                return card ? (
                  <div>
                    <h4>Card Details:</h4>
                    <p><strong>Daily Limit:</strong> ${parseFloat(card.daily_limit).toFixed(2)}</p>
                    <p><strong>Daily Spent:</strong> ${parseFloat(card.daily_spent).toFixed(2)}</p>
                    <p><strong>Monthly Limit:</strong> ${parseFloat(card.monthly_limit).toFixed(2)}</p>
                    <p><strong>Monthly Spent:</strong> ${parseFloat(card.monthly_spent).toFixed(2)}</p>
                    <p><strong>Status:</strong> {card.is_locked ? '🔒 Locked' : '🔓 Active'}</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
                placeholder="0.00"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Transaction Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                style={styles.select}
              >
                <option value="purchase">Purchase</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="refund">Refund</option>
                <option value="fee">Fee</option>
              </select>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              style={styles.input}
              placeholder="Merchant name"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={styles.input}
              placeholder="Transaction location"
            />
          </div>

          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading || !selectedCard || !amount}
          >
            {loading ? '🔄 Processing...' : '💳 Process Transaction'}
          </button>
        </form>
      </div>

      <div style={styles.quickTests}>
        <h3>Quick Test Scenarios</h3>
        <div style={styles.testButtons}>
          <button 
            onClick={() => {
              setAmount('10.00');
              setMerchant('Coffee Shop');
              setLocation('Downtown');
              setTransactionType('purchase');
            }}
            style={styles.testButton}
          >
            Small Purchase ($10)
          </button>
          <button 
            onClick={() => {
              setAmount('500.00');
              setMerchant('Electronics Store');
              setLocation('Mall');
              setTransactionType('purchase');
            }}
            style={styles.testButton}
          >
            Medium Purchase ($500)
          </button>
          <button 
            onClick={() => {
              setAmount('2000.00');
              setMerchant('Expensive Store');
              setLocation('Luxury District');
              setTransactionType('purchase');
            }}
            style={styles.testButton}
          >
            Daily Limit Test ($2000)
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'Arial, sans-serif'
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  loginCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e0e0e0'
  },
  title: {
    color: '#2c3e50',
    fontSize: '2rem',
    margin: 0
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  label: {
    fontWeight: 'bold',
    color: '#2c3e50',
    fontSize: '0.9rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  loginButton: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%'
  },
  success: {
    padding: '1rem',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  error: {
    padding: '1rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  cardInfo: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
    border: '1px solid #dee2e6'
  },
  resultSuccess: {
    backgroundColor: '#d4edda',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    border: '1px solid #c3e6cb'
  },
  resultError: {
    backgroundColor: '#f8d7da',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    border: '1px solid #f5c6cb'
  },
  resultJson: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    overflow: 'auto'
  },
  quickTests: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  testButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  testButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
};
