
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminInvestments() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolios');
  const router = useRouter();

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchInvestmentData();
    } else {
      router.push('/admin/admin-dashboard');
    }
  }, []);

  const fetchInvestmentData = async () => {
    setLoading(true);
    try {
      // Mock investment data - replace with actual API calls
      setPortfolios([
        {
          id: 1,
          clientName: 'Christopher Hite',
          email: 'chris@example.com',
          totalValue: 125000,
          totalInvested: 100000,
          gainLoss: 25000,
          gainLossPercent: 25,
          riskProfile: 'Moderate',
          lastActivity: '2025-01-15'
        },
        {
          id: 2,
          clientName: 'Jane Smith',
          email: 'jane@example.com',
          totalValue: 85000,
          totalInvested: 80000,
          gainLoss: 5000,
          gainLossPercent: 6.25,
          riskProfile: 'Conservative',
          lastActivity: '2025-01-14'
        }
      ]);

      setInvestments([
        {
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'Stock',
          price: 192.53,
          change: 2.15,
          changePercent: 1.13,
          volume: 45000000
        },
        {
          id: 2,
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          type: 'Stock',
          price: 410.22,
          change: -1.85,
          changePercent: -0.45,
          volume: 32000000
        },
        {
          id: 3,
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          type: 'ETF',
          price: 485.75,
          change: 3.22,
          changePercent: 0.67,
          volume: 78000000
        }
      ]);
    } catch (error) {
      console.error('Error fetching investment data:', error);
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
        <p>Loading investment data...</p>
      </div>
    );
  }

  const totalAUM = portfolios.reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
  const totalGainLoss = portfolios.reduce((sum, portfolio) => sum + portfolio.gainLoss, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📈 Investment Management</h1>
        <Link href="/admin/admin-dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>Total AUM</h3>
          <p style={styles.statNumber}>${totalAUM.toLocaleString()}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Active Portfolios</h3>
          <p style={styles.statNumber}>{portfolios.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Total Gain/Loss</h3>
          <p style={{...styles.statNumber, color: totalGainLoss >= 0 ? '#28a745' : '#dc3545'}}>
            ${totalGainLoss.toLocaleString()}
          </p>
        </div>
        <div style={styles.statCard}>
          <h3>Available Assets</h3>
          <p style={styles.statNumber}>{investments.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'portfolios' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('portfolios')}
        >
          Client Portfolios
        </button>
        <button
          style={activeTab === 'assets' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('assets')}
        >
          Available Assets
        </button>
        <button
          style={activeTab === 'reports' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('reports')}
        >
          Performance Reports
        </button>
      </div>

      {activeTab === 'portfolios' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Client Portfolios</h2>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton}>
                ➕ New Portfolio
              </button>
              <button style={styles.actionButton}>
                📊 Generate Report
              </button>
              <button style={styles.actionButton}>
                📧 Send Updates
              </button>
            </div>
          </div>

          <div style={styles.portfolioGrid}>
            {portfolios.map(portfolio => (
              <div key={portfolio.id} style={styles.portfolioCard}>
                <div style={styles.portfolioHeader}>
                  <div>
                    <h3 style={styles.clientName}>{portfolio.clientName}</h3>
                    <p style={styles.clientEmail}>{portfolio.email}</p>
                  </div>
                  <div style={styles.riskBadge}>
                    {portfolio.riskProfile}
                  </div>
                </div>

                <div style={styles.portfolioStats}>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Total Value</span>
                    <span style={styles.statValue}>${portfolio.totalValue.toLocaleString()}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Invested</span>
                    <span style={styles.statValue}>${portfolio.totalInvested.toLocaleString()}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>Gain/Loss</span>
                    <span style={{
                      ...styles.statValue,
                      color: portfolio.gainLoss >= 0 ? '#28a745' : '#dc3545'
                    }}>
                      ${portfolio.gainLoss.toLocaleString()} ({portfolio.gainLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div style={styles.portfolioFooter}>
                  <span style={styles.lastActivity}>
                    Last activity: {portfolio.lastActivity}
                  </span>
                  <div style={styles.portfolioActions}>
                    <button style={styles.portfolioActionBtn}>👁️ View</button>
                    <button style={styles.portfolioActionBtn}>✏️ Edit</button>
                    <button style={styles.portfolioActionBtn}>📊 Report</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Available Investment Assets</h2>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton}>
                ➕ Add Asset
              </button>
              <button style={styles.actionButton}>
                🔄 Refresh Prices
              </button>
            </div>
          </div>

          <div style={styles.assetsTable}>
            <div style={styles.assetsHeader}>
              <div style={styles.headerCell}>Symbol</div>
              <div style={styles.headerCell}>Name</div>
              <div style={styles.headerCell}>Type</div>
              <div style={styles.headerCell}>Price</div>
              <div style={styles.headerCell}>Change</div>
              <div style={styles.headerCell}>Volume</div>
              <div style={styles.headerCell}>Actions</div>
            </div>
            
            {investments.map(asset => (
              <div key={asset.id} style={styles.assetRow}>
                <div style={styles.assetCell}>
                  <strong>{asset.symbol}</strong>
                </div>
                <div style={styles.assetCell}>{asset.name}</div>
                <div style={styles.assetCell}>
                  <span style={styles.assetType}>{asset.type}</span>
                </div>
                <div style={styles.assetCell}>${asset.price.toFixed(2)}</div>
                <div style={styles.assetCell}>
                  <span style={{
                    color: asset.change >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: '500'
                  }}>
                    {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)} ({asset.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <div style={styles.assetCell}>{asset.volume.toLocaleString()}</div>
                <div style={styles.assetCell}>
                  <div style={styles.assetActions}>
                    <button style={styles.assetActionBtn}>📊 Chart</button>
                    <button style={styles.assetActionBtn}>ℹ️ Info</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Performance Reports</h2>
          <div style={styles.reportsGrid}>
            <div style={styles.reportCard}>
              <h3>📈 Monthly Performance</h3>
              <p>Portfolio performance for the past month</p>
              <button style={styles.reportButton}>Generate Report</button>
            </div>
            <div style={styles.reportCard}>
              <h3>📊 Asset Allocation</h3>
              <p>Current asset allocation across all portfolios</p>
              <button style={styles.reportButton}>Generate Report</button>
            </div>
            <div style={styles.reportCard}>
              <h3>💰 Fee Analysis</h3>
              <p>Fee breakdown and analysis report</p>
              <button style={styles.reportButton}>Generate Report</button>
            </div>
            <div style={styles.reportCard}>
              <h3>🎯 Risk Assessment</h3>
              <p>Risk analysis for all client portfolios</p>
              <button style={styles.reportButton}>Generate Report</button>
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
  portfolioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  portfolioCard: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px',
    background: '#f8f9fa'
  },
  portfolioHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  clientName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  clientEmail: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  riskBadge: {
    background: '#17a2b8',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  portfolioStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    color: '#666',
    fontSize: '14px'
  },
  statValue: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#1e3c72'
  },
  portfolioFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #dee2e6',
    paddingTop: '15px'
  },
  lastActivity: {
    fontSize: '12px',
    color: '#666'
  },
  portfolioActions: {
    display: 'flex',
    gap: '8px'
  },
  portfolioActionBtn: {
    background: '#e9ecef',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#495057'
  },
  assetsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  assetsHeader: {
    display: 'grid',
    gridTemplateColumns: '80px 250px 80px 100px 120px 120px 150px',
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
  assetRow: {
    display: 'grid',
    gridTemplateColumns: '80px 250px 80px 100px 120px 120px 150px',
    gap: '15px',
    padding: '15px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    alignItems: 'center'
  },
  assetCell: {
    padding: '5px',
    fontSize: '14px'
  },
  assetType: {
    background: '#007bff',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  assetActions: {
    display: 'flex',
    gap: '8px'
  },
  assetActionBtn: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#495057'
  },
  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  reportCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  },
  reportButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '15px'
  }
};
