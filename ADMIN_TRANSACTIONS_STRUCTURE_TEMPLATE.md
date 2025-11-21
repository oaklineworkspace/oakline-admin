# Admin Transactions Page - Complete Structure & Layout Template

Copy this template to build any admin page with the same structure as admin-transactions.

---

## 1. FILE STRUCTURE & IMPORTS

```javascript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';
import { adminPageStyles as styles } from '../../lib/adminPageStyles';
```

---

## 2. CONSTANTS & VALIDATIONS

```javascript
const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit', 'deposit', 'withdrawal', 'transfer'];
```

---

## 3. STATE MANAGEMENT

```javascript
export default function AdminTransactions() {
  const router = useRouter();
  
  // Data State
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('all');
  
  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });
  
  // Form State
  const [editForm, setEditForm] = useState({
    field1: '',
    field2: '',
    field3: ''
  });
  
  const [createForm, setCreateForm] = useState({
    field1: '',
    field2: ''
  });
}
```

---

## 4. EFFECT HOOKS

```javascript
useEffect(() => {
  fetchItems();
  fetchUsers();

  // Real-time subscription
  const subscription = supabase
    .channel('items_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'items' }, 
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

// Filter items when dependencies change
useEffect(() => {
  filterItems();
}, [items, searchTerm, statusFilter, typeFilter, userFilter, dateFilter, dateRange, activeTab]);
```

---

## 5. FETCH FUNCTIONS

