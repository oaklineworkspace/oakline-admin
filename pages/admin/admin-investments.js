
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function AdminInvestments() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolios');
  const [investments, setInvestments] = useState([]);
  const [investmentProducts, setInvestmentProducts] = useState([]);
  const [stats, setStats] = useState({
    totalAUM: 0,
    activeInvestments: 0,
    totalGainLoss: 0,
    totalProducts: 0
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: 'stock',
    symbol: '',
    description: '',
    min_investment: 0,
    risk_level: 'moderate',
    expected_return: 0,
    is_active: true
  });
  const [newInvestment, setNewInvestment] = useState({
    user_id: '',
    product_id: '',
    account_id: '',
    amount_invested: 0
  });
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvestments(),
        fetchInvestmentProducts(),
        fetchUsers(),
        fetchAccounts()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load investment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestments = async () => {
    const { data, error } = await supabase
      .from('user_investments')
      .select(`
        *,
        investment_products (*),
        accounts (account_number, account_type),
        users:user_id (id, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investments:', error);
      return;
    }

    setInvestments(data || []);
    calculateStats(data || []);
  };

  const fetchInvestmentProducts = async () => {
    const { data, error } = await supabase
      .from('investment_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setInvestmentProducts(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('user_id, users:user_id(id, email)')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    const uniqueUsers = Array.from(new Map(data?.map(item => [item.users?.id, item.users])).values());
    setUsers(uniqueUsers.filter(Boolean));
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching accounts:', error);
      return;
    }

    setAccounts(data || []);
  };

  const calculateStats = (investmentData) => {
    const totalAUM = investmentData.reduce((sum, inv) => sum + parseFloat(inv.current_value || inv.amount_invested || 0), 0);
    const totalInvested = investmentData.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0);
    const totalGainLoss = totalAUM - totalInvested;
    const activeInvestments = investmentData.filter(inv => inv.status === 'active').length;

    setStats({
      totalAUM,
      activeInvestments,
      totalGainLoss,
      totalProducts: investmentProducts.length
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('investment_products')
        .insert([newProduct])
        .select();

      if (error) throw error;

      setMessage('Investment product created successfully!');
      setShowProductModal(false);
      setNewProduct({
        name: '',
        type: 'stock',
        symbol: '',
        description: '',
        min_investment: 0,
        risk_level: 'moderate',
        expected_return: 0,
        is_active: true
      });
      await fetchInvestmentProducts();
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const product = investmentProducts.find(p => p.id === newInvestment.product_id);
      
      if (parseFloat(newInvestment.amount_invested) < parseFloat(product?.min_investment || 0)) {
        throw new Error(`Minimum investment is $${product?.min_investment}`);
      }

      const investmentData = {
        user_id: newInvestment.user_id,
        product_id: newInvestment.product_id,
        account_id: newInvestment.account_id,
        amount_invested: parseFloat(newInvestment.amount_invested),
        current_value: parseFloat(newInvestment.amount_invested),
        status: 'active'
      };

      const { data, error } = await supabase
        .from('user_investments')
        .insert([investmentData])
        .select();

      if (error) throw error;

      setMessage('Investment created successfully!');
      setShowInvestmentModal(false);
      setNewInvestment({
        user_id: '',
        product_id: '',
        account_id: '',
        amount_invested: 0
      });
      await fetchInvestments();
    } catch (err) {
      console.error('Error creating investment:', err);
      setError(err.message || 'Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvestmentStatus = async (investmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('user_investments')
        .update({ status: newStatus })
        .eq('id', investmentId);

      if (error) throw error;

      setMessage(`Investment ${newStatus} successfully!`);
      await fetchInvestments();
    } catch (err) {
      console.error('Error updating investment:', err);
      setError(err.message || 'Failed to update investment');
    }
  };

  const handleToggleProductStatus = async (productId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('investment_products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      setMessage('Product status updated successfully!');
      await fetchInvestmentProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
    }
  };

  if (loading && investments.length === 0) {
    return (
      <AdminAuth>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading investment data...</p>
        </div>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📈 Investment Management</h1>
          <Link href="/admin/admin-dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        {message && <div style={styles.successMessage}>{message}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total AUM</h3>
            <p style={styles.statNumber}>${stats.totalAUM.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Active Investments</h3>
            <p style={styles.statNumber}>{stats.activeInvestments}</p>
          </div>
          <div style={styles.statCard}>
            <h3>Total Gain/Loss</h3>
            <p style={{...styles.statNumber, color: stats.totalGainLoss >= 0 ? '#28a745' : '#dc3545'}}>
              {stats.totalGainLoss >= 0 ? '+' : ''}${stats.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div style={styles.statCard}>
            <h3>Available Products</h3>
            <p style={styles.statNumber}>{stats.totalProducts}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'portfolios' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('portfolios')}
          >
            User Investments
          </button>
          <button
            style={activeTab === 'products' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('products')}
          >
            Investment Products
          </button>
          <button
            style={activeTab === 'analytics' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'portfolios' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>User Investments</h2>
              <div style={styles.actionButtons}>
                <button 
                  style={styles.actionButton}
                  onClick={() => setShowInvestmentModal(true)}
                >
                  ➕ New Investment
                </button>
                <button 
                  style={styles.actionButton}
                  onClick={fetchInvestments}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>User</th>
                    <th style={styles.tableHeaderCell}>Product</th>
                    <th style={styles.tableHeaderCell}>Account</th>
                    <th style={styles.tableHeaderCell}>Invested</th>
                    <th style={styles.tableHeaderCell}>Current Value</th>
                    <th style={styles.tableHeaderCell}>Gain/Loss</th>
                    <th style={styles.tableHeaderCell}>Status</th>
                    <th style={styles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((investment) => {
                    const gainLoss = parseFloat(investment.current_value || investment.amount_invested) - parseFloat(investment.amount_invested);
                    const gainLossPct = (gainLoss / parseFloat(investment.amount_invested)) * 100;
                    
                    return (
                      <tr key={investment.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{investment.users?.email || 'N/A'}</td>
                        <td style={styles.tableCell}>{investment.investment_products?.name || 'N/A'}</td>
                        <td style={styles.tableCell}>{investment.accounts?.account_number || 'N/A'}</td>
                        <td style={styles.tableCell}>${parseFloat(investment.amount_invested).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={styles.tableCell}>${parseFloat(investment.current_value || investment.amount_invested).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={styles.tableCell}>
                          <span style={{color: gainLoss >= 0 ? '#28a745' : '#dc3545', fontWeight: '600'}}>
                            {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            <br />
                            ({gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            background: investment.status === 'active' ? '#28a745' : 
                                       investment.status === 'pending' ? '#ffc107' : '#dc3545'
                          }}>
                            {investment.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionBtns}>
                            {investment.status === 'active' && (
                              <button
                                style={styles.actionBtn}
                                onClick={() => handleUpdateInvestmentStatus(investment.id, 'closed')}
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {investments.length === 0 && (
                <div style={styles.emptyState}>No investments found</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Investment Products</h2>
              <button 
                style={styles.actionButton}
                onClick={() => setShowProductModal(true)}
              >
                ➕ Add Product
              </button>
            </div>

            <div style={styles.productsGrid}>
              {investmentProducts.map((product) => (
                <div key={product.id} style={styles.productCard}>
                  <div style={styles.productHeader}>
                    <div>
                      <h3 style={styles.productName}>{product.name}</h3>
                      <p style={styles.productSymbol}>{product.symbol}</p>
                    </div>
                    <span style={{
                      ...styles.typeBadge,
                      background: product.type === 'stock' ? '#007bff' : 
                                 product.type === 'bond' ? '#28a745' : 
                                 product.type === 'mutual_fund' ? '#ffc107' : '#17a2b8'
                    }}>
                      {product.type}
                    </span>
                  </div>
                  
                  <p style={styles.productDesc}>{product.description}</p>
                  
                  <div style={styles.productDetails}>
                    <div style={styles.detailRow}>
                      <span>Min Investment:</span>
                      <strong>${parseFloat(product.min_investment).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Expected Return:</span>
                      <strong style={{color: '#28a745'}}>{product.expected_return}%</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Risk Level:</span>
                      <strong style={{
                        color: product.risk_level === 'low' ? '#28a745' : 
                               product.risk_level === 'moderate' ? '#ffc107' : '#dc3545'
                      }}>
                        {product.risk_level}
                      </strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Status:</span>
                      <strong style={{color: product.is_active ? '#28a745' : '#dc3545'}}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </strong>
                    </div>
                  </div>

                  <button
                    style={{
                      ...styles.toggleBtn,
                      background: product.is_active ? '#dc3545' : '#28a745'
                    }}
                    onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                  >
                    {product.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
            {investmentProducts.length === 0 && (
              <div style={styles.emptyState}>No investment products available</div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Investment Analytics</h2>
            <div style={styles.analyticsGrid}>
              <div style={styles.analyticsCard}>
                <h3>📊 Performance Summary</h3>
                <div style={styles.analyticsStat}>
                  <span>Total Investments:</span>
                  <strong>{investments.length}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Total Invested:</span>
                  <strong>${investments.reduce((sum, inv) => sum + parseFloat(inv.amount_invested), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Overall Return:</span>
                  <strong style={{color: stats.totalGainLoss >= 0 ? '#28a745' : '#dc3545'}}>
                    {stats.totalGainLoss >= 0 ? '+' : ''}${stats.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div style={styles.analyticsCard}>
                <h3>📈 By Product Type</h3>
                {['stock', 'bond', 'mutual_fund', 'etf'].map(type => {
                  const typeInvestments = investments.filter(inv => inv.investment_products?.type === type);
                  const typeTotal = typeInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount_invested), 0);
                  return (
                    <div key={type} style={styles.analyticsStat}>
                      <span>{type.replace('_', ' ').toUpperCase()}:</span>
                      <strong>${typeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  );
                })}
              </div>

              <div style={styles.analyticsCard}>
                <h3>⚠️ By Risk Level</h3>
                {['low', 'moderate', 'high'].map(risk => {
                  const riskInvestments = investments.filter(inv => inv.investment_products?.risk_level === risk);
                  const riskTotal = riskInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount_invested), 0);
                  return (
                    <div key={risk} style={styles.analyticsStat}>
                      <span>{risk.toUpperCase()}:</span>
                      <strong>${riskTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create Product Modal */}
        {showProductModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Create Investment Product</h2>
              <form onSubmit={handleCreateProduct}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Symbol</label>
                  <input
                    type="text"
                    value={newProduct.symbol}
                    onChange={(e) => setNewProduct({...newProduct, symbol: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Type</label>
                  <select
                    value={newProduct.type}
                    onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="stock">Stock</option>
                    <option value="bond">Bond</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="etf">ETF</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    style={{...styles.input, minHeight: '80px'}}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Minimum Investment ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.min_investment}
                    onChange={(e) => setNewProduct({...newProduct, min_investment: parseFloat(e.target.value)})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Risk Level</label>
                  <select
                    value={newProduct.risk_level}
                    onChange={(e) => setNewProduct({...newProduct, risk_level: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expected Return (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.expected_return}
                    onChange={(e) => setNewProduct({...newProduct, expected_return: parseFloat(e.target.value)})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" onClick={() => setShowProductModal(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Investment Modal */}
        {showInvestmentModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Create New Investment</h2>
              <form onSubmit={handleCreateInvestment}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>User</label>
                  <select
                    value={newInvestment.user_id}
                    onChange={(e) => setNewInvestment({...newInvestment, user_id: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.email}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account</label>
                  <select
                    value={newInvestment.account_id}
                    onChange={(e) => setNewInvestment({...newInvestment, account_id: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.filter(acc => acc.user_id === newInvestment.user_id).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.account_type} (${parseFloat(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Investment Product</label>
                  <select
                    value={newInvestment.product_id}
                    onChange={(e) => setNewInvestment({...newInvestment, product_id: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="">Select Product</option>
                    {investmentProducts.filter(p => p.is_active).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.symbol}) - Min: ${parseFloat(product.min_investment).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount to Invest ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestment.amount_invested}
                    onChange={(e) => setNewInvestment({...newInvestment, amount_invested: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" onClick={() => setShowInvestmentModal(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Investment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{height: '80px'}}></div>
        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    paddingBottom: '100px'
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
  successMessage: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb'
  },
  errorMessage: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
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
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    background: '#f8f9fa',
    borderBottom: '2px solid #dee2e6'
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#495057',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6'
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  actionBtns: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  productCard: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px',
    background: '#f8f9fa'
  },
  productHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  productName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  productSymbol: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  productDesc: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  productDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '15px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  toggleBtn: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '500',
    cursor: 'pointer'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  analyticsCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    background: '#f8f9fa'
  },
  analyticsStat: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#495057'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontWeight: '500'
  },
  submitBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    background: '#28a745',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500'
  }
};
