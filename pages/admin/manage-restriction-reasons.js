import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import AdminLoadingBanner from '../../components/AdminLoadingBanner';
import { supabase } from '../../lib/supabaseClient';

export default function ManageRestrictionReasons() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('restriction'); // 'restriction', 'restoration', or 'display_messages'
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
  
  // Display Messages State
  const [displayMessages, setDisplayMessages] = useState([]);
  const [filteredDisplayMessages, setFilteredDisplayMessages] = useState([]);
  const [restrictionReasons, setRestrictionReasons] = useState([]);
  const [restorationReasons, setRestorationReasons] = useState([]);
  const [displayMessageFormData, setDisplayMessageFormData] = useState({
    restriction_reason_id: '',
    reason_type: 'restriction',
    message_text: '',
    message_type: 'standard',
    severity_level: 'medium',
    is_default: false,
    display_order: 0,
    is_active: true
  });
  const [currentDisplayMessage, setCurrentDisplayMessage] = useState(null);
  const [messageTypeFilter, setMessageTypeFilter] = useState('all');
  
  const [loadingBanner, setLoadingBanner] = useState({
    visible: false,
    current: 0,
    total: 0,
    action: '',
    message: ''
  });

  const [successBanner, setSuccessBanner] = useState({
    visible: false,
    message: '',
    action: ''
  });

  const predefinedCategories = [
    'Security',
    'Compliance',
    'Fraud & Suspicious Activity',
    'Verification',
    'Appeals',
    'Legal',
    'Technical',
    'Policy Violation',
    'Identity Verification',
    'Inactivity',
    'Other'
  ];

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
    if (activeTab === 'display_messages') {
      fetchDisplayMessages();
      fetchRestrictionReasons();
    } else {
      fetchReasons();
      fetchBankEmails();
      fetchUsageStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'display_messages') {
      filterDisplayMessages();
    } else {
      filterReasons();
    }
  }, [reasons, displayMessages, searchTerm, actionTypeFilter, categoryFilter, severityFilter, statusFilter, messageTypeFilter]);

  const fetchBankEmails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session for fetching bank emails');
        setBankEmails([]);
        return;
      }

      const response = await fetch('/api/admin/get-bank-emails', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch bank emails:', errorData.error);
        setBankEmails([]);
        return;
      }

      const result = await response.json();
      setBankEmails(result.emails || []);
    } catch (err) {
      console.error('Error fetching bank emails:', err);
      setBankEmails([]);
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

  const fetchDisplayMessages = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in');
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/get-all-display-messages', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch display messages');
      }

      const result = await response.json();
      setDisplayMessages(result.messages || []);
      setStats(result.stats || null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching display messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestrictionReasons = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [restrictRes, restoreRes] = await Promise.all([
        fetch('/api/admin/get-all-restriction-reasons', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch('/api/admin/get-all-restoration-reasons', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      if (restrictRes.ok) {
        const result = await restrictRes.json();
        setRestrictionReasons(result.reasons || []);
      }
      if (restoreRes.ok) {
        const result = await restoreRes.json();
        setRestorationReasons(result.reasons || []);
      }
    } catch (err) {
      console.error('Error fetching reasons for dropdown:', err);
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

  const filterDisplayMessages = () => {
    let filtered = [...displayMessages];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.message_text.toLowerCase().includes(search) ||
        (m.restriction_reason && m.restriction_reason.reason_text.toLowerCase().includes(search))
      );
    }

    if (messageTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.message_type === messageTypeFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(m => m.severity_level === severityFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(m => m.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(m => !m.is_active);
    }

    setFilteredDisplayMessages(filtered);
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

    // Validate required fields
    if (!formData.action_type) {
      setError('Action Type is required');
      return;
    }
    if (!formData.category) {
      setError('Category is required');
      return;
    }
    if (!formData.reason_text || !formData.reason_text.trim()) {
      setError('Reason Text is required');
      return;
    }
    if (!formData.contact_email) {
      setError('Contact Email is required. Please configure bank details first.');
      return;
    }

    // Show loading banner
    setLoadingBanner({
      visible: true,
      current: 1,
      total: 1,
      action: modalMode === 'add' ? 'Adding Reason' : 'Updating Reason',
      message: modalMode === 'add' ? 'Creating new restriction reason...' : 'Updating restriction reason...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
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
        throw new Error(result.error || result.details?.message || 'Failed to save reason');
      }

      // Hide loading banner
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      
      // Show success banner
      setSuccessBanner({
        visible: true,
        message: result.message || 'Reason saved successfully',
        action: modalMode === 'add' ? 'Add Reason' : 'Update Reason'
      });
      
      setShowModal(false);
      await fetchReasons();

      // Auto-hide success banner after 5 seconds
      setTimeout(() => {
        setSuccessBanner({ visible: false, message: '', action: '' });
      }, 5000);
    } catch (err) {
      console.error('Form submission error:', err);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setError(err.message || 'An error occurred while saving the reason');
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

  // Display Message CRUD Handlers
  const handleAddNewDisplayMessage = () => {
    setModalMode('add');
    setCurrentDisplayMessage(null);
    setDisplayMessageFormData({
      restriction_reason_id: '',
      reason_type: 'restriction',
      message_text: '',
      message_type: 'standard',
      severity_level: 'medium',
      is_default: false,
      display_order: 0,
      is_active: true
    });
    setShowModal(true);
  };

  const handleEditDisplayMessage = (message) => {
    setModalMode('edit');
    setCurrentDisplayMessage(message);
    setDisplayMessageFormData({
      restriction_reason_id: message.restriction_reason_id,
      reason_type: message.reason_type || 'restriction',
      message_text: message.message_text,
      message_type: message.message_type,
      severity_level: message.severity_level,
      is_default: message.is_default,
      display_order: message.display_order,
      is_active: message.is_active !== undefined ? message.is_active : true
    });
    setShowModal(true);
  };

  const handleSubmitDisplayMessage = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayMessageFormData.restriction_reason_id) {
      setError('Please select a restriction reason');
      return;
    }
    if (!displayMessageFormData.message_text || !displayMessageFormData.message_text.trim()) {
      setError('Message text is required');
      return;
    }

    setLoadingBanner({
      visible: true,
      current: 1,
      total: 1,
      action: modalMode === 'add' ? 'Adding Display Message' : 'Updating Display Message',
      message: modalMode === 'add' ? 'Creating new display message...' : 'Updating display message...'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
        setError('Session expired. Please log in again.');
        return;
      }

      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const body = modalMode === 'add' 
        ? displayMessageFormData 
        : { ...displayMessageFormData, id: currentDisplayMessage.id };

      const response = await fetch('/api/admin/manage-display-message', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details?.message || 'Failed to save display message');
      }

      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setSuccessBanner({
        visible: true,
        message: result.message || 'Display message saved successfully',
        action: modalMode === 'add' ? 'Add Display Message' : 'Update Display Message'
      });
      
      setShowModal(false);
      await fetchDisplayMessages();

      setTimeout(() => {
        setSuccessBanner({ visible: false, message: '', action: '' });
      }, 5000);
    } catch (err) {
      console.error('Form submission error:', err);
      setLoadingBanner({ visible: false, current: 0, total: 0, action: '', message: '' });
      setError(err.message || 'An error occurred while saving the display message');
    }
  };

  const handleDeleteDisplayMessage = async (messageId, softDelete = true) => {
    if (!confirm(softDelete 
      ? 'Deactivate this display message? It will no longer appear in selection lists.' 
      : 'Permanently delete this display message? This cannot be undone!')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/admin/manage-display-message', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: messageId, soft_delete: softDelete })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete display message');
      }

      setSuccess(result.message);
      await fetchDisplayMessages();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleActivateDisplayMessage = async (messageId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/admin/manage-display-message', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: messageId, is_active: true })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate display message');
      }

      setSuccess('Display message activated successfully');
      await fetchDisplayMessages();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminAuth>
      <AdminLoadingBanner
        isVisible={loadingBanner.visible}
        current={loadingBanner.current}
        total={loadingBanner.total}
        action={loadingBanner.action}
        message={loadingBanner.message}
      />
      
      {/* Professional Success Banner */}
      {successBanner.visible && (
        <div style={styles.successBannerOverlay} onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}>
          <div style={styles.successBannerContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.successBannerHeader}>
              <div style={styles.successBannerLogo}>🏦 OAKLINE ADMIN</div>
              <div style={styles.successBannerActions}>
                <div style={styles.successBannerIcon}>✅</div>
                <button 
                  onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}
                  style={styles.successBannerClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div style={styles.successBannerContent}>
              <h3 style={styles.successBannerAction}>{successBanner.action}</h3>
              <p style={styles.successBannerMessage}>{successBanner.message}</p>
            </div>
            
            <div style={styles.successBannerFooter}>
              <div style={styles.successBannerCheckmark}>✓ Operation Completed Successfully</div>
              <button
                onClick={() => setSuccessBanner({ visible: false, message: '', action: '' })}
                style={styles.successBannerOkButton}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                <button
                  onClick={() => setActiveTab('display_messages')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: activeTab === 'display_messages' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f7fafc',
                    color: activeTab === 'display_messages' ? 'white' : '#4a5568',
                    borderBottom: activeTab === 'display_messages' ? 'none' : '2px solid #e2e8f0',
                    fontSize: '15px'
                  }}
                >
                  💬 Display Messages
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', marginBottom: '10px' }}>
                    {activeTab === 'restriction' ? '🔒 Manage Account Restriction Reasons' : 
                     activeTab === 'restoration' ? '✅ Manage Account Restoration Reasons' :
                     '💬 Manage Restriction Display Messages'}
                  </h1>
                  <p style={{ color: '#718096' }}>
                    {activeTab === 'restriction' 
                      ? 'Manage professional reasons for account restrictions with appropriate contact information'
                      : activeTab === 'restoration'
                      ? 'Manage professional reasons for restoring user access with appropriate contact information'
                      : 'Manage custom display messages shown to users when their accounts are restricted'}
                  </p>
                </div>
                <button
                  onClick={activeTab === 'display_messages' ? handleAddNewDisplayMessage : handleAddNew}
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
                  {activeTab === 'display_messages' ? '➕ Add New Display Message' : '➕ Add New Reason'}
                </button>
              </div>

              <Link href="/admin/dashboard" legacyBehavior>
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
                  <div style={{ color: '#718096', fontSize: '14px' }}>{activeTab === 'display_messages' ? 'Total Messages' : 'Total Reasons'}</div>
                </div>
                <div style={{ background: '#f0fff4', padding: '20px', borderRadius: '10px', border: '1px solid #9ae6b4' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22543d' }}>{stats.active}</div>
                  <div style={{ color: '#2f855a', fontSize: '14px' }}>{activeTab === 'display_messages' ? 'Active Messages' : 'Active Reasons'}</div>
                </div>
                <div style={{ background: '#fffaf0', padding: '20px', borderRadius: '10px', border: '1px solid #fbd38d' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c2d12' }}>{stats.inactive}</div>
                  <div style={{ color: '#c05621', fontSize: '14px' }}>{activeTab === 'display_messages' ? 'Inactive Messages' : 'Inactive Reasons'}</div>
                </div>
                {activeTab === 'display_messages' && stats.default !== undefined && (
                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af' }}>{stats.default}</div>
                    <div style={{ color: '#3b82f6', fontSize: '14px' }}>Default Messages</div>
                  </div>
                )}
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

                {activeTab !== 'display_messages' && (
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
                )}

                {activeTab === 'display_messages' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                      Message Type
                    </label>
                    <select
                      value={messageTypeFilter}
                      onChange={(e) => setMessageTypeFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e0',
                        fontSize: '14px'
                      }}
                    >
                      <option value="all">All Message Types</option>
                      <option value="standard">Standard</option>
                      <option value="urgent">Urgent</option>
                      <option value="investigation">Investigation</option>
                      <option value="temporary">Temporary</option>
                      <option value="permanent">Permanent</option>
                    </select>
                  </div>
                )}

                {activeTab !== 'display_messages' && (
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
                )}

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
                {activeTab === 'display_messages' 
                  ? `Showing ${filteredDisplayMessages.length} of ${displayMessages.length} display messages`
                  : `Showing ${filteredReasons.length} of ${reasons.length} reasons`
                }
              </div>
            </div>

            {/* Display Messages Table */}
            {activeTab === 'display_messages' ? (
              loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  Loading display messages...
                </div>
              ) : filteredDisplayMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  No display messages found matching your filters.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Restriction Reason</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Message Text</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Severity</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Default</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisplayMessages.map((message, index) => {
                        const severityInfo = severityLevels.find(s => s.value === message.severity_level);
                        
                        return (
                          <tr 
                            key={message.id}
                            style={{ 
                              borderBottom: '1px solid #e2e8f0',
                              background: index % 2 === 0 ? 'white' : '#f7fafc',
                              opacity: message.is_active ? 1 : 0.6
                            }}
                          >
                            <td style={{ padding: '12px', fontSize: '13px', maxWidth: '200px' }}>
                              {message.restriction_reason ? (
                                <div>
                                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                    {message.restriction_reason.category}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#718096' }}>
                                    {message.restriction_reason.reason_text.substring(0, 50)}...
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '12px' }}>No reason linked</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', maxWidth: '300px' }}>
                              {message.message_text.substring(0, 150)}{message.message_text.length > 150 ? '...' : ''}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                              <span style={{ 
                                background: '#edf2f7', 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                textTransform: 'capitalize'
                              }}>
                                {message.message_type}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                background: severityInfo?.color === 'bg-blue-100 text-blue-800' ? '#dbeafe' :
                                           severityInfo?.color === 'bg-yellow-100 text-yellow-800' ? '#fef3c7' :
                                           severityInfo?.color === 'bg-orange-100 text-orange-800' ? '#ffedd5' : '#fee2e2',
                                color: severityInfo?.color === 'bg-blue-100 text-blue-800' ? '#1e40af' :
                                       severityInfo?.color === 'bg-yellow-100 text-yellow-800' ? '#92400e' :
                                       severityInfo?.color === 'bg-orange-100 text-orange-800' ? '#c2410c' : '#991b1b'
                              }}>
                                {severityInfo?.label || message.severity_level}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                              {message.is_default ? (
                                <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Yes</span>
                              ) : (
                                <span style={{ color: '#9ca3af' }}>No</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                background: message.is_active ? '#d1fae5' : '#fee2e2',
                                color: message.is_active ? '#065f46' : '#991b1b'
                              }}>
                                {message.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleEditDisplayMessage(message)}
                                  style={{
                                    background: '#3b82f6',
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
                                {message.is_active ? (
                                  <button
                                    onClick={() => handleDeleteDisplayMessage(message.id, true)}
                                    style={{
                                      background: '#f59e0b',
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
                                    onClick={() => handleActivateDisplayMessage(message.id)}
                                    style={{
                                      background: '#10b981',
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
              )
            ) : (
              /* Reasons Table */
              loading ? (
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
              )
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
                {activeTab === 'display_messages' 
                  ? (modalMode === 'add' ? '➕ Add New Display Message' : '✏️ Edit Display Message')
                  : (modalMode === 'add' ? '➕ Add New Restriction Reason' : '✏️ Edit Restriction Reason')
                }
              </h2>

              <form onSubmit={activeTab === 'display_messages' ? handleSubmitDisplayMessage : handleSubmit}>
                {activeTab === 'display_messages' ? (
                  /* Display Message Form Fields */
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                        Restriction Reason *
                      </label>
                      <select
                        value={displayMessageFormData.restriction_reason_id}
                        onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, restriction_reason_id: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e0',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select a restriction reason...</option>
                        {restrictionReasons.map(reason => (
                          <option key={reason.id} value={reason.id}>
                            {reason.category} - {reason.reason_text.substring(0, 60)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                        Message Text *
                      </label>
                      <textarea
                        value={displayMessageFormData.message_text}
                        onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, message_text: e.target.value })}
                        required
                        rows={5}
                        placeholder="Enter the message that will be displayed to the user..."
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                          Message Type *
                        </label>
                        <select
                          value={displayMessageFormData.message_type}
                          onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, message_type: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e0',
                            fontSize: '14px'
                          }}
                        >
                          <option value="standard">Standard</option>
                          <option value="urgent">Urgent</option>
                          <option value="investigation">Investigation</option>
                          <option value="temporary">Temporary</option>
                          <option value="permanent">Permanent</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                          Severity Level *
                        </label>
                        <select
                          value={displayMessageFormData.severity_level}
                          onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, severity_level: e.target.value })}
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={displayMessageFormData.is_default}
                            onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, is_default: e.target.checked })}
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontSize: '14px', color: '#4a5568' }}>
                            Set as Default Message
                          </span>
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={displayMessageFormData.display_order}
                          onChange={(e) => setDisplayMessageFormData({ ...displayMessageFormData, display_order: parseInt(e.target.value) || 0 })}
                          min="0"
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
                  </>
                ) : (
                  /* Restriction Reason Form Fields */
                  <>
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
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select a category...</option>
                    {predefinedCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
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
                    <option value="">Select an email...</option>
                    {bankEmails.length > 0 ? (
                      bankEmails.map(email => (
                        <option key={email} value={email}>{email}</option>
                      ))
                    ) : (
                      <option disabled>No bank emails configured</option>
                    )}
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
                  </>
                )}

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
                    {activeTab === 'display_messages'
                      ? (modalMode === 'add' ? 'Add Display Message' : 'Update Display Message')
                      : (modalMode === 'add' ? 'Add Reason' : 'Update Reason')
                    }
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



const styles = {
  successBannerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.3s ease-out'
  },
  successBannerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    minWidth: '400px',
    maxWidth: '500px',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out'
  },
  successBannerHeader: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBannerLogo: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '2px',
    textTransform: 'uppercase'
  },
  successBannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  successBannerIcon: {
    fontSize: '32px',
    animation: 'bounce 0.6s ease-in-out'
  },
  successBannerClose: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    fontSize: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    lineHeight: 1,
    padding: 0
  },
  successBannerContent: {
    padding: '30px 20px'
  },
  successBannerAction: {
    margin: '0 0 15px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center'
  },
  successBannerMessage: {
    margin: '0',
    fontSize: '16px',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  successBannerFooter: {
    backgroundColor: '#f0fdf4',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successBannerCheckmark: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  successBannerOkButton: {
    padding: '8px 24px',
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};
