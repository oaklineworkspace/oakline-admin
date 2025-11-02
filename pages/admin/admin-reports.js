import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import Link from 'next/link';

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    transactions: [],
    accounts: [],
    loans: [],
    investments: [],
  });
  const [stats, setStats] = useState({
    totalTransactionVolume: 0,
    totalAccounts: 0,
    activeLoans: 0,
    totalInvestments: 0,
    avgAccountBalance: 0,
    totalLoanAmount: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedReport, setSelectedReport] = useState('overview');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

      const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('*, profiles(first_name, last_name, email)');

      const { data: loans, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: investments, error: invError } = await supabase
        .from('investments')
        .select('*, investment_products(name, type)');

      if (!transError && !accError && !loanError && !invError) {
        setReportData({
          transactions: transactions || [],
          accounts: accounts || [],
          loans: loans || [],
          investments: investments || [],
        });

        const totalVolume = transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
        const avgBalance = accounts?.length > 0 
          ? accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0) / accounts.length 
          : 0;
        const activeLoansData = loans?.filter(l => l.status === 'active') || [];
        const totalLoanAmt = activeLoansData.reduce((sum, l) => sum + parseFloat(l.remaining_balance || 0), 0);

        setStats({
          totalTransactionVolume: totalVolume,
          totalAccounts: accounts?.length || 0,
          activeLoans: activeLoansData.length,
          totalInvestments: investments?.length || 0,
          avgAccountBalance: avgBalance,
          totalLoanAmount: totalLoanAmt,
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const flattenObject = (obj, prefix = '') => {
      let flattened = {};
      for (let key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          Object.assign(flattened, flattenObject(obj[key], prefix + key + '.'));
        } else {
          flattened[prefix + key] = obj[key];
        }
      }
      return flattened;
    };
    
    const flatData = data.map(item => flattenObject(item));
    
    const allKeys = new Set();
    flatData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();
    
    const rows = flatData.map(obj => 
      headers.map(header => {
        const val = obj[header];
        const stringVal = String(val === null || val === undefined ? '' : val);
        return stringVal.includes(',') || stringVal.includes('"') ? `"${stringVal.replace(/"/g, '""')}"` : stringVal;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderOverview = () => (
    <div style={styles.statsGrid}>
      <div style={styles.statCard}>
        <div style={styles.statIcon}>💰</div>
        <div style={styles.statTitle}>Transaction Volume</div>
        <div style={styles.statValue}>${stats.totalTransactionVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        <div style={styles.statSubtext}>{reportData.transactions.length} transactions</div>
      </div>
      <div style={styles.statCard}>
        <div style={styles.statIcon}>🏦</div>
        <div style={styles.statTitle}>Total Accounts</div>
        <div style={styles.statValue}>{stats.totalAccounts}</div>
        <div style={styles.statSubtext}>Avg: ${stats.avgAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      <div style={styles.statCard}>
        <div style={styles.statIcon}>💳</div>
        <div style={styles.statTitle}>Active Loans</div>
        <div style={styles.statValue}>{stats.activeLoans}</div>
        <div style={styles.statSubtext}>${stats.totalLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      <div style={styles.statCard}>
        <div style={styles.statIcon}>📈</div>
        <div style={styles.statTitle}>Investments</div>
        <div style={styles.statValue}>{stats.totalInvestments}</div>
        <div style={styles.statSubtext}>Active portfolios</div>
      </div>
    </div>
  );

  const renderTransactionsReport = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>Transactions Report</h3>
        <button 
          onClick={() => exportToCSV(reportData.transactions, 'transactions')}
          style={styles.exportButton}
        >
          📥 Export CSV
        </button>
      </div>
      <div style={styles.scrollTable}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeaderCell}>Date</th>
              <th style={styles.tableHeaderCell}>Reference</th>
              <th style={styles.tableHeaderCell}>Type</th>
              <th style={styles.tableHeaderCell}>Amount</th>
              <th style={styles.tableHeaderCell}>Description</th>
              <th style={styles.tableHeaderCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.transactions.map((trans) => (
              <tr key={trans.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{new Date(trans.created_at).toLocaleDateString()}</td>
                <td style={styles.tableCell}>{trans.reference?.substring(0, 10)}...</td>
                <td style={styles.tableCell}><span style={styles.badge}>{trans.type}</span></td>
                <td style={styles.tableCell}>${parseFloat(trans.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={styles.tableCell}>{trans.description || 'N/A'}</td>
                <td style={styles.tableCell}>
                  <span style={{ ...styles.statusBadge, background: trans.status === 'completed' ? '#28a745' : '#ffc107' }}>
                    {trans.status || 'completed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAccountsReport = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>Accounts Report</h3>
        <button 
          onClick={() => exportToCSV(reportData.accounts, 'accounts')}
          style={styles.exportButton}
        >
          📥 Export CSV
        </button>
      </div>
      <div style={styles.scrollTable}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeaderCell}>Account Number</th>
              <th style={styles.tableHeaderCell}>Type</th>
              <th style={styles.tableHeaderCell}>Owner</th>
              <th style={styles.tableHeaderCell}>Balance</th>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Created</th>
            </tr>
          </thead>
          <tbody>
            {reportData.accounts.map((acc) => (
              <tr key={acc.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{acc.account_number}</td>
                <td style={styles.tableCell}><span style={styles.badge}>{acc.account_type}</span></td>
                <td style={styles.tableCell}>
                  {acc.profiles?.first_name} {acc.profiles?.last_name}
                </td>
                <td style={styles.tableCell}>${parseFloat(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={styles.tableCell}>
                  <span style={{ ...styles.statusBadge, background: acc.status === 'active' ? '#28a745' : '#dc3545' }}>
                    {acc.status}
                  </span>
                </td>
                <td style={styles.tableCell}>{new Date(acc.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLoansReport = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>Loans Report</h3>
        <button 
          onClick={() => exportToCSV(reportData.loans, 'loans')}
          style={styles.exportButton}
        >
          📥 Export CSV
        </button>
      </div>
      <div style={styles.scrollTable}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeaderCell}>Loan Type</th>
              <th style={styles.tableHeaderCell}>Principal</th>
              <th style={styles.tableHeaderCell}>Interest Rate</th>
              <th style={styles.tableHeaderCell}>Remaining Balance</th>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Next Payment</th>
            </tr>
          </thead>
          <tbody>
            {reportData.loans.map((loan) => (
              <tr key={loan.id} style={styles.tableRow}>
                <td style={styles.tableCell}><span style={styles.badge}>{loan.loan_type || 'N/A'}</span></td>
                <td style={styles.tableCell}>${parseFloat(loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={styles.tableCell}>{loan.interest_rate}%</td>
                <td style={styles.tableCell}>${parseFloat(loan.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={styles.tableCell}>
                  <span style={{ ...styles.statusBadge, background: loan.status === 'active' ? '#28a745' : loan.status === 'pending' ? '#ffc107' : '#6c757d' }}>
                    {loan.status}
                  </span>
                </td>
                <td style={styles.tableCell}>{loan.next_payment_date || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInvestmentsReport = () => (
    <div style={styles.tableContainer}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>Investments Report</h3>
        <button 
          onClick={() => exportToCSV(reportData.investments, 'investments')}
          style={styles.exportButton}
        >
          📥 Export CSV
        </button>
      </div>
      <div style={styles.scrollTable}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeaderCell}>Product</th>
              <th style={styles.tableHeaderCell}>Type</th>
              <th style={styles.tableHeaderCell}>Amount Invested</th>
              <th style={styles.tableHeaderCell}>Current Value</th>
              <th style={styles.tableHeaderCell}>Return</th>
              <th style={styles.tableHeaderCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.investments.map((inv) => {
              const returnVal = parseFloat(inv.current_value || 0) - parseFloat(inv.amount_invested || 0);
              const returnPct = (returnVal / parseFloat(inv.amount_invested || 1)) * 100;
              return (
                <tr key={inv.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{inv.investment_products?.name || 'N/A'}</td>
                  <td style={styles.tableCell}><span style={styles.badge}>{inv.investment_products?.type || 'N/A'}</span></td>
                  <td style={styles.tableCell}>${parseFloat(inv.amount_invested).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.tableCell}>${parseFloat(inv.current_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.tableCell}>
                    <span style={{ color: returnVal >= 0 ? '#28a745' : '#dc3545', fontWeight: '600' }}>
                      {returnVal >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{ ...styles.statusBadge, background: inv.status === 'active' ? '#28a745' : '#6c757d' }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Admin Reports</h1>
            <p style={styles.subtitle}>Financial and operational analytics</p>
          </div>
          <Link href="/" style={styles.backButton}>
            ← Back to Hub
          </Link>
        </div>

        <div style={styles.controls}>
          <div style={styles.dateRangeContainer}>
            <label style={styles.label}>Start Date:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={styles.dateInput}
            />
            <label style={styles.label}>End Date:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={styles.dateInput}
            />
            <button onClick={fetchReportData} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
          {['overview', 'transactions', 'accounts', 'loans', 'investments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedReport(tab)}
              style={{
                ...styles.tab,
                ...(selectedReport === tab ? styles.activeTab : {})
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading reports...</div>
        ) : (
          <div style={styles.content}>
            {selectedReport === 'overview' && renderOverview()}
            {selectedReport === 'transactions' && renderTransactionsReport()}
            {selectedReport === 'accounts' && renderAccountsReport()}
            {selectedReport === 'loans' && renderLoansReport()}
            {selectedReport === 'investments' && renderInvestmentsReport()}
          </div>
        )}
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '5px 0 0 0',
  },
  backButton: {
    padding: '10px 20px',
    background: '#3498db',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500',
  },
  controls: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  dateRangeContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  label: {
    fontWeight: '500',
    color: '#2c3e50',
  },
  dateInput: {
    padding: '8px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  refreshButton: {
    padding: '8px 16px',
    background: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    background: '#3498db',
    color: 'white',
    borderColor: '#3498db',
  },
  content: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  statCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '25px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  statTitle: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  statSubtext: {
    fontSize: '12px',
    opacity: 0.8,
  },
  tableContainer: {
    marginTop: '20px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
  },
  exportButton: {
    padding: '8px 16px',
    background: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  scrollTable: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  },
  tableHeaderRow: {
    background: '#f8f9fa',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#2c3e50',
    borderBottom: '2px solid #e0e0e0',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s ease',
  },
  tableCell: {
    padding: '12px',
    color: '#2c3e50',
  },
  badge: {
    padding: '4px 8px',
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#7f8c8d',
  },
};
