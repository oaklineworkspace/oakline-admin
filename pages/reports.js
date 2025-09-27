
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

export default function AdminReports() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    users: [],
    accounts: [],
    transactions: [],
    cards: []
  });
  const [activeReport, setActiveReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const router = useRouter();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch users data from applications table
      const { data: usersData, error: usersError } = await supabase
        .from('applications')
        .select('*')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch accounts data
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch transactions data
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch cards data
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      setReportData({
        users: usersData || [],
        accounts: accountsData || [],
        transactions: transactionsData || [],
        cards: cardsData || []
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const generateCSVReport = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data available for export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => 
        typeof row[header] === 'string' && row[header].includes(',') 
          ? `"${row[header]}"` 
          : row[header]
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateStats = () => {
    const totalBalance = reportData.accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
    const totalTransactionVolume = reportData.transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
    const activeCards = reportData.cards.filter(card => card.status === 'active').length;

    return {
      totalUsers: reportData.users.length,
      totalAccounts: reportData.accounts.length,
      totalBalance,
      totalTransactions: reportData.transactions.length,
      totalTransactionVolume,
      totalCards: reportData.cards.length,
      activeCards
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <AdminRoute>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading report data...</p>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>📊 Reports & Analytics</h1>
            <p style={styles.subtitle}>Generate comprehensive reports and analytics</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Date Range Selector */}
        <div style={styles.dateRangeContainer}>
          <div style={styles.dateInputGroup}>
            <label style={styles.label}>Start Date:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.dateInputGroup}>
            <label style={styles.label}>End Date:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              style={styles.dateInput}
            />
          </div>
          <button onClick={fetchReportData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {/* Statistics Overview */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total Users</h3>
            <p style={styles.statNumber}>{stats.totalUsers}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Accounts</h3>
            <p style={styles.statNumber}>{stats.totalAccounts}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Balance</h3>
            <p style={styles.statNumber}>${stats.totalBalance.toLocaleString()}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Transactions</h3>
            <p style={styles.statNumber}>{stats.totalTransactions}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Transaction Volume</h3>
            <p style={styles.statNumber}>${stats.totalTransactionVolume.toLocaleString()}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Active Cards</h3>
            <p style={styles.statNumber}>{stats.activeCards}/{stats.totalCards}</p>
          </div>
        </div>

        {/* Report Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeReport === 'overview' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveReport('overview')}
          >
            Overview
          </button>
          <button
            style={activeReport === 'users' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveReport('users')}
          >
            Users Report
          </button>
          <button
            style={activeReport === 'financial' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveReport('financial')}
          >
            Financial Report
          </button>
          <button
            style={activeReport === 'cards' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveReport('cards')}
          >
            Cards Report
          </button>
        </div>

        {/* Report Content */}
        <div style={styles.reportContent}>
          {activeReport === 'overview' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2>System Overview</h2>
                <div style={styles.exportButtons}>
                  <button 
                    onClick={() => generateCSVReport([stats], 'overview_stats')}
                    style={styles.exportButton}
                  >
                    📊 Export Overview
                  </button>
                </div>
              </div>
              <div style={styles.overviewGrid}>
                <div style={styles.overviewCard}>
                  <h3>User Growth</h3>
                  <p>New users in selected period: <strong>{stats.totalUsers}</strong></p>
                  <p>Total active accounts: <strong>{stats.totalAccounts}</strong></p>
                </div>
                <div style={styles.overviewCard}>
                  <h3>Financial Health</h3>
                  <p>Total deposits: <strong>${stats.totalBalance.toLocaleString()}</strong></p>
                  <p>Transaction activity: <strong>{stats.totalTransactions} transactions</strong></p>
                </div>
                <div style={styles.overviewCard}>
                  <h3>Card Usage</h3>
                  <p>Cards issued: <strong>{stats.totalCards}</strong></p>
                  <p>Active cards: <strong>{stats.activeCards}</strong></p>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'users' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2>Users Report ({reportData.users.length} records)</h2>
                <div style={styles.exportButtons}>
                  <button 
                    onClick={() => generateCSVReport(reportData.users, 'users_report')}
                    style={styles.exportButton}
                  >
                    📊 Export Users
                  </button>
                </div>
              </div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Country</th>
                      <th>Phone</th>
                      <th>Registration Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.users.slice(0, 100).map((user) => (
                      <tr key={user.id}>
                        <td>{user.first_name} {user.last_name}</td>
                        <td>{user.email}</td>
                        <td>{user.country}</td>
                        <td>{user.phone}</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.users.length > 100 && (
                  <p style={styles.tableNote}>Showing first 100 records. Export CSV for complete data.</p>
                )}
              </div>
            </div>
          )}

          {activeReport === 'financial' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2>Financial Report</h2>
                <div style={styles.exportButtons}>
                  <button 
                    onClick={() => generateCSVReport(reportData.accounts, 'accounts_report')}
                    style={styles.exportButton}
                  >
                    📊 Export Accounts
                  </button>
                  <button 
                    onClick={() => generateCSVReport(reportData.transactions, 'transactions_report')}
                    style={styles.exportButton}
                  >
                    📊 Export Transactions
                  </button>
                </div>
              </div>
              
              <h3>Account Balances</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Account Number</th>
                      <th>Account Type</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.accounts.slice(0, 50).map((account) => (
                      <tr key={account.id}>
                        <td>{account.account_number}</td>
                        <td>{account.account_type}</td>
                        <td>${parseFloat(account.balance || 0).toFixed(2)}</td>
                        <td>{account.status}</td>
                        <td>{new Date(account.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Recent Transactions</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.transactions.slice(0, 50).map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.id.slice(0, 8)}...</td>
                        <td>{transaction.type}</td>
                        <td>${parseFloat(transaction.amount || 0).toFixed(2)}</td>
                        <td>{transaction.description}</td>
                        <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReport === 'cards' && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2>Cards Report ({reportData.cards.length} records)</h2>
                <div style={styles.exportButtons}>
                  <button 
                    onClick={() => generateCSVReport(reportData.cards, 'cards_report')}
                    style={styles.exportButton}
                  >
                    📊 Export Cards
                  </button>
                </div>
              </div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Card Number</th>
                      <th>Cardholder</th>
                      <th>Status</th>
                      <th>Daily Limit</th>
                      <th>Monthly Limit</th>
                      <th>Issued Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.cards.slice(0, 50).map((card) => (
                      <tr key={card.id}>
                        <td>****-****-****-{card.card_number.slice(-4)}</td>
                        <td>{card.cardholder_name}</td>
                        <td>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: card.status === 'active' ? '#10b981' : '#ef4444'
                          }}>
                            {card.status}
                          </span>
                        </td>
                        <td>${parseFloat(card.daily_limit || 0).toFixed(2)}</td>
                        <td>${parseFloat(card.monthly_limit || 0).toFixed(2)}</td>
                        <td>{new Date(card.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
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
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #fecaca'
  },
  dateRangeContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'end',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  refreshButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    margin: '10px 0 0 0'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: '#1e3a8a',
    color: 'white'
  },
  reportContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '30px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  exportButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  exportButton: {
    background: '#059669',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  overviewCard: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableNote: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '10px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  }
};