```javascript
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users_table')
      .select('id, name, email')
      .order('name');
    
    if (error) throw error;
    setUsers(data || []);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

const fetchItems = async () => {
  try {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('items_table')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setItems(data || []);
  } catch (error) {
    console.error('Error fetching items:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 6. FILTER FUNCTION

```javascript
const filterItems = () => {
  let filtered = items.filter(item => {
    // Search filter
    if (searchTerm && !item.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }

    // User filter
    if (userFilter !== 'all' && item.user_id !== userFilter) {
      return false;
    }

    // Date range filter
    if (dateFilter === 'range' && dateRange.start && dateRange.end) {
      const itemDate = new Date(item.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }

    return true;
  });

  // Tab filtering
  if (activeTab !== 'all') {
    filtered = filtered.filter(item => item.status === activeTab);
  }

  setFilteredItems(filtered);
};
```

---

## 7. ACTION HANDLERS

```javascript
const handleSelectItem = (itemId) => {
  setSelectedItems(prev =>
    prev.includes(itemId)
      ? prev.filter(id => id !== itemId)
      : [...prev, itemId]
  );
};

const handleSelectAll = () => {
  setSelectedItems(
    selectedItems.length === filteredItems.length
      ? []
      : filteredItems.map(item => item.id)
  );
};

const handleEditItem = (item) => {
  setSelectedItem(item);
  setEditForm({
    field1: item.field1,
    field2: item.field2
  });
  setShowEditModal(true);
};

const handleUpdateItem = async (e) => {
  e.preventDefault();
  try {
    setActionLoading(true);
    setError('');

    const { error } = await supabase
      .from('items_table')
      .update(editForm)
      .eq('id', selectedItem.id);

    if (error) throw error;

    setSuccess('Item updated successfully!');
    setShowEditModal(false);
    fetchItems();
  } catch (error) {
    setError(error.message);
  } finally {
    setActionLoading(false);
  }
};

const handleDeleteItem = async (item) => {
  if (!window.confirm('Are you sure? This cannot be undone.')) return;

  try {
    setActionLoading(true);
    const { error } = await supabase
      .from('items_table')
      .delete()
      .eq('id', item.id);

    if (error) throw error;

    setSuccess('Item deleted successfully!');
    fetchItems();
  } catch (error) {
    setError(error.message);
  } finally {
    setActionLoading(false);
  }
};

const handleCreateItem = async (e) => {
  e.preventDefault();
  try {
    setActionLoading(true);
    setError('');

    const { error } = await supabase
      .from('items_table')
      .insert([createForm]);

    if (error) throw error;

    setSuccess('Item created successfully!');
    setShowCreateModal(false);
    setCreateForm({ field1: '', field2: '' });
    fetchItems();
  } catch (error) {
    setError(error.message);
  } finally {
    setActionLoading(false);
  }
};
```

---

## 8. RENDER - COMPLETE JSX STRUCTURE

```javascript
return (
  <AdminAuth>
    <div style={styles.container}>
      
      {/* Loading Banner */}
      <AdminLoadingBanner
        visible={loadingBanner.visible}
        current={loadingBanner.current}
        total={loadingBanner.total}
        action={loadingBanner.action}
        message={loadingBanner.message}
      />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Page Title</h1>
          <p style={styles.subtitle}>Manage your data here</p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/admin/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
          <button style={styles.refreshButton} onClick={fetchItems}>
            🔄 Refresh
          </button>
          <button style={styles.addButton} onClick={() => setShowCreateModal(true)}>
            ➕ Add New
          </button>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError('')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>×</button>
        </div>
      )}
      {success && (
        <div style={styles.successBanner}>
          {success}
          <button onClick={() => setSuccess('')} style={{background: 'none', border: 'none', cursor: 'pointer'}}>×</button>
        </div>
      )}

      {/* Stats Grid (Optional) */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Items</p>
          <p style={styles.statValue}>{items.length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Pending</p>
          <p style={styles.statValue}>{items.filter(i => i.status === 'pending').length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Completed</p>
          <p style={styles.statValue}>{items.filter(i => i.status === 'completed').length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Failed</p>
          <p style={styles.statValue}>{items.filter(i => i.status === 'failed').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['all', 'pending', 'completed', 'failed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters Section */}
      <div style={styles.filtersSection}>
        <div style={styles.selectAllContainer}>
          <input
            type="checkbox"
            checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
            onChange={handleSelectAll}
            style={styles.checkbox}
          />
          <label style={styles.selectAllLabel}>
            Select All ({selectedItems.length}/{filteredItems.length})
          </label>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          {VALID_STATUSES.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Users</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      {dateFilter === 'range' && (
        <div style={styles.dateRangeSection}>
          <label style={styles.dateRangeLabel}>📅 Filter by Date Range</label>
          <div style={styles.dateRangeInputs}>
            <div style={styles.dateInputGroup}>
              <label style={styles.dateLabel}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.dateInputGroup}>
              <label style={styles.dateLabel}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={styles.dateInput}
              />
            </div>
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                style={styles.clearDateButton}
              >
                ✕ Clear Dates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Container */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📋</p>
            <p style={styles.emptyText}>No items found</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                style={{
                  ...styles.card,
                  ...(selectedItems.includes(item.id) ? styles.cardSelected : {})
                }}
              >
                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      style={styles.checkbox}
                    />
                  </div>
                  <div style={styles.cardInfoContainer}>
                    <h3 style={styles.cardTitle}>{item.name}</h3>
                    <p style={styles.cardSubtitle}>{item.user_name}</p>
                  </div>
                  <div>
                    <span style={{...styles.badge, ...getStatusBadgeStyle(item.status)}}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={styles.cardBody}>
                  <div style={styles.cardInfo}>
                    <span style={styles.infoLabel}>Field 1:</span>
                    <span style={styles.infoValue}>{item.field1}</span>
                  </div>
                  <div style={styles.cardInfo}>
                    <span style={styles.infoLabel}>Field 2:</span>
                    <span style={styles.infoValue}>{item.field2}</span>
                  </div>
                  <div style={styles.cardInfo}>
                    <span style={styles.infoLabel}>Date:</span>
                    <span style={styles.infoValue}>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={styles.cardFooter}>
                  <button
                    onClick={() => handleEditItem(item)}
                    style={styles.editButton}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    style={styles.deleteButton}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Item</h2>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleUpdateItem}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Field 1 *</label>
                    <input
                      type="text"
                      value={editForm.field1}
                      onChange={(e) => setEditForm({ ...editForm, field1: e.target.value })}
                      style={styles.formInput}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Field 2 *</label>
                    <input
                      type="text"
                      value={editForm.field2}
                      onChange={(e) => setEditForm({ ...editForm, field2: e.target.value })}
                      style={styles.formInput}
                      required
                    />
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <strong>Item ID:</strong> {selectedItem.id}
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={styles.cancelButton}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.confirmButton}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Item</h2>
              <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Field 1 *</label>
                    <input
                      type="text"
                      value={createForm.field1}
                      onChange={(e) => setCreateForm({ ...createForm, field1: e.target.value })}
                      style={styles.formInput}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Field 2 *</label>
                    <input
                      type="text"
                      value={createForm.field2}
                      onChange={(e) => setCreateForm({ ...createForm, field2: e.target.value })}
                      style={styles.formInput}
                      required
                    />
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelButton}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.confirmButton}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <AdminFooter />
    </div>
  </AdminAuth>
);
```

---

## 9. HELPER FUNCTIONS

```javascript
const getStatusBadgeStyle = (status) => {
  switch(status) {
    case 'completed':
      return { ...styles.badge, backgroundColor: '#d1fae5', color: '#065f46' };
    case 'pending':
      return { ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' };
    case 'failed':
      return { ...styles.badge, backgroundColor: '#fee2e2', color: '#991b1b' };
    default:
      return styles.badge;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

---

## 10. QUICK COPY-PASTE CHECKLIST

When building a new admin page, make sure you have:

- [ ] Imports (React, Next.js, components, supabase, styles)
- [ ] Constants (VALID_STATUSES, VALID_TYPES, etc)
- [ ] State variables (data, filters, modals, forms)
- [ ] useEffect hooks (fetch on mount, filter on dependency change)
- [ ] Fetch functions (fetchData, fetchUsers)
- [ ] Filter function (filterData - runs on every filter change)
- [ ] Action handlers (handleSelect, handleEdit, handleDelete, handleCreate, handleUpdate)
- [ ] JSX Structure:
  - Container
  - Loading Banner
  - Header with actions
  - Error/Success banners
  - Stats grid (optional)
  - Tabs
  - Filters section
  - Date range filter
  - Content container (loading/empty/data states)
  - Data grid with cards
  - Edit modal
  - Create modal
  - Footer
- [ ] Helper functions (formatting, status badges)

---

## 11. USAGE IN YOUR FRONTEND REPO

Copy `lib/adminPageStyles.js` to your project, then import it:

```javascript
import { adminPageStyles as styles } from '../../lib/adminPageStyles';
```

And use the style objects throughout your page:
- `style={styles.container}` - Main wrapper
- `style={styles.card}` - Data cards
- `style={styles.modal}` - Modal dialogs
- `style={styles.formInput}` - Form fields
- etc.

---

All done! You now have the complete structure extracted from admin-transactions.
