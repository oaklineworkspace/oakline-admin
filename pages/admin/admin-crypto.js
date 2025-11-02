
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function AdminCrypto() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [cryptoStats, setCryptoStats] = useState({
    totalWallets: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    totalValue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const router = useRouter();

  const cryptoTypes = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      networks: [
        { name: 'Bitcoin Mainnet', confirmations: 1, minDeposit: '0.0001 BTC' },
        { name: 'BSC (BEP20)', confirmations: 60, minDeposit: '0.0001 BTC' }
      ],
      color: '#F7931A'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      networks: [
        { name: 'BSC', confirmations: 60, minDeposit: '10 USDT' },
        { name: 'ERC20', confirmations: 12, minDeposit: '10 USDT' },
        { name: 'TRC20', confirmations: 19, minDeposit: '10 USDT' },
        { name: 'SOL', confirmations: 32, minDeposit: '10 USDT' },
        { name: 'TON', confirmations: 10, minDeposit: '10 USDT' }
      ],
      color: '#26A17B'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      networks: [
        { name: 'ERC20', confirmations: 12, minDeposit: '0.001 ETH' },
        { name: 'Arbitrum', confirmations: 12, minDeposit: '0.001 ETH' },
        { name: 'Base', confirmations: 12, minDeposit: '0.001 ETH' }
      ],
      color: '#627EEA'
    },
    {
      symbol: 'BNB',
      name: 'Binance Coin',
      networks: [
        { name: 'BEP20', confirmations: 60, minDeposit: '0.01 BNB' }
      ],
      color: '#F3BA2F'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      networks: [
        { name: 'SOL', confirmations: 32, minDeposit: '0.01 SOL' }
      ],
      color: '#14F195'
    },
    {
      symbol: 'TON',
      name: 'Toncoin',
      networks: [
        { name: 'TON', confirmations: 10, minDeposit: '1 TON' }
      ],
      color: '#0088CC'
    }
  ];

  useEffect(() => {
    fetchCryptoStats();
    fetchRecentActivity();
  }, []);

  const fetchCryptoStats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch wallet stats
      const walletsResponse = await fetch('/api/admin/get-user-wallets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const walletsData = await walletsResponse.json();

      // Fetch deposit stats
      const depositsResponse = await fetch('/api/admin/get-crypto-deposits', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const depositsData = await depositsResponse.json();

      setCryptoStats({
        totalWallets: walletsData.wallets?.length || 0,
        totalDeposits: depositsData.deposits?.length || 0,
        pendingDeposits: depositsData.deposits?.filter(d => d.status === 'pending').length || 0,
        totalValue: depositsData.deposits?.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0
      });
    } catch (error) {
      console.error('Error fetching crypto stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/get-crypto-deposits', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      
      setRecentActivity((data.deposits || []).slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  if (loading && activeTab === 'overview') {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading crypto data...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>₿ Crypto Management Center</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🔑</div>
            <div style={styles.statContent}>
              <h3 style={styles.statLabel}>Assigned Wallets</h3>
              <p style={styles.statNumber}>{cryptoStats.totalWallets}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statContent}>
              <h3 style={styles.statLabel}>Total Deposits</h3>
              <p style={styles.statNumber}>{cryptoStats.totalDeposits}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏳</div>
            <div style={styles.statContent}>
              <h3 style={styles.statLabel}>Pending Deposits</h3>
              <p style={styles.statNumber}>{cryptoStats.pendingDeposits}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statContent}>
              <h3 style={styles.statLabel}>Active Networks</h3>
              <p style={styles.statNumber}>{cryptoTypes.length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'overview' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('overview')}
          >
            📋 Overview
          </button>
          <button
            style={activeTab === 'networks' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('networks')}
          >
            🌐 Supported Networks
          </button>
          <button
            style={activeTab === 'activity' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('activity')}
          >
            📈 Recent Activity
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.actionGrid}>
              <Link href="/admin/manage-crypto-wallets" style={styles.actionCard}>
                <div style={styles.actionIcon}>🔑</div>
                <h3 style={styles.actionTitle}>Manage Wallets</h3>
                <p style={styles.actionDescription}>Assign and edit crypto wallet addresses for users</p>
                <div style={styles.actionArrow}>→</div>
              </Link>

              <Link href="/admin/manage-crypto-deposits" style={styles.actionCard}>
                <div style={styles.actionIcon}>💰</div>
                <h3 style={styles.actionTitle}>Manage Deposits</h3>
                <p style={styles.actionDescription}>Review and approve pending crypto deposits</p>
                <div style={styles.actionArrow}>→</div>
              </Link>

              <div style={styles.actionCard}>
                <div style={styles.actionIcon}>📊</div>
                <h3 style={styles.actionTitle}>Crypto Reports</h3>
                <p style={styles.actionDescription}>View detailed analytics and transaction history</p>
                <div style={styles.actionArrow}>→</div>
              </div>

              <div style={styles.actionCard}>
                <div style={styles.actionIcon}>⚙️</div>
                <h3 style={styles.actionTitle}>Settings</h3>
                <p style={styles.actionDescription}>Configure crypto network parameters and fees</p>
                <div style={styles.actionArrow}>→</div>
              </div>
            </div>
          </div>
        )}

        {/* Supported Networks Tab */}
        {activeTab === 'networks' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Supported Cryptocurrencies & Networks</h2>
            <div style={styles.cryptoGrid}>
              {cryptoTypes.map(crypto => (
                <div key={crypto.symbol} style={styles.cryptoCard}>
                  <div style={styles.cryptoHeader}>
                    <div style={{...styles.cryptoIcon, backgroundColor: crypto.color}}>
                      {crypto.symbol}
                    </div>
                    <div style={styles.cryptoInfo}>
                      <h3 style={styles.cryptoName}>{crypto.name}</h3>
                      <p style={styles.cryptoSymbol}>{crypto.symbol}</p>
                    </div>
                  </div>
                  
                  <div style={styles.networkList}>
                    <h4 style={styles.networkListTitle}>Available Networks:</h4>
                    {crypto.networks.map((network, idx) => (
                      <div key={idx} style={styles.networkItem}>
                        <div style={styles.networkName}>
                          <span style={styles.networkBadge}>🌐</span>
                          {network.name}
                        </div>
                        <div style={styles.networkDetails}>
                          <span style={styles.networkDetail}>
                            ✓ {network.confirmations} confirmations
                          </span>
                          <span style={styles.networkDetail}>
                            💵 Min: {network.minDeposit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Crypto Activity</h2>
            {recentActivity.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📭</div>
                <p style={styles.emptyText}>No recent crypto activity</p>
              </div>
            ) : (
              <div style={styles.activityList}>
                {recentActivity.map((activity, idx) => (
                  <div key={idx} style={styles.activityItem}>
                    <div style={styles.activityIcon}>
                      {activity.status === 'approved' ? '✅' : 
                       activity.status === 'rejected' ? '❌' : '⏳'}
                    </div>
                    <div style={styles.activityContent}>
                      <h4 style={styles.activityTitle}>
                        {activity.crypto_type} Deposit - {activity.network_type}
                      </h4>
                      <p style={styles.activityDescription}>
                        Amount: {activity.amount} {activity.crypto_type} • 
                        Status: <span style={{
                          ...styles.statusBadge,
                          backgroundColor: activity.status === 'approved' ? '#d1fae5' : 
                                         activity.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: activity.status === 'approved' ? '#059669' : 
                                activity.status === 'rejected' ? '#dc2626' : '#d97706'
                        }}>
                          {activity.status}
                        </span>
                      </p>
                    </div>
                    <div style={styles.activityDate}>
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <AdminFooter />
    </AdminAuth>
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
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  backButton: {
    background: '#64748b',
    color: 'white',
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  statIcon: {
    fontSize: '40px',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderRadius: '12px'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
    fontWeight: '500'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: 0
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '150px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '25px'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  actionCard: {
    position: 'relative',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '25px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'all 0.3s',
    cursor: 'pointer'
  },
  actionIcon: {
    fontSize: '36px',
    marginBottom: '15px'
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '10px'
  },
  actionDescription: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  actionArrow: {
    position: 'absolute',
    bottom: '20px',
    right: '25px',
    fontSize: '24px',
    color: '#3b82f6',
    fontWeight: 'bold'
  },
  cryptoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  cryptoCard: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '25px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  cryptoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '2px solid #cbd5e1'
  },
  cryptoIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  cryptoInfo: {
    flex: 1
  },
  cryptoName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  cryptoSymbol: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  networkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  networkListTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px'
  },
  networkItem: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  networkName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  networkBadge: {
    fontSize: '18px'
  },
  networkDetails: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  networkDetail: {
    fontSize: '13px',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '6px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  activityIcon: {
    fontSize: '28px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    borderRadius: '8px'
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  activityDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  activityDate: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500'
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '5px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '15px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#94a3b8'
  }
};
