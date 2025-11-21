
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';
import { supabase } from '../../lib/supabaseClient';

export default function ManageBankDetails() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [newEmail, setNewEmail] = useState({ label: '', value: '' });
  const [newColumn, setNewColumn] = useState({ name: '', type: 'text', label: '' });
  const [customEmails, setCustomEmails] = useState([]);
  const [emailFields, setEmailFields] = useState([]);
  const [newEmailField, setNewEmailField] = useState({ fieldName: '', fieldLabel: '', fieldDescription: '', fieldValue: '' });
  const [bulkImportContent, setBulkImportContent] = useState('');
  const [bulkImportPreview, setBulkImportPreview] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    branch_name: '',
    address: '',
    phone: '',
    fax: '',
    website: '',
    logo_url: '',
    customer_service_hours: '',
    additional_info: '',
    email_info: '',
    email_contact: '',
    email_support: '',
    email_loans: '',
    email_notify: '',
    email_updates: '',
    email_welcome: '',
    email_security: '',
    email_verify: '',
    email_crypto: '',
    email_accounts: '',
    email_alerts: '',
    email_billing: '',
    email_cards: '',
    email_compliance: '',
    email_customersupport: '',
    email_disputes: '',
    email_fraud: '',
    email_help: '',
    email_noreply: '',
    email_payments: '',
    email_transfers: '',
    email_checks: '',
    email_deposits: '',
    email_transactions: '',
    routing_number: '',
    swift_code: '',
    nmls_id: ''
  });

  const sanitizeFormData = (data) => {
    const sanitized = {...data};
    // Ensure all email fields have at least empty string instead of undefined
    [
      'email_info', 'email_contact', 'email_support', 'email_loans',
      'email_notify', 'email_updates', 'email_welcome', 'email_security',
      'email_verify', 'email_crypto', 'email_accounts', 'email_alerts',
      'email_billing', 'email_cards', 'email_compliance', 'email_customersupport',
      'email_disputes', 'email_fraud', 'email_help', 'email_noreply',
      'email_payments', 'email_transfers', 'email_checks', 'email_deposits',
      'email_transactions', 'fax', 'website', 'logo_url', 'customer_service_hours',
      'additional_info'
    ].forEach(field => {
      if (sanitized[field] === null || sanitized[field] === undefined) {
        sanitized[field] = '';
      }
    });
    return sanitized;
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/get-bank-details', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bank details');
      }

      if (result.bankDetails) {
        const sanitized = sanitizeFormData(result.bankDetails);
        setFormData(sanitized);
        if (result.bankDetails.custom_emails) {
          setCustomEmails(Array.isArray(result.bankDetails.custom_emails) ? result.bankDetails.custom_emails : []);
        }
        if (result.bankDetails.email_fields) {
          const fields = Array.isArray(result.bankDetails.email_fields) ? result.bankDetails.email_fields : [];
          setEmailFields(fields);
          // Populate formData with email field values
          const emailFieldsData = {};
          fields.forEach(field => {
            emailFieldsData[field.fieldName] = result.bankDetails[field.fieldName] || '';
          });
          setFormData(prev => sanitizeFormData({...prev, ...emailFieldsData}));
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bank details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddEmail = () => {
    if (!newEmail.label || !newEmail.value) {
      setError('Email label and value are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.value)) {
      setError('Please enter a valid email address');
      return;
    }

    const newEmailObj = {
      id: Date.now().toString(),
      label: newEmail.label,
      value: newEmail.value
    };

    setCustomEmails([...customEmails, newEmailObj]);
    setNewEmail({ label: '', value: '' });
    setShowAddEmailModal(false);
    setError('');
  };

  const handleRemoveEmail = (id) => {
    setCustomEmails(customEmails.filter(email => email.id !== id));
  };

  const handleCreateEmailField = () => {
    if (!newEmailField.fieldName || !newEmailField.fieldLabel || !newEmailField.fieldValue) {
      setError('Field Name, Label, and Email Address are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailField.fieldValue)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if field already exists
    if (emailFields.some(f => f.fieldName === newEmailField.fieldName)) {
      setError('A field with this name already exists');
      return;
    }

    const newField = {
      id: Date.now().toString(),
      fieldName: newEmailField.fieldName,
      fieldLabel: newEmailField.fieldLabel,
      fieldDescription: newEmailField.fieldDescription,
      createdAt: new Date().toISOString()
    };

    setEmailFields([...emailFields, newField]);
    setFormData(prev => ({
      ...prev,
      [newEmailField.fieldName]: newEmailField.fieldValue
    }));
    setNewEmailField({ fieldName: '', fieldLabel: '', fieldDescription: '', fieldValue: '' });
    setShowAddEmailModal(false);
    setError('');
  };

  const handleRemoveEmailField = (fieldName) => {
    setEmailFields(emailFields.filter(field => field.fieldName !== fieldName));
    const newFormData = {...formData};
    delete newFormData[fieldName];
    setFormData(newFormData);
  };

  const parseBulkImport = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const parsed = [];

    lines.forEach(line => {
      const match = line.match(/SMTP_FROM_([A-Z_]+)\s*=\s*(.+?)@(.+)/i);
      if (match) {
        const emailPart = match[0].split('=')[1].trim();
        const key = match[1].toLowerCase();
        
        // Convert SMTP_FROM_KEY to email_key format
        let fieldName = `email_${key}`;
        
        // Create a readable label
        let fieldLabel = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        fieldLabel += ' Email';

        parsed.push({
          fieldName,
          fieldLabel,
          fieldValue: emailPart,
          raw: line
        });
      }
    });

    return parsed;
  };

  const handleBulkImportPreview = (e) => {
    const content = e.target.value;
    setBulkImportContent(content);
    const preview = parseBulkImport(content);
    setBulkImportPreview(preview);
  };

  const handleApplyBulkImport = () => {
    if (bulkImportPreview.length === 0) {
      setError('No valid email configurations found');
      return;
    }

    const updatedFormData = {...formData};
    const updatedEmailFields = [...emailFields];

    bulkImportPreview.forEach(item => {
      // Update form data
      updatedFormData[item.fieldName] = item.fieldValue;

      // Check if field already exists
      const existingField = updatedEmailFields.find(f => f.fieldName === item.fieldName);
      if (!existingField) {
        // Create new field definition
        updatedEmailFields.push({
          id: Date.now().toString() + Math.random(),
          fieldName: item.fieldName,
          fieldLabel: item.fieldLabel,
          fieldDescription: `Auto-imported from SMTP_FROM_${item.fieldName.replace('email_', '').toUpperCase()}`,
          createdAt: new Date().toISOString()
        });
      }
    });

    setFormData(updatedFormData);
    setEmailFields(updatedEmailFields);
    setShowBulkImportModal(false);
    setBulkImportContent('');
    setBulkImportPreview([]);
    setSuccess(`Imported ${bulkImportPreview.length} email configurations successfully!`);
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Filter out empty email fields and undefined values
      const cleanedFormData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== undefined && value !== null) {
          cleanedFormData[key] = value;
        }
      });

      const dataToSubmit = {
        ...cleanedFormData,
        custom_emails: customEmails,
        email_fields: emailFields
      };

      console.log('Submitting bank details:', dataToSubmit);

      const response = await fetch('/api/admin/update-bank-details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(dataToSubmit)
      });

      const result = await response.json();
      console.log('Save response:', response.status, result);

      if (!response.ok) {
        throw new Error(result.error || `Failed to update bank details: ${response.status}`);
      }

      setSuccess('✅ Bank details updated successfully!');
      console.log('Save successful');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Save error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Email Addresses', value: Object.keys(formData).filter(k => k.startsWith('email_')).length + customEmails.length, color: '#1e40af' },
    { label: 'Custom Emails', value: customEmails.length, color: '#059669' },
    { label: 'Banking Codes', value: 3, color: '#7c3aed' },
    { label: 'Last Updated', value: 'Today', color: '#f59e0b' }
  ];

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏦 Bank Details Management</h1>
            <p style={styles.subtitle}>Comprehensive bank information and email configuration</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchBankDetails} style={styles.refreshButton} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} style={{...styles.statCard, borderLeft: `4px solid ${stat.color}`}}>
              <h3 style={styles.statLabel}>{stat.label}</h3>
              <p style={styles.statValue}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['basic', 'emails', 'codes', 'advanced'].map(tab => (
            <button
              key={tab}
              style={activeTab === tab ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'basic' && '🏢 Basic Info'}
              {tab === 'emails' && '📧 Email Addresses'}
              {tab === 'codes' && '🔢 Banking Codes'}
              {tab === 'advanced' && '⚙️ Advanced'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading bank details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>🏢 Bank Information</h2>
                  <p style={styles.sectionSubtitle}>Core details about the bank</p>
                </div>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Branch Name *</label>
                    <input
                      type="text"
                      name="branch_name"
                      value={formData.branch_name}
                      onChange={handleChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fax</label>
                    <input
                      type="tel"
                      name="fax"
                      value={formData.fax || ''}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="https://"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Logo URL</label>
                    <input
                      type="url"
                      name="logo_url"
                      value={formData.logo_url || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="https://"
                    />
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Customer Service Hours</label>
                    <input
                      type="text"
                      name="customer_service_hours"
                      value={formData.customer_service_hours || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="e.g., Mon-Fri 9AM-5PM EST"
                    />
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Additional Information</label>
                    <textarea
                      name="additional_info"
                      value={formData.additional_info || ''}
                      onChange={handleChange}
                      style={styles.textarea}
                      rows="4"
                      placeholder="Any additional information about the bank"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Addresses Tab */}
            {activeTab === 'emails' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>📧 Email Configuration</h2>
                    <p style={styles.sectionSubtitle}>Manage all bank email addresses</p>
                  </div>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <button
                      type="button"
                      onClick={() => setShowBulkImportModal(true)}
                      style={{...styles.addButton, background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'}}
                    >
                      📥 Bulk Import
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEmailModal(true)}
                      style={styles.addButton}
                    >
                      ➕ Add Custom Email
                    </button>
                  </div>
                </div>

                {/* Standard Emails */}
                <div style={styles.emailSection}>
                  <h3 style={styles.emailSectionTitle}>Standard Email Addresses</h3>
                  <div style={styles.grid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Info Email *</label>
                      <input
                        type="email"
                        name="email_info"
                        value={formData.email_info}
                        onChange={handleChange}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Contact Email *</label>
                      <input
                        type="email"
                        name="email_contact"
                        value={formData.email_contact}
                        onChange={handleChange}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Support Email</label>
                      <input
                        type="email"
                        name="email_support"
                        value={formData.email_support || ''}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Loans Email</label>
                      <input
                        type="email"
                        name="email_loans"
                        value={formData.email_loans || ''}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Notify Email *</label>
                      <input
                        type="email"
                        name="email_notify"
                        value={formData.email_notify}
                        onChange={handleChange}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Updates Email *</label>
                      <input
                        type="email"
                        name="email_updates"
                        value={formData.email_updates}
                        onChange={handleChange}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Welcome Email *</label>
                      <input
                        type="email"
                        name="email_welcome"
                        value={formData.email_welcome}
                        onChange={handleChange}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Security Email</label>
                      <input
                        type="email"
                        name="email_security"
                        value={formData.email_security || ''}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Verify Email</label>
                      <input
                        type="email"
                        name="email_verify"
                        value={formData.email_verify || ''}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Crypto Email</label>
                      <input
                        type="email"
                        name="email_crypto"
                        value={formData.email_crypto || ''}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Accounts Email</label>
                      <input
                        type="email"
                        name="email_accounts"
                        value={formData.email_accounts || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="accounts@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Alerts Email</label>
                      <input
                        type="email"
                        name="email_alerts"
                        value={formData.email_alerts || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="alerts@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Billing Email</label>
                      <input
                        type="email"
                        name="email_billing"
                        value={formData.email_billing || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="billing@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Cards Email</label>
                      <input
                        type="email"
                        name="email_cards"
                        value={formData.email_cards || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="cards@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Compliance Email</label>
                      <input
                        type="email"
                        name="email_compliance"
                        value={formData.email_compliance || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="compliance@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Customer Support Email</label>
                      <input
                        type="email"
                        name="email_customersupport"
                        value={formData.email_customersupport || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="customersupport@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Disputes Email</label>
                      <input
                        type="email"
                        name="email_disputes"
                        value={formData.email_disputes || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="disputes@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fraud Email</label>
                      <input
                        type="email"
                        name="email_fraud"
                        value={formData.email_fraud || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="fraud@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Help Email</label>
                      <input
                        type="email"
                        name="email_help"
                        value={formData.email_help || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="help@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>No-Reply Email</label>
                      <input
                        type="email"
                        name="email_noreply"
                        value={formData.email_noreply || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="noreply@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Payments Email</label>
                      <input
                        type="email"
                        name="email_payments"
                        value={formData.email_payments || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="payments@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Transfers Email</label>
                      <input
                        type="email"
                        name="email_transfers"
                        value={formData.email_transfers || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="transfers@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Checks Email</label>
                      <input
                        type="email"
                        name="email_checks"
                        value={formData.email_checks || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="checks@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Deposits Email</label>
                      <input
                        type="email"
                        name="email_deposits"
                        value={formData.email_deposits || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="deposits@theoaklinebank.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Transactions Email</label>
                      <input
                        type="email"
                        name="email_transactions"
                        value={formData.email_transactions || ''}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="transactions@theoaklinebank.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Emails */}
                {customEmails.length > 0 && (
                  <div style={styles.emailSection}>
                    <h3 style={styles.emailSectionTitle}>Custom Email Addresses</h3>
                    <div style={styles.customEmailsList}>
                      {customEmails.map((email) => (
                        <div key={email.id} style={styles.customEmailCard}>
                          <div style={styles.customEmailInfo}>
                            <div style={styles.customEmailLabel}>{email.label}</div>
                            <div style={styles.customEmailValue}>{email.value}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email.id)}
                            style={styles.removeEmailButton}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Email Fields */}
                {emailFields.length > 0 && (
                  <div style={styles.emailSection}>
                    <h3 style={styles.emailSectionTitle}>Dynamic Email Fields</h3>
                    <div style={styles.grid}>
                      {emailFields.map((field) => (
                        <div key={field.id} style={styles.dynamicFieldContainer}>
                          <div style={styles.fieldHeader}>
                            <div>
                              <label style={styles.label}>{field.fieldLabel}</label>
                              {field.fieldDescription && (
                                <p style={styles.fieldDescription}>{field.fieldDescription}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmailField(field.fieldName)}
                              style={styles.removeFieldButton}
                              title="Remove this email field definition"
                            >
                              🗑️
                            </button>
                          </div>
                          <input
                            type="email"
                            name={field.fieldName}
                            value={formData[field.fieldName] || ''}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Banking Codes Tab */}
            {activeTab === 'codes' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>🔢 Banking Identification Codes</h2>
                  <p style={styles.sectionSubtitle}>Critical banking identification numbers</p>
                </div>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Routing Number *</label>
                    <input
                      type="text"
                      name="routing_number"
                      value={formData.routing_number}
                      onChange={handleChange}
                      style={styles.input}
                      required
                      maxLength="9"
                    />
                    <span style={styles.helpText}>9-digit ABA routing number</span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>SWIFT Code *</label>
                    <input
                      type="text"
                      name="swift_code"
                      value={formData.swift_code}
                      onChange={handleChange}
                      style={styles.input}
                      required
                      maxLength="11"
                    />
                    <span style={styles.helpText}>8 or 11 character SWIFT/BIC code</span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>NMLS ID *</label>
                    <input
                      type="text"
                      name="nmls_id"
                      value={formData.nmls_id}
                      onChange={handleChange}
                      style={styles.input}
                      required
                    />
                    <span style={styles.helpText}>Nationwide Mortgage Licensing System ID</span>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>⚙️ Advanced Configuration</h2>
                  <p style={styles.sectionSubtitle}>Additional settings and database management</p>
                </div>
                <div style={styles.advancedGrid}>
                  <div style={styles.infoCard}>
                    <h3 style={styles.infoCardTitle}>📊 Database Information</h3>
                    <div style={styles.infoCardContent}>
                      <p><strong>Table:</strong> bank_details</p>
                      <p><strong>Standard Columns:</strong> {Object.keys(formData).length}</p>
                      <p><strong>Custom Emails:</strong> {customEmails.length}</p>
                    </div>
                  </div>

                  <div style={styles.infoCard}>
                    <h3 style={styles.infoCardTitle}>🔒 Security Notice</h3>
                    <div style={styles.infoCardContent}>
                      <p>All changes are logged and audited. Ensure email addresses are verified before use in production communications.</p>
                    </div>
                  </div>

                  <div style={styles.infoCard}>
                    <h3 style={styles.infoCardTitle}>💡 Tips</h3>
                    <div style={styles.infoCardContent}>
                      <ul style={styles.tipsList}>
                        <li>Use descriptive labels for custom emails</li>
                        <li>Verify all email addresses before saving</li>
                        <li>Keep banking codes confidential</li>
                        <li>Update contact information regularly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={fetchBankDetails}
                style={styles.cancelButton}
                disabled={saving}
              >
                🔄 Reset Changes
              </button>
              <button
                type="submit"
                style={styles.saveButton}
                disabled={saving}
              >
                {saving ? '⏳ Saving...' : '💾 Save All Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Bulk Import Modal */}
        {showBulkImportModal && (
          <div style={styles.modalOverlay} onClick={() => setShowBulkImportModal(false)}>
            <div style={{...styles.modal, maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>📥 Bulk Import Email Configurations</h2>
                <button onClick={() => {setShowBulkImportModal(false); setBulkImportContent(''); setBulkImportPreview([]);}} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Paste Email Configuration</label>
                  <textarea
                    value={bulkImportContent}
                    onChange={handleBulkImportPreview}
                    style={{...styles.textarea, minHeight: '120px'}}
                    placeholder="Paste your SMTP configuration here:&#10;SMTP_FROM_INFO=info@theoaklinebank.com&#10;SMTP_FROM_ACCOUNTS=accounts@theoaklinebank.com&#10;..."
                  />
                  <span style={styles.helpText}>Supports SMTP_FROM_KEY=email@domain.com format</span>
                </div>

                {bulkImportPreview.length > 0 && (
                  <div style={{marginTop: '20px', padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px'}}>
                    <h3 style={{margin: '0 0 12px 0', color: '#166534'}}>✓ Preview ({bulkImportPreview.length} emails found)</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto'}}>
                      {bulkImportPreview.map((item, idx) => (
                        <div key={idx} style={{padding: '8px', background: 'white', border: '1px solid #dcfce7', borderRadius: '4px', fontSize: '12px'}}>
                          <div style={{fontWeight: '600', color: '#1e40af'}}>{item.fieldLabel}</div>
                          <div style={{color: '#666', fontSize: '11px', wordBreak: 'break-all'}}>{item.fieldValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.modalActions}>
                  <button 
                    type="button"
                    onClick={() => {setShowBulkImportModal(false); setBulkImportContent(''); setBulkImportPreview([]);}} 
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApplyBulkImport} 
                    style={{...styles.submitButton, opacity: bulkImportPreview.length > 0 ? 1 : 0.5}}
                    disabled={bulkImportPreview.length === 0}
                  >
                    Import {bulkImportPreview.length} Emails
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Email Field Modal */}
        {showAddEmailModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddEmailModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>➕ Create Email Field</h2>
                <button onClick={() => {setShowAddEmailModal(false); setNewEmailField({ fieldName: '', fieldLabel: '', fieldDescription: '', fieldValue: '' });}} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Field Name (Key) *</label>
                  <input
                    type="text"
                    value={newEmailField.fieldName}
                    onChange={(e) => setNewEmailField({...newEmailField, fieldName: e.target.value.replace(/\s+/g, '_').toLowerCase()})}
                    style={styles.input}
                    placeholder="e.g., email_sales, email_marketing"
                  />
                  <span style={styles.helpText}>Used internally as the field identifier (auto-formatted)</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Display Label *</label>
                  <input
                    type="text"
                    value={newEmailField.fieldLabel}
                    onChange={(e) => setNewEmailField({...newEmailField, fieldLabel: e.target.value})}
                    style={styles.input}
                    placeholder="e.g., Sales Team Email, Marketing Department"
                  />
                  <span style={styles.helpText}>How this field will appear in the form</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description (Purpose)</label>
                  <input
                    type="text"
                    value={newEmailField.fieldDescription}
                    onChange={(e) => setNewEmailField({...newEmailField, fieldDescription: e.target.value})}
                    style={styles.input}
                    placeholder="e.g., For sales inquiries and customer support"
                  />
                  <span style={styles.helpText}>Optional description of when this email is used</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    value={newEmailField.fieldValue}
                    onChange={(e) => setNewEmailField({...newEmailField, fieldValue: e.target.value})}
                    style={styles.input}
                    placeholder="sales@theoaklinebank.com"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button 
                    type="button"
                    onClick={() => {setShowAddEmailModal(false); setNewEmailField({ fieldName: '', fieldLabel: '', fieldDescription: '', fieldValue: '' });}} 
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button onClick={handleCreateEmailField} style={styles.submitButton}>
                    Create Field
                  </button>
                </div>
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  backButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    color: '#718096'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  section: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3.5vw, 20px)',
    fontWeight: '700',
    color: '#1e3c72',
    margin: 0
  },
  sectionSubtitle: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    margin: '4px 0 0 0'
  },
  addButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: 'clamp(0.85rem, 2vw, 13px)',
    fontWeight: '600',
    color: '#1e3c72'
  },
  input: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  textarea: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none'
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic'
  },
  emailSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0'
  },
  emailSectionTitle: {
    fontSize: 'clamp(1rem, 2.5vw, 18px)',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px'
  },
  customEmailsList: {
    display: 'grid',
    gap: '12px'
  },
  customEmailCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  customEmailInfo: {
    flex: 1
  },
  customEmailLabel: {
    fontSize: 'clamp(0.9rem, 2.2vw, 14px)',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '4px'
  },
  customEmailValue: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#4a5568'
  },
  removeEmailButton: {
    padding: '8px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(0.85rem, 2vw, 13px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  advancedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  infoCard: {
    background: '#f7fafc',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  infoCardTitle: {
    fontSize: 'clamp(1rem, 2.5vw, 16px)',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px'
  },
  infoCardContent: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#4a5568',
    lineHeight: '1.6'
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: '14px 28px',
    background: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
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
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 10001
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 3.5vw, 22px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1
  },
  modalBody: {
    padding: '24px'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.95rem, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px'
  },
  dynamicFieldContainer: {
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative'
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  fieldDescription: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: '4px 0 0 0',
    padding: '0'
  },
  removeFieldButton: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    minWidth: 'fit-content'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  }
};
