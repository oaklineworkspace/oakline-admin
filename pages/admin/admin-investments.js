import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function AdminInvestments() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('investments');
  const [investments, setInvestments] = useState([]);
  const [investmentProducts, setInvestmentProducts] = useState([]);
  const [stats, setStats] = useState({
    totalAUM: 0,
    activeInvestments: 0,
    totalGainLoss: 0,
    totalProducts: 0,
    pendingInvestments: 0
  });
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showEditInvestmentModal, setShowEditInvestmentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: 'stock',
    description: '',
    risk_level: 'moderate',
    annual_return: 0,
    min_investment: 100,
    expense_ratio: 0,
    dividend_yield: 0,
    maturity_months: null,
    is_active: true
  });
  
  const [editProduct, setEditProduct] = useState(null);
  const [editInvestment, setEditInvestment] = useState(null);
  
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

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await fetchUsers();
      await fetchAccounts();
      await Promise.all([
        fetchInvestments(),
        fetchInvestmentProducts()
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
      .from('investments')
      .select(`
        *,
        investment_products:product_id (*),
        accounts:account_id (id, account_number, account_type, user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investments:', error);
      return;
    }

    const enrichedData = (data || []).map(inv => {
      const userProfile = users.find(u => u.id === inv.user_id) || 
                         users.find(u => u.id === inv.accounts?.user_id);
      return {
        ...inv,
        profiles: userProfile || null
      };
    });

    setInvestments(enrichedData);
    calculateStats(enrichedData);
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
      .select('user_id, profiles:user_id (id, email, first_name, last_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    const uniqueUsers = [];
    const seenIds = new Set();
    (data || []).forEach(item => {
      if (item.profiles && !seenIds.has(item.profiles.id)) {
        seenIds.add(item.profiles.id);
        uniqueUsers.push(item.profiles);
      }
    });
    
    setUsers(uniqueUsers);
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
    const pendingInvestments = investmentData.filter(inv => inv.status === 'pending').length;

    setStats({
      totalAUM,
      activeInvestments,
      totalGainLoss,
      totalProducts: investmentProducts.length,
      pendingInvestments
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const productData = {
        ...newProduct,
        annual_return: parseFloat(newProduct.annual_return) || 0,
        min_investment: parseFloat(newProduct.min_investment) || 100,
        expense_ratio: parseFloat(newProduct.expense_ratio) || 0,
        dividend_yield: parseFloat(newProduct.dividend_yield) || 0,
        maturity_months: newProduct.maturity_months ? parseInt(newProduct.maturity_months) : null
      };

      const { data, error } = await supabase
        .from('investment_products')
        .insert([productData])
        .select();

      if (error) throw error;

      setMessage('Investment product created successfully!');
      setShowProductModal(false);
      setNewProduct({
        name: '',
        type: 'stock',
        description: '',
        risk_level: 'moderate',
        annual_return: 0,
        min_investment: 100,
        expense_ratio: 0,
        dividend_yield: 0,
        maturity_months: null,
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

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const productData = {
        name: editProduct.name,
        type: editProduct.type,
        description: editProduct.description,
        risk_level: editProduct.risk_level,
        annual_return: parseFloat(editProduct.annual_return) || 0,
        min_investment: parseFloat(editProduct.min_investment) || 100,
        expense_ratio: parseFloat(editProduct.expense_ratio) || 0,
        dividend_yield: parseFloat(editProduct.dividend_yield) || 0,
        maturity_months: editProduct.maturity_months ? parseInt(editProduct.maturity_months) : null,
        is_active: editProduct.is_active,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('investment_products')
        .update(productData)
        .eq('id', editProduct.id);

      if (error) throw error;

      setMessage('Product updated successfully!');
      setShowEditProductModal(false);
      setEditProduct(null);
      await fetchInvestmentProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
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
        status: 'active',
        invested_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('investments')
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

  const handleEditInvestment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const updateData = {
        current_value: parseFloat(editInvestment.current_value),
        status: editInvestment.status,
        updated_at: new Date().toISOString()
      };

      if (editInvestment.status === 'closed' && !editInvestment.sold_at) {
        updateData.sold_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('investments')
        .update(updateData)
        .eq('id', editInvestment.id);

      if (error) throw error;

      setMessage('Investment updated successfully!');
      setShowEditInvestmentModal(false);
      setEditInvestment(null);
      await fetchInvestments();
    } catch (err) {
      console.error('Error updating investment:', err);
      setError(err.message || 'Failed to update investment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvestmentStatus = async (investmentId, newStatus) => {
    try {
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'closed') {
        updateData.sold_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('investments')
        .update(updateData)
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
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      setMessage('Product status updated successfully!');
      await fetchInvestmentProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    
    try {
      setLoading(true);
      
      const { data: linkedInvestments } = await supabase
        .from('investments')
        .select('id')
        .eq('product_id', deleteTarget.id);

      if (linkedInvestments && linkedInvestments.length > 0) {
        throw new Error(`Cannot delete product. ${linkedInvestments.length} investment(s) are linked to this product.`);
      }

      const { error } = await supabase
        .from('investment_products')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setMessage('Product deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchInvestmentProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestment = async () => {
    if (!deleteTarget) return;
    
    try {
      setLoading(true);

      const { data: linkedTransactions } = await supabase
        .from('investment_transactions')
        .select('id')
        .eq('investment_id', deleteTarget.id);

      if (linkedTransactions && linkedTransactions.length > 0) {
        throw new Error(`Cannot delete investment. ${linkedTransactions.length} transaction(s) are linked to this investment. Please delete transactions first.`);
      }

      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setMessage('Investment deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchInvestments();
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError(err.message || 'Failed to delete investment');
    } finally {
      setLoading(false);
    }
  };

  const openEditProduct = (product) => {
    setEditProduct({ ...product });
    setShowEditProductModal(true);
  };

  const openEditInvestment = (investment) => {
    setEditInvestment({ ...investment });
    setShowEditInvestmentModal(true);
  };

  const openDeleteConfirm = (item, type) => {
    setDeleteTarget({ ...item, deleteType: type });
    setShowDeleteConfirm(true);
  };

  const filteredInvestments = investments.filter(inv => {
    const matchesSearch = 
      inv.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.investment_products?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesUser = userFilter === 'all' || inv.user_id === userFilter;

    return matchesSearch && matchesStatus && matchesUser;
  });

  const filteredProducts = investmentProducts.filter(prod => {
    const matchesSearch = 
      prod.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = productTypeFilter === 'all' || prod.type === productTypeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && prod.is_active) ||
      (statusFilter === 'inactive' && !prod.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    });
  };

  const getUserAccounts = (userId) => {
    return accounts.filter(acc => acc.user_id === userId);
  };

  if (loading && investments.length === 0 && investmentProducts.length === 0) {
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
          <div>
            <h1 style={styles.title}>Investment Management</h1>
            <p style={styles.subtitle}>Manage investment products and user portfolios</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.refreshButton} onClick={fetchAllData} disabled={loading}>
              {loading ? '...' : 'Refresh'}
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              Dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div style={styles.successBanner}>
            {message}
            <button onClick={() => setMessage('')} style={styles.closeBannerBtn}>x</button>
          </div>
        )}
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')} style={styles.closeBannerBtn}>x</button>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
            <h3 style={styles.statLabel}>Total AUM</h3>
            <p style={styles.statValue}>{formatCurrency(stats.totalAUM)}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
            <h3 style={styles.statLabel}>Active Investments</h3>
            <p style={styles.statValue}>{stats.activeInvestments}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
            <h3 style={styles.statLabel}>Pending</h3>
            <p style={styles.statValue}>{stats.pendingInvestments}</p>
          </div>
          <div style={{...styles.statCard, borderLeft: stats.totalGainLoss >= 0 ? '4px solid #10b981' : '4px solid #ef4444'}}>
            <h3 style={styles.statLabel}>Total Gain/Loss</h3>
            <p style={{...styles.statValue, color: stats.totalGainLoss >= 0 ? '#10b981' : '#ef4444'}}>
              {stats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(stats.totalGainLoss)}
            </p>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={activeTab === 'investments' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => { setActiveTab('investments'); setSearchTerm(''); setStatusFilter('all'); }}
          >
            User Investments ({investments.length})
          </button>
          <button
            style={activeTab === 'products' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => { setActiveTab('products'); setSearchTerm(''); setStatusFilter('all'); }}
          >
            Products ({investmentProducts.length})
          </button>
          <button
            style={activeTab === 'analytics' ? {...styles.tab, ...styles.activeTab} : styles.tab}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'investments' && (
          <div style={styles.section}>
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Search by user or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              <button 
                style={styles.addButton}
                onClick={() => setShowInvestmentModal(true)}
              >
                + New Investment
              </button>
            </div>

            <div style={styles.cardsGrid}>
              {filteredInvestments.length === 0 ? (
                <div style={styles.emptyState}>No investments found</div>
              ) : (
                filteredInvestments.map((investment) => {
                  const gainLoss = parseFloat(investment.current_value || investment.amount_invested) - parseFloat(investment.amount_invested);
                  const gainLossPct = investment.amount_invested > 0 ? (gainLoss / parseFloat(investment.amount_invested)) * 100 : 0;
                  
                  return (
                    <div key={investment.id} style={styles.investmentCard}>
                      <div style={styles.cardHeader}>
                        <div>
                          <h3 style={styles.cardTitle}>{investment.investment_products?.name || 'Unknown Product'}</h3>
                          <p style={styles.cardSubtitle}>
                            {investment.profiles?.email || 'Unknown User'}
                          </p>
                        </div>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: investment.status === 'active' ? '#d1fae5' : 
                                         investment.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: investment.status === 'active' ? '#065f46' : 
                                investment.status === 'pending' ? '#92400e' : '#991b1b'
                        }}>
                          {investment.status}
                        </span>
                      </div>

                      <div style={styles.cardDetails}>
                        <div style={styles.detailRow}>
                          <span>Account:</span>
                          <strong>{investment.accounts?.account_number || '-'}</strong>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Invested:</span>
                          <strong>{formatCurrency(investment.amount_invested)}</strong>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Current Value:</span>
                          <strong>{formatCurrency(investment.current_value)}</strong>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Gain/Loss:</span>
                          <strong style={{color: gainLoss >= 0 ? '#10b981' : '#ef4444'}}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPct.toFixed(2)}%)
                          </strong>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Invested At:</span>
                          <strong>{formatDateTime(investment.invested_at)}</strong>
                        </div>
                      </div>

                      <div style={styles.cardActions}>
                        <button
                          style={styles.editBtn}
                          onClick={() => openEditInvestment(investment)}
                        >
                          Edit
                        </button>
                        {investment.status === 'active' && (
                          <button
                            style={styles.closeBtn}
                            onClick={() => handleUpdateInvestmentStatus(investment.id, 'closed')}
                          >
                            Close
                          </button>
                        )}
                        {investment.status === 'pending' && (
                          <button
                            style={styles.approveBtn}
                            onClick={() => handleUpdateInvestmentStatus(investment.id, 'active')}
                          >
                            Activate
                          </button>
                        )}
                        <button
                          style={styles.deleteBtn}
                          onClick={() => openDeleteConfirm(investment, 'investment')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div style={styles.section}>
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={productTypeFilter}
                onChange={(e) => setProductTypeFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="stock">Stock</option>
                <option value="bond">Bond</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="etf">ETF</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="crypto">Crypto</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button 
                style={styles.addButton}
                onClick={() => setShowProductModal(true)}
              >
                + Add Product
              </button>
            </div>

            <div style={styles.cardsGrid}>
              {filteredProducts.length === 0 ? (
                <div style={styles.emptyState}>No products found</div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} style={styles.productCard}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h3 style={styles.cardTitle}>{product.name}</h3>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: product.type === 'stock' ? '#dbeafe' : 
                                         product.type === 'bond' ? '#d1fae5' : 
                                         product.type === 'mutual_fund' ? '#fef3c7' : 
                                         product.type === 'etf' ? '#e0e7ff' : '#fce7f3'
                        }}>
                          {product.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: product.is_active ? '#d1fae5' : '#fee2e2',
                        color: product.is_active ? '#065f46' : '#991b1b'
                      }}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p style={styles.productDesc}>{product.description || 'No description'}</p>

                    <div style={styles.cardDetails}>
                      <div style={styles.detailRow}>
                        <span>Min Investment:</span>
                        <strong>{formatCurrency(product.min_investment)}</strong>
                      </div>
                      <div style={styles.detailRow}>
                        <span>Annual Return:</span>
                        <strong style={{color: '#10b981'}}>{product.annual_return}%</strong>
                      </div>
                      <div style={styles.detailRow}>
                        <span>Risk Level:</span>
                        <strong style={{
                          color: product.risk_level === 'low' ? '#10b981' : 
                                 product.risk_level === 'moderate' ? '#f59e0b' : '#ef4444'
                        }}>
                          {product.risk_level}
                        </strong>
                      </div>
                      {product.expense_ratio > 0 && (
                        <div style={styles.detailRow}>
                          <span>Expense Ratio:</span>
                          <strong>{product.expense_ratio}%</strong>
                        </div>
                      )}
                      {product.dividend_yield > 0 && (
                        <div style={styles.detailRow}>
                          <span>Dividend Yield:</span>
                          <strong>{product.dividend_yield}%</strong>
                        </div>
                      )}
                      {product.maturity_months && (
                        <div style={styles.detailRow}>
                          <span>Maturity:</span>
                          <strong>{product.maturity_months} months</strong>
                        </div>
                      )}
                    </div>

                    <div style={styles.cardActions}>
                      <button
                        style={styles.editBtn}
                        onClick={() => openEditProduct(product)}
                      >
                        Edit
                      </button>
                      <button
                        style={product.is_active ? styles.deactivateBtn : styles.approveBtn}
                        onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                      >
                        {product.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => openDeleteConfirm(product, 'product')}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={styles.section}>
            <div style={styles.analyticsGrid}>
              <div style={styles.analyticsCard}>
                <h3 style={styles.analyticsTitle}>Performance Summary</h3>
                <div style={styles.analyticsStat}>
                  <span>Total Investments:</span>
                  <strong>{investments.length}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Active Investments:</span>
                  <strong>{stats.activeInvestments}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Total Invested:</span>
                  <strong>{formatCurrency(investments.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0))}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Current Value:</span>
                  <strong>{formatCurrency(stats.totalAUM)}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Overall Return:</span>
                  <strong style={{color: stats.totalGainLoss >= 0 ? '#10b981' : '#ef4444'}}>
                    {stats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(stats.totalGainLoss)}
                  </strong>
                </div>
              </div>

              <div style={styles.analyticsCard}>
                <h3 style={styles.analyticsTitle}>By Product Type</h3>
                {['stock', 'bond', 'mutual_fund', 'etf', 'fixed_deposit', 'crypto'].map(type => {
                  const typeInvestments = investments.filter(inv => inv.investment_products?.type === type);
                  const typeTotal = typeInvestments.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
                  if (typeTotal === 0) return null;
                  return (
                    <div key={type} style={styles.analyticsStat}>
                      <span>{type.replace('_', ' ').toUpperCase()}:</span>
                      <strong>{formatCurrency(typeTotal)} ({typeInvestments.length})</strong>
                    </div>
                  );
                })}
              </div>

              <div style={styles.analyticsCard}>
                <h3 style={styles.analyticsTitle}>By Risk Level</h3>
                {['low', 'moderate', 'high'].map(risk => {
                  const riskInvestments = investments.filter(inv => inv.investment_products?.risk_level === risk);
                  const riskTotal = riskInvestments.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
                  return (
                    <div key={risk} style={styles.analyticsStat}>
                      <span style={{
                        color: risk === 'low' ? '#10b981' : risk === 'moderate' ? '#f59e0b' : '#ef4444'
                      }}>
                        {risk.toUpperCase()}:
                      </span>
                      <strong>{formatCurrency(riskTotal)} ({riskInvestments.length})</strong>
                    </div>
                  );
                })}
              </div>

              <div style={styles.analyticsCard}>
                <h3 style={styles.analyticsTitle}>Product Overview</h3>
                <div style={styles.analyticsStat}>
                  <span>Total Products:</span>
                  <strong>{investmentProducts.length}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Active Products:</span>
                  <strong>{investmentProducts.filter(p => p.is_active).length}</strong>
                </div>
                <div style={styles.analyticsStat}>
                  <span>Inactive Products:</span>
                  <strong>{investmentProducts.filter(p => !p.is_active).length}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {showProductModal && (
          <div style={styles.modalOverlay} onClick={() => setShowProductModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Create Investment Product</h2>
              <form onSubmit={handleCreateProduct}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Product Name *</label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Type *</label>
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
                      <option value="fixed_deposit">Fixed Deposit</option>
                      <option value="crypto">Crypto</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Risk Level *</label>
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
                    <label style={styles.label}>Minimum Investment ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.min_investment}
                      onChange={(e) => setNewProduct({...newProduct, min_investment: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Annual Return (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.annual_return}
                      onChange={(e) => setNewProduct({...newProduct, annual_return: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Expense Ratio (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.expense_ratio}
                      onChange={(e) => setNewProduct({...newProduct, expense_ratio: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Dividend Yield (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.dividend_yield}
                      onChange={(e) => setNewProduct({...newProduct, dividend_yield: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Maturity (months)</label>
                    <input
                      type="number"
                      value={newProduct.maturity_months || ''}
                      onChange={(e) => setNewProduct({...newProduct, maturity_months: e.target.value})}
                      style={styles.input}
                      placeholder="Leave empty if no maturity"
                    />
                  </div>
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
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newProduct.is_active}
                      onChange={(e) => setNewProduct({...newProduct, is_active: e.target.checked})}
                    />
                    Active (available for investment)
                  </label>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowProductModal(false)}>
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

        {showEditProductModal && editProduct && (
          <div style={styles.modalOverlay} onClick={() => setShowEditProductModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Investment Product</h2>
              <form onSubmit={handleEditProduct}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Product Name *</label>
                    <input
                      type="text"
                      value={editProduct.name}
                      onChange={(e) => setEditProduct({...editProduct, name: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Type *</label>
                    <select
                      value={editProduct.type}
                      onChange={(e) => setEditProduct({...editProduct, type: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="stock">Stock</option>
                      <option value="bond">Bond</option>
                      <option value="mutual_fund">Mutual Fund</option>
                      <option value="etf">ETF</option>
                      <option value="fixed_deposit">Fixed Deposit</option>
                      <option value="crypto">Crypto</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Risk Level *</label>
                    <select
                      value={editProduct.risk_level}
                      onChange={(e) => setEditProduct({...editProduct, risk_level: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Minimum Investment ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.min_investment}
                      onChange={(e) => setEditProduct({...editProduct, min_investment: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Annual Return (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.annual_return}
                      onChange={(e) => setEditProduct({...editProduct, annual_return: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Expense Ratio (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.expense_ratio}
                      onChange={(e) => setEditProduct({...editProduct, expense_ratio: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Dividend Yield (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.dividend_yield}
                      onChange={(e) => setEditProduct({...editProduct, dividend_yield: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Maturity (months)</label>
                    <input
                      type="number"
                      value={editProduct.maturity_months || ''}
                      onChange={(e) => setEditProduct({...editProduct, maturity_months: e.target.value || null})}
                      style={styles.input}
                      placeholder="Leave empty if no maturity"
                    />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={editProduct.description || ''}
                    onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                    style={{...styles.input, minHeight: '80px'}}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editProduct.is_active}
                      onChange={(e) => setEditProduct({...editProduct, is_active: e.target.checked})}
                    />
                    Active (available for investment)
                  </label>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowEditProductModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showInvestmentModal && (
          <div style={styles.modalOverlay} onClick={() => setShowInvestmentModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Create New Investment</h2>
              <form onSubmit={handleCreateInvestment}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select User *</label>
                  <select
                    value={newInvestment.user_id}
                    onChange={(e) => {
                      setNewInvestment({...newInvestment, user_id: e.target.value, account_id: ''});
                    }}
                    style={styles.input}
                    required
                  >
                    <option value="">-- Select User --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.email} {user.first_name ? `(${user.first_name} ${user.last_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {newInvestment.user_id && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Account *</label>
                    <select
                      value={newInvestment.account_id}
                      onChange={(e) => setNewInvestment({...newInvestment, account_id: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="">-- Select Account --</option>
                      {getUserAccounts(newInvestment.user_id).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} ({acc.account_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Investment Product *</label>
                  <select
                    value={newInvestment.product_id}
                    onChange={(e) => setNewInvestment({...newInvestment, product_id: e.target.value})}
                    style={styles.input}
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {investmentProducts.filter(p => p.is_active).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Min: {formatCurrency(product.min_investment)})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Investment Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestment.amount_invested}
                    onChange={(e) => setNewInvestment({...newInvestment, amount_invested: e.target.value})}
                    style={styles.input}
                    required
                    min="0"
                  />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowInvestmentModal(false)}>
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

        {showEditInvestmentModal && editInvestment && (
          <div style={styles.modalOverlay} onClick={() => setShowEditInvestmentModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Investment</h2>
              <form onSubmit={handleEditInvestment}>
                <div style={styles.infoBox}>
                  <p><strong>User:</strong> {editInvestment.profiles?.email}</p>
                  <p><strong>Product:</strong> {editInvestment.investment_products?.name}</p>
                  <p><strong>Invested:</strong> {formatCurrency(editInvestment.amount_invested)}</p>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editInvestment.current_value}
                    onChange={(e) => setEditInvestment({...editInvestment, current_value: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={editInvestment.status}
                    onChange={(e) => setEditInvestment({...editInvestment, status: e.target.value})}
                    style={styles.input}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowEditInvestmentModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && deleteTarget && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.confirmTitle}>Confirm Delete</h2>
              <p style={styles.confirmText}>
                Are you sure you want to delete this {deleteTarget.deleteType}?
                {deleteTarget.deleteType === 'product' && (
                  <strong style={{display: 'block', marginTop: '8px'}}>
                    {deleteTarget.name}
                  </strong>
                )}
                {deleteTarget.deleteType === 'investment' && (
                  <strong style={{display: 'block', marginTop: '8px'}}>
                    {deleteTarget.investment_products?.name} - {formatCurrency(deleteTarget.amount_invested)}
                  </strong>
                )}
              </p>
              <p style={styles.warningText}>This action cannot be undone.</p>
              <div style={styles.modalActions}>
                <button style={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button 
                  style={styles.confirmDeleteBtn} 
                  onClick={deleteTarget.deleteType === 'product' ? handleDeleteProduct : handleDeleteInvestment}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: 'clamp(12px, 3vw, 24px)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    color: '#64748b',
    margin: '4px 0 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '500'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '500'
  },
  closeBannerBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
    fontWeight: '500'
  },
  statValue: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    overflowX: 'auto',
    paddingBottom: '4px'
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    color: '#64748b'
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(16px, 3vw, 24px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    alignItems: 'center'
  },
  searchInput: {
    flex: '1',
    minWidth: '200px',
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    minWidth: '140px'
  },
  addButton: {
    padding: '10px 20px',
    backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px'
  },
  investmentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0'
  },
  productCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#1e293b',
    marginTop: '4px'
  },
  productDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 16px 0',
    lineHeight: '1.5'
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  editBtn: {
    padding: '8px 16px',
    backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  closeBtn: {
    padding: '8px 16px',
    backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  approveBtn: {
    padding: '8px 16px',
    backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deactivateBtn: {
    padding: '8px 16px',
    backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '8px 16px',
    backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    fontSize: '14px',
    gridColumn: '1 / -1'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  analyticsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0'
  },
  analyticsTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  analyticsStat: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  confirmText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0'
  },
  warningText: {
    fontSize: '13px',
    color: '#ef4444',
    margin: '0 0 20px 0'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmDeleteBtn: {
    padding: '10px 20px',
    backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
