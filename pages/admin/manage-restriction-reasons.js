import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function ManageRestrictionReasons() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('restriction'); // 'restriction' or 'restoration'
  const [reasons, setReasons] = useState([]);
  const [filteredReasons, setFilteredReasons] = useState([]);
  const [stats, setStats] = useState(null);
  const [usageStats, setUsageStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentReason, setCurrentReason] = useState(null);
  
  const [formData, setFormData] = useState({
    action_type: 'ban_user',
    category: '',
    reason_text: '',
    contact_email: 'contact-us@theoaklinebank.com',
    severity_level: 'medium',
    requires_immediate_action: false,
    display_order: 0
  });

  const [bankEmails, setBankEmails] = useState([]);
  const [categories, setCategories] = useState([]);

  const restrictionActionTypes = [
    { value: 'ban_user', label: 'Ban User' },
    { value: 'lock_account', label: 'Lock Account' },
    { value: 'force_password_reset', label: 'Force Password Reset' },
    { value: 'sign_out_all_devices', label: 'Sign Out All Devices' },
    { value: 'suspend_account', label: 'Suspend Account' },
    { value: 'close_account', label: 'Close Account' }
  ];

  const restorationActionTypes = [
    { value: 'unban_user', label: 'Unban User' },
    { value: 'lift_suspension', label: 'Lift Suspension' },
    { value: 'unlock_account', label: 'Unlock Account' },
    { value: 'reactivate_account', label: 'Reactivate Account' }
  ];

  const actionTypes = activeTab === 'restriction' ? restrictionActionTypes : restorationActionTypes;

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchReasons();
    fetchBankEmails();
    fetchUsageStats();
  }, [activeTab]);

  useEffect(() => {
    filterReasons();
  }, [reasons, searchTerm, actionTypeFilter, categoryFilter, severityFilter, statusFilter]);

  const fetchBankEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('email_info, email_contact, email_security, email_support, email_crypto, email_loans')
        .limit(1)
        .single();

      if (error) throw error;

      const emails = [];
      if (data.email_info) emails.push(data.email_info);
      if (data.email_contact) emails.push(data.email_contact);
      if (data.email_security) emails.push(data.email_security);
      if (data.email_support) emails.push(data.email_support);
      if (data.email_crypto) emails.push(data.email_crypto);
      if (data.email_loans) emails.push(data.email_loans);

      setBankEmails([...new Set(emails)]);
    } catch (err) {
      console.error('Error fetching bank emails:', err);
    }
  };



  const fetchUsageStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch usage statistics from audit logs
      const { data: auditLogs, error } = await supabase
        .from('account_status_audit_log')
        .select('reason, metadata')
        .not('reason', 'is', null);

      if (!error && auditLogs) {
        const stats = {};
        auditLogs.forEach(log => {
          const reason = log.reason;
          if (reason) {
            stats[reason] = (stats[reason] || 0) + 1;
          }
        });
        setUsageStats(stats);
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const fetchReasons = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        router.push('/admin/login');
        return;
      }

      const endpoint = activeTab === 'restriction' 
        ? '/api/admin/get-all-restriction-reasons'
        : '/api/admin/get-all-restoration-reasons';

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reasons');
      }

      const result = await response.json();
      setReasons(result.reasons || []);
      setStats(result.stats || null);

      const uniqueCategories = [...new Set(result.reasons.map(r => r.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reasons:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterReasons = () => {
    let filtered = [...reasons];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.reason_text.toLowerCase().includes(search) ||
        r.category.toLowerCase().includes(search) ||
        r.contact_email.toLowerCase().includes(search)
      );
    }

    if (actionTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.action_type === actionTypeFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(r => r.severity_level === severityFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(r => r.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(r => !r.is_active);
    }

    setFilteredReasons(filtered);
  };

  const handleAddNew = () => {
    setModalMode('add');
    setCurrentReason(null);
    const defaultActionType = activeTab === 'restriction' ? 'ban_user' : 'unban_user';
    setFormData({
      action_type: defaultActionType,
      category: '',
      reason_text: '',
      contact_email: bankEmails[0] || 'contact-us@theoaklinebank.com',
      severity_level: 'medium',
      requires_immediate_action: false,
      display_order: 0
    });
    setShowModal(true);
  };

  const handleEdit = (reason) => {
    setModalMode('edit');
    setCurrentReason(reason);
    setFormData({
      action_type: reason.action_type,
      category: reason.category,
      reason_text: reason.reason_text,
      contact_email: reason.contact_email,
      severity_level: reason.severity_level,
      requires_immediate_action: reason.requires_immediate_action,
      display_order: reason.display_order
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const endpoint = activeTab === 'restriction'
        ? '/api/admin/manage-restriction-reason'
        : '/api/admin/manage-restoration-reason';
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const body = modalMode === 'add' 
        ? formData 
        : { ...formData, id: currentReason.id };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save reason');
      }

      setSuccess(result.message);
      setShowModal(false);
      await fetchReasons();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (reasonId, softDelete = true) => {
    if (!confirm(softDelete 
      ? 'Deactivate this reason? It will no longer appear in selection lists.' 
      : 'Permanently delete this reason? This cannot be undone!')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const endpoint = activeTab === 'restriction'
        ? '/api/admin/manage-restriction-reason'
        : '/api/admin/manage-restoration-reason';

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: reasonId, soft_delete: softDelete })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete reason');
      }

      setSuccess(result.message);
      await fetchReasons();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleActivate = async (reasonId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const endpoint = activeTab === 'restriction'
        ? '/api/admin/manage-restriction-reason'
        : '/api/admin/manage-restoration-reason';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: reasonId, is_active: true })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate reason');
      }

      setSuccess('Reason activated successfully');
      await fetchReasons();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminAuth>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '15px', 
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{ marginBottom: '30px' }}>
              {/* Tab Switcher */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
                <button
                  onClick={() => setActiveTab('restriction')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: activeTab === 'restriction' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f7fafc',
                    color: activeTab === 'restriction' ? 'white' : '#4a5568',
                    borderBottom: activeTab === 'restriction' ? 'none' : '2px solid #e2e8f0',
                    fontSize: '15px'
                  }}
                >
                  🔒 Restriction Reasons
                </button>
                <button
                  onClick={() => setActiveTab('restoration')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: activeTab === 'restoration' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f7fafc',
                    color: activeTab === 'restoration' ? 'white' : '#4a5568',
                    borderBottom: activeTab === 'restoration' ? 'none' : '2px solid #e2e8f0',
                    fontSize: '15px'
                  }}
                >
                  ✅ Restoration Reasons
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', marginBottom: '10px' }}>
                    {activeTab === 'restriction' ? '🔒 Manage Account Restriction Reasons' : '✅ Manage Account Restoration Reasons'}
                  </h1>
                  <p style={{ color: '#718096' }}>
                    {activeTab === 'restriction' 
                      ? 'Manage professional reasons for account restrictions with appropriate contact information'
                      : 'Manage professional reasons for restoring user access with appropriate contact information'}
                  </p>
                </div>
                <button
                  onClick={handleAddNew}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ➕ Add New Reason
                </button>
              </div>

              <Link href="/admin/dashboard">
                <a style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
                  ← Back to Dashboard
                </a>
              </Link>
            </div>

            {/* Messages */}
            {error && (
              <div style={{ 
                background: '#fed7d7', 
                color: '#9b2c2c', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #fc8181'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ 
                background: '#c6f6d5', 
                color: '#22543d', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #68d391'
              }}>
                {success}
              </div>
            )}

            {/* Stats Cards */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748' }}>{stats.total}</div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>Total Reasons</div>
                </div>
                <div style={{ background: '#f0fff4', padding: '20px', borderRadius: '10px', border: '1px solid #9ae6b4' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22543d' }}>{stats.active}</div>
                  <div style={{ color: '#2f855a', fontSize: '14px' }}>Active Reasons</div>
                </div>
                <div style={{ background: '#fffaf0', padding: '20px', borderRadius: '10px', border: '1px solid #fbd38d' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c2d12' }}>{stats.inactive}</div>
                  <div style={{ color: '#c05621', fontSize: '14px' }}>Inactive Reasons</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={{ 
              background: '#f7fafc', 
              padding: '20px', 
              borderRadius: '10px', 
              marginBottom: '25px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search reasons..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    Action Type
                  </label>
                  <select
                    value={actionTypeFilter}
                    onChange={(e) => setActionTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Action Types</option>
                    {actionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    Severity
                  </label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Severities</option>
                    {severityLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#718096' }}>
                Showing {filteredReasons.length} of {reasons.length} reasons
              </div>
            </div>

            {/* Reasons Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                Loading restriction reasons...
              </div>
            ) : filteredReasons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                No reasons found matching your filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Action Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Category</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Reason Text</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Contact Email</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Severity</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Usage</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReasons.map((reason, index) => {
                      const severityInfo = severityLevels.find(s => s.value === reason.severity_level);
                      const actionTypeInfo = actionTypes.find(a => a.value === reason.action_type);
                      
                      return (
                        <tr 
                          key={reason.id}
                          style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            background: index % 2 === 0 ? 'white' : '#f7fafc',
                            opacity: reason.is_active ? 1 : 0.6
                          }}
                        >
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            <span style={{ 
                              background: '#edf2f7', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {actionTypeInfo?.label || reason.action_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#4a5568' }}>
                            {reason.category}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#2d3748', maxWidth: '400px' }}>
                            {reason.reason_text}
                            {reason.requires_immediate_action && (
                              <span style={{ 
                                marginLeft: '8px',
                                background: '#fed7d7',
                                color: '#c53030',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                URGENT
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#667eea' }}>
                            {reason.contact_email}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span className={severityInfo?.color} style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {severityInfo?.label || reason.severity_level}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              background: usageStats[reason.reason_text] > 0 ? '#dbeafe' : '#f3f4f6',
                              color: usageStats[reason.reason_text] > 0 ? '#1e40af' : '#6b7280',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {usageStats[reason.reason_text] || 0} uses
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {reason.is_active ? (
                              <span style={{ 
                                background: '#c6f6d5', 
                                color: '#22543d',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                Active
                              </span>
                            ) : (
                              <span style={{ 
                                background: '#fed7d7', 
                                color: '#9b2c2c',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleEdit(reason)}
                                style={{
                                  background: '#667eea',
                                  color: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                Edit
                              </button>
                              {reason.is_active ? (
                                <button
                                  onClick={() => handleDelete(reason.id, true)}
                                  style={{
                                    background: '#f56565',
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(reason.id)}
                                  style={{
                                    background: '#48bb78',
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '30px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1a202c' }}>
                {modalMode === 'add' ? '➕ Add New Restriction Reason' : '✏️ Edit Restriction Reason'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                    Action Type *
                  </label>
                  <select
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    {actionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    placeholder="e.g., Fraud & Suspicious Activity"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                    Reason Text *
                  </label>
                  <textarea
                    value={formData.reason_text}
                    onChange={(e) => setFormData({ ...formData, reason_text: e.target.value })}
                    required
                    rows={4}
                    placeholder="Professional reason with contact instructions..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                    Contact Email *
                  </label>
                  <select
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    {bankEmails.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                      Severity Level *
                    </label>
                    <select
                      value={formData.severity_level}
                      onChange={(e) => setFormData({ ...formData, severity_level: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e0',
                        fontSize: '14px'
                      }}
                    >
                      {severityLevels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e0',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.requires_immediate_action}
                      onChange={(e) => setFormData({ ...formData, requires_immediate_action: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>
                      Requires Immediate Action
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: '#e2e8f0',
                      color: '#4a5568',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {modalMode === 'add' ? 'Add Reason' : 'Update Reason'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}
