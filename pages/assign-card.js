
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

export default function AdminAssignCard() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [cardType, setCardType] = useState('debit');
  const [creditLimit, setCreditLimit] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch users, accounts, and available cards from Supabase
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch active users with their profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (usersError) throw usersError;

      // Fetch active accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch unassigned cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .is('user_id', null)
        .eq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      setUsers(usersData || []);
      setAccounts(accountsData || []);
      setCards(cardsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts based on selected user
  const getFilteredAccounts = () => {
    if (!selectedUser) return [];
    return accounts.filter(account => account.user_id === selectedUser);
  };

  // Handle card assignment
  const handleAssignCard = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedAccount || !selectedCard) {
      setError('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Update the card with user assignment
      const updateData = {
        user_id: selectedUser,
        account_id: selectedAccount,
        card_type: cardType,
        status: 'active',
        assigned_at: new Date().toISOString()
      };

      // Add credit limit for credit cards
      if (cardType === 'credit' && creditLimit) {
        updateData.credit_limit = parseFloat(creditLimit);
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', selectedCard);

      if (updateError) throw updateError;

      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'card_assignment',
          target_type: 'card',
          target_id: selectedCard,
          details: {
            user_id: selectedUser,
            account_id: selectedAccount,
            card_type: cardType,
            credit_limit: creditLimit || null
          }
        });

      setSuccess('Card assigned successfully!');
      
      // Reset form
      setSelectedUser('');
      setSelectedAccount('');
      setSelectedCard('');
      setCardType('debit');
      setCreditLimit('');
      
      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error assigning card:', error);
      setError('Failed to assign card. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle creating a new card for assignment
  const handleCreateAndAssignCard = async () => {
    if (!selectedUser || !selectedAccount) {
      setError('Please select a user and account first');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Generate card number (simplified for demo)
      const cardNumber = '4000' + Math.random().toString().slice(2, 14);
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      const cardData = {
        card_number: cardNumber,
        user_id: selectedUser,
        account_id: selectedAccount,
        card_type: cardType,
        status: 'active',
        expiry_date: expiryDate.toISOString(),
        assigned_at: new Date().toISOString()
      };

      if (cardType === 'credit' && creditLimit) {
        cardData.credit_limit = parseFloat(creditLimit);
      }

      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert(cardData)
        .select()
        .single();

      if (cardError) throw cardError;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'card_creation_and_assignment',
          target_type: 'card',
          target_id: newCard.id,
          details: cardData
        });

      setSuccess('New card created and assigned successfully!');
      
      // Reset form and refresh data
      setSelectedUser('');
      setSelectedAccount('');
      setCardType('debit');
      setCreditLimit('');
      await fetchData();

    } catch (error) {
      console.error('Error creating card:', error);
      setError('Failed to create and assign card. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>🎯 Assign Cards</h1>
            <p style={styles.subtitle}>Assign cards to customer accounts</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchData} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <div style={styles.content}>
            {/* Statistics */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3>Active Users</h3>
                <p style={styles.statNumber}>{users.length}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Active Accounts</h3>
                <p style={styles.statNumber}>{accounts.length}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Unassigned Cards</h3>
                <p style={styles.statNumber}>{cards.length}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Available for Assignment</h3>
                <p style={styles.statNumber}>{getFilteredAccounts().length}</p>
              </div>
            </div>

            <div style={styles.formsContainer}>
              {/* Assign Existing Card Form */}
              <div style={styles.formCard}>
                <h2 style={styles.formTitle}>Assign Existing Card</h2>
                <form onSubmit={handleAssignCard} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select User *</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setSelectedAccount(''); // Reset account selection
                      }}
                      style={styles.select}
                      required
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select Account *</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      style={styles.select}
                      disabled={!selectedUser}
                      required
                    >
                      <option value="">Choose an account...</option>
                      {getFilteredAccounts().map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_type} - ${account.balance?.toLocaleString() || '0.00'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Select Available Card *</label>
                    <select
                      value={selectedCard}
                      onChange={(e) => setSelectedCard(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Choose a card...</option>
                      {cards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.card_number} ({card.card_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Card Type</label>
                    <select
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value)}
                      style={styles.select}
                    >
                      <option value="debit">Debit Card</option>
                      <option value="credit">Credit Card</option>
                    </select>
                  </div>

                  {cardType === 'credit' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Credit Limit ($)</label>
                      <input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        style={styles.input}
                        placeholder="Enter credit limit..."
                        min="0"
                        step="100"
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    style={styles.submitButton}
                    disabled={processing || !selectedUser || !selectedAccount || !selectedCard}
                  >
                    {processing ? 'Assigning...' : '🎯 Assign Card'}
                  </button>
                </form>
              </div>

              {/* Create New Card Form */}
              <div style={styles.formCard}>
                <h2 style={styles.formTitle}>Create & Assign New Card</h2>
                <div style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>User</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setSelectedAccount('');
                      }}
                      style={styles.select}
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Account</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      style={styles.select}
                      disabled={!selectedUser}
                    >
                      <option value="">Choose an account...</option>
                      {getFilteredAccounts().map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_type} - ${account.balance?.toLocaleString() || '0.00'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Card Type</label>
                    <select
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value)}
                      style={styles.select}
                    >
                      <option value="debit">Debit Card</option>
                      <option value="credit">Credit Card</option>
                    </select>
                  </div>

                  {cardType === 'credit' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Credit Limit ($)</label>
                      <input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        style={styles.input}
                        placeholder="Enter credit limit..."
                        min="0"
                        step="100"
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleCreateAndAssignCard}
                    style={styles.submitButton}
                    disabled={processing || !selectedUser || !selectedAccount}
                  >
                    {processing ? 'Creating...' : '🆕 Create & Assign New Card'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  refreshButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  success: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '10px 0 0 0'
  },
  formsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px'
  },
  formCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '25px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },
  select: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  input: {
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    marginTop: '10px'
  }
};
