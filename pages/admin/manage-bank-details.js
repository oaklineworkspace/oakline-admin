
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
  const [newEmail, setNewEmail] = useState({ label: '', value: '' });
  const [newColumn, setNewColumn] = useState({ name: '', type: 'text', label: '' });
  const [customEmails, setCustomEmails] = useState([]);
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
    routing_number: '',
    swift_code: '',
    nmls_id: ''
  });

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
        setFormData(result.bankDetails);
        if (result.bankDetails.custom_emails) {
          setCustomEmails(Array.isArray(result.bankDetails.custom_emails) ? result.bankDetails.custom_emails : []);
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

      const dataToSubmit = {
        ...formData,
        custom_emails: customEmails
      };

      const response = await fetch('/api/admin/update-bank-details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(dataToSubmit)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update bank details');
      }

      setSuccess('Bank details updated successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
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
                  <h2 style={styles.sectionTitle}>📧 Email Configuration</h2>
                  <p style={styles.sectionSubtitle}>Manage all bank email addresses</p>
                  <button
                    type="button"
                    onClick={() => setShowAddEmailModal(true)}
                    style={styles.addButton}
                  >
                    ➕ Add Custom Email
                  </button>
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

        {/* Add Custom Email Modal */}
        {showAddEmailModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddEmailModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>➕ Add Custom Email</h2>
                <button onClick={() => setShowAddEmailModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Label *</label>
                  <input
                    type="text"
                    value={newEmail.label}
                    onChange={(e) => setNewEmail({...newEmail, label: e.target.value})}
                    style={styles.input}
                    placeholder="e.g., Marketing, Sales, HR"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    value={newEmail.value}
                    onChange={(e) => setNewEmail({...newEmail, value: e.target.value})}
                    style={styles.input}
                    placeholder="email@example.com"
                  />
                </div>
                <button onClick={handleAddEmail} style={styles.submitButton}>
                  Add Email
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
  }
};
