
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminCrypto() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cryptoData, setCryptoData] = useState([]);
  const [userHoldings, setUserHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchCryptoData();
    } else {
      router.push('/admin/admin-dashboard');
    }
  }, []);

  const fetchCryptoData = async () => {
    setLoading(true);
    try {
      // Mock crypto data - replace with actual API calls
      setCryptoData([
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 43250.75,
          change24h: 2.45,
          change24hPercent: 5.67,
          marketCap: 847500000000,
          volume: 28500000000,
          available: true
        },
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2650.30,
          change24h: -45.20,
          change24hPercent: -1.68,
          marketCap: 318750000000,
          volume: 15200000000,
          available: true
        },
        {
          id: 'cardano',
          symbol: 'ADA',
          name: 'Cardano',
          price: 0.485,
          change24h: 0.025,
          change24hPercent: 5.43,
          marketCap: 17250000000,
          volume: 485000000,
          available: true
        }
      ]);

      setUserHoldings([
        {
          userId: 1,
          userName: 'Christopher Hite',
          email: 'chris@example.com',
          holdings: [
            { symbol: 'BTC', amount: 0.5, value: 21625.38, invested: 20000 },
            { symbol: 'ETH', amount: 2.5, value: 6625.75, invested: 6000 }
          ],
          totalValue: 28251.13,
          totalInvested: 26000,
          totalGainLoss: 2251.13
        },
        {
          userId: 2,
          userName: 'Jane Smith',
          email: 'jane@example.com',
          holdings: [
            { symbol: 'ETH', amount: 1.8, value: 4770.54, invested: 5000 },
            { symbol: 'ADA', amount: 5000, value: 2425.00, invested: 2200 }
          ],
          totalValue: 7195.54,
          totalInvested: 7200,
          totalGainLoss: -4.46
        }
      ]);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>Redirecting to admin login...</div>;
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading crypto data...</p>
      </div>
    );
  }

  const totalUserValue = userHoldings.reduce((sum, user) => sum + user.totalValue, 0);
  const totalUserInvested = userHoldings.reduce((sum, user) => sum + user.totalInvested, 0);
  const totalGainLoss = totalUserValue - totalUserInvested;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>₿ Crypto Management</h1>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>Available Assets</h3>
          <p style={styles.statNumber}>{cryptoData.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Active Users</h3>
          <p style={styles.statNumber}>{userHoldings.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Total Holdings Value</h3>
          <p style={styles.statNumber}>${totalUserValue.toLocaleString()}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Total P&L</h3>
          <p style={{
            ...styles.statNumber,
            color: totalGainLoss >= 0 ? '#28a745' : '#dc3545'
          }}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'overview' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          Market Overview
        </button>
        <button
          style={activeTab === 'holdings' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('holdings')}
        >
          User Holdings
        </button>
        <button
          style={activeTab === 'transactions' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          style={activeTab === 'settings' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Cryptocurrency Market</h2>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton}>
                🔄 Refresh Prices
              </button>
              <button style={styles.actionButton}>
                ➕ Add Cryptocurrency
              </button>
              <button style={styles.actionButton}>
                📊 Market Report
              </button>
            </div>
          </div>

          <div style={styles.cryptoTable}>
            <div style={styles.cryptoHeader}>
              <div style={styles.headerCell}>Asset</div>
              <div style={styles.headerCell}>Price</div>
              <div style={styles.headerCell}>24h Change</div>
              <div style={styles.headerCell}>Market Cap</div>
              <div style={styles.headerCell}>Volume</div>
              <div style={styles.headerCell}>Status</div>
              <div style={styles.headerCell}>Actions</div>
            </div>
            
            {cryptoData.map(crypto => (
              <div key={crypto.id} style={styles.cryptoRow}>
                <div style={styles.cryptoCell}>
                  <div style={styles.cryptoInfo}>
                    <strong>{crypto.symbol}</strong>
                    <small style={styles.cryptoName}>{crypto.name}</small>
                  </div>
                </div>
                <div style={styles.cryptoCell}>
                  ${crypto.price.toLocaleString()}
                </div>
                <div style={styles.cryptoCell}>
                  <span style={{
                    color: crypto.change24h >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: '500'
                  }}>
                    {crypto.change24h >= 0 ? '+' : ''}{crypto.change24hPercent.toFixed(2)}%
                  </span>
                </div>
                <div style={styles.cryptoCell}>
                  ${(crypto.marketCap / 1000000000).toFixed(2)}B
                </div>
                <div style={styles.cryptoCell}>
                  ${(crypto.volume / 1000000000).toFixed(2)}B
                </div>
                <div style={styles.cryptoCell}>
                  <span style={styles.statusBadge}>
                    {crypto.available ? 'Available' : 'Disabled'}
                  </span>
                </div>
                <div style={styles.cryptoCell}>
                  <div style={styles.cryptoActions}>
                    <button style={styles.cryptoActionBtn}>📊 Chart</button>
                    <button style={styles.cryptoActionBtn}>⚙️ Settings</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'holdings' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>User Holdings</h2>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton}>
                📊 Holdings Report
              </button>
              <button style={styles.actionButton}>
                💰 Manual Trade
              </button>
            </div>
          </div>

          <div style={styles.holdingsGrid}>
            {userHoldings.map(user => (
              <div key={user.userId} style={styles.holdingCard}>
                <div style={styles.holdingHeader}>
                  <div>
                    <h3 style={styles.userName}>{user.userName}</h3>
                    <p style={styles.userEmail}>{user.email}</p>
                  </div>
                  <div style={styles.totalValue}>
                    ${user.totalValue.toLocaleString()}
                  </div>
                </div>

                <div style={styles.holdingsList}>
                  {user.holdings.map((holding, index) => (
                    <div key={index} style={styles.holdingItem}>
                      <div style={styles.holdingInfo}>
                        <span style={styles.holdingSymbol}>{holding.symbol}</span>
                        <span style={styles.holdingAmount}>{holding.amount}</span>
                      </div>
                      <div style={styles.holdingValue}>
                        <span>${holding.value.toLocaleString()}</span>
                        <span style={{
                          fontSize: '12px',
                          color: holding.value >= holding.invested ? '#28a745' : '#dc3545'
                        }}>
                          {holding.value >= holding.invested ? '+' : ''}
                          ${(holding.value - holding.invested).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.holdingFooter}>
                  <div style={styles.totalStats}>
                    <span>Invested: ${user.totalInvested.toLocaleString()}</span>
                    <span style={{
                      color: user.totalGainLoss >= 0 ? '#28a745' : '#dc3545',
                      fontWeight: '500'
                    }}>
                      P&L: {user.totalGainLoss >= 0 ? '+' : ''}${user.totalGainLoss.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.holdingActions}>
                    <button style={styles.holdingActionBtn}>👁️ View</button>
                    <button style={styles.holdingActionBtn}>💰 Trade</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Crypto Transactions</h2>
          <div style={styles.transactionsList}>
            <div style={styles.transactionItem}>
              <div style={styles.transactionInfo}>
                <span style={styles.transactionType}>BUY</span>
                <span>Christopher Hite bought 0.1 BTC</span>
              </div>
              <div style={styles.transactionDetails}>
                <span>$4,325.08</span>
                <span style={styles.transactionDate}>Jan 15, 2025</span>
              </div>
            </div>
            <div style={styles.transactionItem}>
              <div style={styles.transactionInfo}>
                <span style={{...styles.transactionType, background: '#dc3545'}}>SELL</span>
                <span>Jane Smith sold 0.5 ETH</span>
              </div>
              <div style={styles.transactionDetails}>
                <span>$1,325.15</span>
                <span style={styles.transactionDate}>Jan 14, 2025</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Crypto Settings</h2>
          <div style={styles.settingsGrid}>
            <div style={styles.settingCard}>
              <h3>Trading Fees</h3>
              <p>Configure trading fees for buy/sell orders</p>
              <div style={styles.settingValue}>
                <span>Buy Fee: 0.5%</span>
                <span>Sell Fee: 0.5%</span>
              </div>
              <button style={styles.settingButton}>Update Fees</button>
            </div>
            <div style={styles.settingCard}>
              <h3>Trading Hours</h3>
              <p>Crypto trading is available 24/7</p>
              <div style={styles.settingValue}>
                <span>Status: Always Active</span>
              </div>
              <button style={styles.settingButton}>Configure</button>
            </div>
            <div style={styles.settingCard}>
              <h3>Risk Management</h3>
              <p>Set daily trading limits and risk parameters</p>
              <div style={styles.settingValue}>
                <span>Daily Limit: $50,000</span>
              </div>
              <button style={styles.settingButton}>Update Limits</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
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
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
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
    background: '#1e3c72',
    color: 'white'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  actionButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  cryptoTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  cryptoHeader: {
    display: 'grid',
    gridTemplateColumns: '150px 120px 120px 120px 120px 100px 150px',
    gap: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#495057'
  },
  headerCell: {
    padding: '5px'
  },
  cryptoRow: {
    display: 'grid',
    gridTemplateColumns: '150px 120px 120px 120px 120px 100px 150px',
    gap: '15px',
    padding: '15px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    alignItems: 'center'
  },
  cryptoCell: {
    padding: '5px',
    fontSize: '14px'
  },
  cryptoInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  cryptoName: {
    color: '#666',
    fontSize: '12px'
  },
  statusBadge: {
    background: '#28a745',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  cryptoActions: {
    display: 'flex',
    gap: '8px'
  },
  cryptoActionBtn: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#495057'
  },
  holdingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  holdingCard: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px',
    background: '#f8f9fa'
  },
  holdingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  userEmail: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  totalValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#28a745'
  },
  holdingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },
  holdingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: 'white',
    borderRadius: '6px'
  },
  holdingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  holdingSymbol: {
    fontWeight: 'bold',
    color: '#1e3c72'
  },
  holdingAmount: {
    fontSize: '14px',
    color: '#666'
  },
  holdingValue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '3px'
  },
  holdingFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #dee2e6',
    paddingTop: '15px'
  },
  totalStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px'
  },
  holdingActions: {
    display: 'flex',
    gap: '8px'
  },
  holdingActionBtn: {
    background: '#e9ecef',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#495057'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  transactionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  transactionType: {
    background: '#28a745',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  transactionDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px'
  },
  transactionDate: {
    fontSize: '12px',
    color: '#666'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  settingCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px'
  },
  settingValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    margin: '15px 0',
    fontSize: '14px',
    color: '#666'
  },
  settingButton: {
    background: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
