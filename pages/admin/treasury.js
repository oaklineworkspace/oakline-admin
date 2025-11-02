
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminNavDropdown from '../../components/AdminNavDropdown';
import AdminStickyDropdown from '../../components/AdminStickyDropdown';
import Link from 'next/link';

const TREASURY_USER_ID = '7f62c3ec-31fe-4952-aa00-2c922064d56a';

export default function Treasury() {
  const [treasuryAccount, setTreasuryAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTreasuryAccount();
  }, []);

  const fetchTreasuryAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select(`
          *,
          applications (
            first_name,
            last_name,
            email
          )
        `)
        .eq('user_id', TREASURY_USER_ID)
        .single();

      if (fetchError) {
        console.error('Error fetching treasury account:', fetchError);
        throw new Error('Failed to fetch treasury account');
      }

      setTreasuryAccount(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load treasury account');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatAccountType = (type) => {
    if (!type) return 'N/A';
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'suspended':
        return '#ef4444';
      case 'closed':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏛️ Oakline Treasury Account</h1>
            <p style={styles.subtitle}>Central treasury account management</p>
          </div>
          <AdminNavDropdown />
        </div>

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading treasury account...</p>
          </div>
        ) : error ? (
          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3 style={styles.errorTitle}>Error Loading Treasury Account</h3>
            <p style={styles.errorMessage}>{error}</p>
            <button onClick={fetchTreasuryAccount} style={styles.retryButton}>
              🔄 Retry
            </button>
          </div>
        ) : treasuryAccount ? (
          <>
            <div style={styles.summaryCard}>
              <div style={styles.summaryHeader}>
                <div style={styles.summaryIcon}>💰</div>
                <div>
                  <h2 style={styles.summaryTitle}>Oakline Treasury Account</h2>
                  <p style={styles.summarySubtitle}>Primary operational treasury</p>
                </div>
              </div>
              <div style={styles.balanceDisplay}>
                <div style={styles.balanceLabel}>Total Balance</div>
                <div style={styles.balanceAmount}>
                  {formatCurrency(treasuryAccount.balance)}
                </div>
              </div>
            </div>

            <div style={styles.detailsCard}>
              <h3 style={styles.cardTitle}>Account Details</h3>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Account Number</div>
                  <div style={styles.detailValue}>
                    <code style={styles.accountNumberCode}>
                      {treasuryAccount.account_number}
                    </code>
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Account Type</div>
                  <div style={styles.detailValue}>
                    {formatAccountType(treasuryAccount.account_type)}
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Status</div>
                  <div style={styles.detailValue}>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(treasuryAccount.status) + '20',
                        color: getStatusColor(treasuryAccount.status)
                      }}
                    >
                      {treasuryAccount.status?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Current Balance</div>
                  <div style={{...styles.detailValue, ...styles.balanceText}}>
                    {formatCurrency(treasuryAccount.balance)}
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Account Holder</div>
                  <div style={styles.detailValue}>
                    {treasuryAccount.applications?.first_name} {treasuryAccount.applications?.last_name}
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Email</div>
                  <div style={styles.detailValue}>
                    {treasuryAccount.applications?.email || 'N/A'}
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Created</div>
                  <div style={styles.detailValue}>
                    {new Date(treasuryAccount.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Last Updated</div>
                  <div style={styles.detailValue}>
                    {new Date(treasuryAccount.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.actionsCard}>
              <h3 style={styles.cardTitle}>Quick Actions</h3>
              <div style={styles.actionsGrid}>
                <Link href="/admin/admin-transactions" style={styles.actionButton}>
                  <div style={styles.actionIcon}>💸</div>
                  <div style={styles.actionText}>View Transactions</div>
                </Link>
                <Link href="/admin/manual-transactions" style={styles.actionButton}>
                  <div style={styles.actionIcon}>✏️</div>
                  <div style={styles.actionText}>Create Transaction</div>
                </Link>
                <Link href="/admin/admin-balance" style={styles.actionButton}>
                  <div style={styles.actionIcon}>💰</div>
                  <div style={styles.actionText}>Manage Balance</div>
                </Link>
                <button onClick={fetchTreasuryAccount} style={styles.actionButton}>
                  <div style={styles.actionIcon}>🔄</div>
                  <div style={styles.actionText}>Refresh Data</div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.noDataCard}>
            <div style={styles.noDataIcon}>📭</div>
            <h3 style={styles.noDataTitle}>No Treasury Account Found</h3>
            <p style={styles.noDataMessage}>
              The treasury account could not be located. Please verify the user ID.
            </p>
          </div>
        )}

        <div style={styles.bottomNav}>
          <Link href="/admin/approve-applications" style={styles.navButton}>
            <div style={styles.navIcon}>✅</div>
            <div style={styles.navText}>Approve</div>
          </Link>
          <Link href="/admin" style={styles.navButton}>
            <div style={styles.navIcon}>🏠</div>
            <div style={styles.navText}>Hub</div>
          </Link>
          <Link href="/admin/manage-accounts" style={styles.navButton}>
            <div style={styles.navIcon}>🏦</div>
            <div style={styles.navText}>Accounts</div>
          </Link>
          <Link href="/admin/admin-transactions" style={styles.navButton}>
            <div style={styles.navIcon}>💸</div>
            <div style={styles.navText}>Transactions</div>
          </Link>
          <AdminStickyDropdown />
        </div>
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  loading: {
    background: 'white',
    padding: '60px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#1e3c72'
  },
  spinner: {
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #1e3c72',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  summaryCard: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    padding: '30px',
    borderRadius: '16px',
    marginBottom: '25px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
    color: 'white'
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '25px'
  },
  summaryIcon: {
    fontSize: '48px'
  },
  summaryTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  summarySubtitle: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '5px 0 0 0'
  },
  balanceDisplay: {
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  balanceLabel: {
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.9,
    marginBottom: '10px'
  },
  balanceAmount: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#fff'
  },
  detailsCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e5e7eb'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  detailItem: {
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    fontWeight: '600'
  },
  detailValue: {
    fontSize: '16px',
    color: '#1e3a8a',
    fontWeight: '600'
  },
  accountNumberCode: {
    background: '#1e3c72',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '15px',
    letterSpacing: '1px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  balanceText: {
    fontSize: '20px',
    color: '#10b981',
    fontWeight: 'bold'
  },
  actionsCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '25px'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  actionIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  actionText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3c72'
  },
  errorCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: '10px'
  },
  errorMessage: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '20px'
  },
  retryButton: {
    background: '#1e3c72',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  noDataCard: {
    background: 'white',
    padding: '60px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  noDataIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  noDataTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '10px'
  },
  noDataMessage: {
    fontSize: '16px',
    color: '#6b7280'
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTop: '2px solid #e2e8f0',
    padding: '6px 3px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    gap: '2px'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#1A3E6F',
    padding: '4px 2px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '70px',
    minWidth: '50px'
  },
  navIcon: {
    fontSize: '16px',
    marginBottom: '2px'
  },
  navText: {
    fontSize: '9px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1.1'
  }
};
