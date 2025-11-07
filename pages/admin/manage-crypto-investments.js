import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';

export default function ManageCryptoInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expandedInvestment, setExpandedInvestment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchInvestments();
  }, [filterStatus]);

  const fetchInvestments = async () => {
    setLoading(true);
    setError('');
    try {
      const url = filterStatus === 'all' 
        ? '/api/admin/get-crypto-investments'
        : `/api/admin/get-crypto-investments?status=${filterStatus}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch investments');
      }

      setInvestments(result.investments || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
      setError('Failed to load investments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInvestmentStatus = async (investmentId, newStatus) => {
    setProcessing(investmentId);
    setError('');
    
    try {
      const response = await fetch('/api/admin/update-crypto-investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update investment');
      }

      setMessage(`✅ Investment status updated to ${newStatus}!`);
      setTimeout(() => setMessage(''), 5000);

      await fetchInvestments();
    } catch (error) {
      console.error('Error updating investment:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(null);
    }
  };

  const calculateStats = () => {
    const total = investments.length;
    const active = investments.filter(i => i.status === 'active').length;
    const totalInvested = investments.reduce((sum, i) => sum + parseFloat(i.amount_invested_usd || 0), 0);
    const totalValue = investments.reduce((sum, i) => sum + parseFloat(i.current_value_usd || 0), 0);
    const totalProfit = investments.reduce((sum, i) => sum + parseFloat(i.profit_loss_usd || 0), 0);
    
    return { total, active, totalInvested, totalValue, totalProfit };
  };

  const stats = calculateStats();

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      active: '#10b981',
      partially_sold: '#3b82f6',
      closed: '#6b7280',
      failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getInvestmentTypeIcon = (type) => {
    const icons = {
      hold: '💎',
      stake: '📊',
      liquidity_pool: '💧',
      savings: '💰'
    };
    return icons[type] || '💼';
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Crypto Investments</h1>
            <p style={styles.subtitle}>Monitor user crypto investment activities</p>
          </div>
          <Link href="/admin/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </header>

        {error && (
          <div style={{...styles.alert, ...styles.alertError}}>
            {error}
          </div>
        )}

        {message && (
          <div style={{...styles.alert, ...styles.alertSuccess}}>
            {message}
          </div>
        )}

        <div style={styles.statsContainer}>
          <div style={{...styles.statCard, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'}}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Investments</div>
          </div>
          <div style={{...styles.statCard, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
            <div style={styles.statValue}>{stats.active}</div>
            <div style={styles.statLabel}>Active Investments</div>
          </div>
          <div style={{...styles.statCard, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
            <div style={styles.statValue}>${stats.totalInvested.toFixed(2)}</div>
            <div style={styles.statLabel}>Total Invested</div>
          </div>
          <div style={{...styles.statCard, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
            <div style={styles.statValue}>${stats.totalValue.toFixed(2)}</div>
            <div style={styles.statLabel}>Current Value</div>
          </div>
          <div style={{
            ...styles.statCard, 
            background: stats.totalProfit >= 0 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          }}>
            <div style={styles.statValue}>
              {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
            </div>
            <div style={styles.statLabel}>Total P/L</div>
          </div>
        </div>

        <div style={styles.filters}>
          <label style={styles.filterLabel}>Filter by Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="partially_sold">Partially Sold</option>
            <option value="closed">Closed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading investments...</div>
        ) : (
          <div style={styles.tableContainer}>
            {investments.length === 0 ? (
              <div style={styles.empty}>
                <p>No crypto investments found.</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Crypto Asset</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Invested</th>
                    <th style={styles.th}>Current Value</th>
                    <th style={styles.th}>P/L</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((investment) => {
                    const isExpanded = expandedInvestment === investment.id;
                    const profitLoss = parseFloat(investment.profit_loss_usd || 0);
                    const profitLossPercent = parseFloat(investment.profit_loss_percent || 0);
                    
                    return (
                      <React.Fragment key={investment.id}>
                        <tr style={styles.tr}>
                          <td style={styles.td}>
                            <div>
                              <strong>{investment.users?.email || 'N/A'}</strong>
                              <div style={styles.accountNumber}>
                                {investment.accounts?.account_number}
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div>
                              <strong>{investment.crypto_assets?.crypto_type}</strong>
                              <div style={styles.symbol}>{investment.crypto_assets?.symbol}</div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.typeLabel}>
                              {getInvestmentTypeIcon(investment.investment_type)} {investment.investment_type}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div>
                              <strong>${parseFloat(investment.amount_invested_usd).toFixed(2)}</strong>
                              <div style={styles.quantity}>
                                {parseFloat(investment.crypto_quantity).toFixed(8)} {investment.crypto_assets?.symbol}
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <strong>${parseFloat(investment.current_value_usd || 0).toFixed(2)}</strong>
                          </td>
                          <td style={styles.td}>
                            <div style={{color: profitLoss >= 0 ? '#059669' : '#ef4444'}}>
                              <strong>
                                {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
                              </strong>
                              <div style={styles.percent}>
                                ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: getStatusColor(investment.status) + '20',
                              color: getStatusColor(investment.status)
                            }}>
                              {investment.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              {investment.status === 'active' && (
                                <button
                                  onClick={() => updateInvestmentStatus(investment.id, 'closed')}
                                  style={{...styles.btn, ...styles.btnWarning}}
                                  disabled={processing === investment.id}
                                >
                                  🔒 Close
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedInvestment(isExpanded ? null : investment.id)}
                                style={{...styles.btn, ...styles.btnInfo}}
                              >
                                {isExpanded ? '▲ Hide' : '▼ Details'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="8" style={styles.expandedCell}>
                              <div style={styles.detailsPanel}>
                                <h4 style={styles.detailsTitle}>Investment Details</h4>
                                <div style={styles.detailsGrid}>
                                  <div style={styles.detailItem}>
                                    <strong>Investment Type:</strong> {investment.investment_type}
                                  </div>
                                  <div style={styles.detailItem}>
                                    <strong>Purchase Price:</strong> ${parseFloat(investment.purchase_price_per_unit).toFixed(2)}/unit
                                  </div>
                                  <div style={styles.detailItem}>
                                    <strong>Current Price:</strong> ${parseFloat(investment.current_price_per_unit || 0).toFixed(2)}/unit
                                  </div>
                                  <div style={styles.detailItem}>
                                    <strong>Quantity:</strong> {parseFloat(investment.crypto_quantity).toFixed(8)}
                                  </div>
                                  {investment.investment_type === 'stake' && (
                                    <>
                                      <div style={styles.detailItem}>
                                        <strong>Stake APY:</strong> {parseFloat(investment.stake_apy || 0).toFixed(2)}%
                                      </div>
                                      <div style={styles.detailItem}>
                                        <strong>Earned Rewards:</strong> ${parseFloat(investment.earned_rewards || 0).toFixed(2)}
                                      </div>
                                      <div style={styles.detailItem}>
                                        <strong>Auto Compound:</strong> {investment.auto_compound ? 'Yes' : 'No'}
                                      </div>
                                    </>
                                  )}
                                  {investment.lock_period_days > 0 && (
                                    <>
                                      <div style={styles.detailItem}>
                                        <strong>Lock Period:</strong> {investment.lock_period_days} days
                                      </div>
                                      {investment.unlock_date && (
                                        <div style={styles.detailItem}>
                                          <strong>Unlock Date:</strong> 
                                          {new Date(investment.unlock_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div style={styles.detailItem}>
                                    <strong>Invested At:</strong> 
                                    {new Date(investment.invested_at).toLocaleString()}
                                  </div>
                                  {investment.closed_at && (
                                    <div style={styles.detailItem}>
                                      <strong>Closed At:</strong> 
                                      {new Date(investment.closed_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1600px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  backButton: {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500'
  },
  alertError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  },
  alertSuccess: {
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    padding: '24px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9
  },
  filters: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filterLabel: {
    fontWeight: '600',
    color: '#334155'
  },
  filterSelect: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px'
  },
  th: {
    background: '#f8fafc',
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#1e293b',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s'
  },
  td: {
    padding: '16px',
    color: '#334155'
  },
  accountNumber: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
    fontFamily: 'monospace'
  },
  symbol: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px'
  },
  typeLabel: {
    fontSize: '14px',
    fontWeight: '600'
  },
  quantity: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
    fontFamily: 'monospace'
  },
  percent: {
    fontSize: '12px',
    marginTop: '2px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  btnWarning: {
    background: '#fef3c7',
    color: '#92400e'
  },
  btnInfo: {
    background: '#dbeafe',
    color: '#1e40af'
  },
  expandedCell: {
    background: '#f8fafc',
    padding: '0'
  },
  detailsPanel: {
    padding: '24px'
  },
  detailsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '16px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  detailItem: {
    fontSize: '14px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  }
};
