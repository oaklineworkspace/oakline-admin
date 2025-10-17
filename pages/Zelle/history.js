
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleHistory() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, send, request
  const [sortOrder, setSortOrder] = useState('desc'); // desc, asc
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      await fetchTransactions(session.user.id);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('zelle_transactions')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#059669';
      case 'pending': return '#d97706';
      case 'failed': return '#dc2626';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getTransactionIcon = (type, status) => {
    if (type === 'send') {
      return status === 'completed' ? '✅' : '💸';
    } else {
      return status === 'completed' ? '💰' : '📥';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.transaction_type === filter;
  });

  const handleSortChange = (newOrder) => {
    setSortOrder(newOrder);
    if (user) {
      fetchTransactions(user.id);
    }
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Transaction History...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to view Zelle history</p>
          <Link href="/login" style={styles.loginButton}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Transaction History - Zelle - Oakline Bank</title>
        <meta name="description" content="View your Zelle transaction history" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <Link href="/zelle" style={styles.backButton}>← Back to Zelle</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Transaction History</h1>
                <p style={styles.subtitle}>Your Zelle® activity</p>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div style={styles.controlsSection}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Show:</label>
              <select
                style={styles.filterSelect}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="send">Sent Money</option>
                <option value="request">Requested Money</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Sort:</label>
              <select
                style={styles.filterSelect}
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {transactions.filter(t => t.transaction_type === 'send' && t.status === 'completed').length}
              </div>
              <div style={styles.statLabel}>Money Sent</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {transactions.filter(t => t.transaction_type === 'request' && t.status === 'completed').length}
              </div>
              <div style={styles.statLabel}>Money Received</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {transactions.filter(t => t.status === 'pending').length}
              </div>
              <div style={styles.statLabel}>Pending</div>
            </div>
          </div>

          {/* Transaction List */}
          <div style={styles.transactionsSection}>
            {loading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📱</div>
                <h3>No Transactions Found</h3>
                <p style={styles.emptyText}>
                  {filter === 'all' 
                    ? "You haven't made any Zelle transactions yet" 
                    : `No ${filter} transactions found`
                  }
                </p>
                <div style={styles.emptyActions}>
                  <Link href="/zelle/send" style={styles.emptyButton}>Send Money</Link>
                  <Link href="/zelle/request" style={styles.emptyButton}>Request Money</Link>
                </div>
              </div>
            ) : (
              <div style={styles.transactionsList}>
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} style={styles.transactionItem}>
                    <div style={styles.transactionIcon}>
                      {getTransactionIcon(transaction.transaction_type, transaction.status)}
                    </div>
                    
                    <div style={styles.transactionDetails}>
                      <div style={styles.transactionTitle}>
                        {transaction.transaction_type === 'send' ? 'Sent to' : 'Requested from'} {transaction.recipient_contact}
                      </div>
                      <div style={styles.transactionMemo}>
                        {transaction.memo || 'No memo'}
                      </div>
                      <div style={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>

                    <div style={styles.transactionAmount}>
                      <div style={{
                        ...styles.transactionAmountText,
                        color: transaction.transaction_type === 'send' ? '#dc2626' : '#059669'
                      }}>
                        {transaction.transaction_type === 'send' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <div style={{
                        ...styles.transactionStatus,
                        color: getStatusColor(transaction.status)
                      }}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </div>
                      {transaction.reference_number && (
                        <div style={styles.referenceNumber}>
                          {transaction.reference_number}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <Link href="/zelle/send" style={styles.actionButton}>
              <span style={styles.actionIcon}>💸</span>
              Send Money
            </Link>
            <Link href="/zelle/request" style={styles.actionButton}>
              <span style={styles.actionIcon}>💰</span>
              Request Money
            </Link>
            <Link href="/zelle-settings" style={styles.actionButton}>
              <span style={styles.actionIcon}>⚙️</span>
              Settings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)',
    borderBottom: '3px solid #059669'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  content: {
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  controlsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filterLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  filterSelect: {
    padding: '0.625rem 0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.95rem',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease'
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '500'
  },
  transactionsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
    marginBottom: '0.5rem'
  },
  transactionIcon: {
    fontSize: '1.5rem',
    minWidth: '2rem'
  },
  transactionDetails: {
    flex: 1
  },
  transactionTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  transactionMemo: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  transactionDate: {
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  transactionAmount: {
    textAlign: 'right'
  },
  transactionAmountText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  transactionStatus: {
    fontSize: '0.7rem',
    textTransform: 'capitalize',
    marginBottom: '0.25rem'
  },
  referenceNumber: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  emptyText: {
    marginBottom: '1.5rem'
  },
  emptyActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  emptyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#1e293b',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0'
  },
  actionIcon: {
    fontSize: '1.2rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  loadingState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
