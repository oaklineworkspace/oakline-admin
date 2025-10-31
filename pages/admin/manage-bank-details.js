
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminPageDropdown from '../../components/AdminPageDropdown';

export default function ManageBankDetails() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [bankDetails, setBankDetails] = useState({
    name: '',
    branch_name: '',
    address: '',
    phone: '',
    email_info: '',
    email_contact: '',
    email_support: '',
    email_loans: '',
    email_notify: '',
    email_updates: '',
    email_welcome: '',
    routing_number: '',
    swift_code: '',
    nmls_id: '',
    logo_url: '',
    website: '',
    fax: '',
    customer_service_hours: '',
    additional_info: ''
  });

  // Dynamic email fields
  const [customEmails, setCustomEmails] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !adminProfile) {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setCurrentAdmin(adminProfile);
      await fetchBankDetails();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBankDetails(data);
        
        // Load custom emails from JSON column
        if (data.custom_emails && Array.isArray(data.custom_emails)) {
          setCustomEmails(data.custom_emails);
        } else {
          setCustomEmails([]);
        }
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
      showToast('Error loading bank details', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBankDetails();
    setRefreshing(false);
    showToast('✨ Bank details refreshed', 'success');
  };

  const handleInputChange = (field, value) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomEmailChange = (id, value) => {
    setCustomEmails(prev => 
      prev.map(email => email.id === id ? { ...email, value } : email)
    );
  };

  const handleCustomEmailLabelChange = (id, newLabel) => {
    setCustomEmails(prev => 
      prev.map(email => email.id === id ? { ...email, label: newLabel } : email)
    );
  };

  const addCustomEmail = () => {
    const newId = `custom_email_${Date.now()}`;
    setCustomEmails(prev => [...prev, {
      id: newId,
      label: 'New Email',
      value: ''
    }]);
  };

  const removeCustomEmail = (id) => {
    setCustomEmails(prev => prev.filter(email => email.id !== id));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const updatedDetails = { 
        ...bankDetails,
        custom_emails: customEmails.length > 0 ? customEmails : null
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('❌ Session expired. Please login again.', 'error');
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/update-bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ bankDetails: updatedDetails })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update bank details');
      }

      showToast('✅ Bank details updated successfully', 'success');
      await fetchBankDetails();
    } catch (err) {
      console.error('Error saving bank details:', err);
      showToast(`❌ ${err.message || 'Failed to save bank details'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading Bank Details...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444'
        }}>
          {toast.message}
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <div style={styles.logoSection}>
              <img 
                src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
                alt="Oakline Bank" 
                style={styles.logo}
              />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <p style={styles.brandTagline}>Bank Details Management</p>
              </div>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.adminInfo}>
              <div style={styles.adminAvatar}>
                {currentAdmin?.email.charAt(0).toUpperCase()}
              </div>
              <div style={styles.adminDetails}>
                <p style={styles.adminEmail}>{currentAdmin?.email}</p>
                <div style={styles.roleBadge}>
                  👤 {currentAdmin?.role?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
            
            <div style={styles.headerActions}>
              <AdminPageDropdown />
              <button onClick={handleLogout} style={styles.logoutButton}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.mainContent}>
        <div style={styles.pageHeader}>
          <div>
            <h2 style={styles.pageTitle}>🏦 Bank Details Management</h2>
            <p style={styles.pageSubtitle}>Manage your bank's information and contact details</p>
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{
              ...styles.refreshButton,
              opacity: refreshing ? 0.6 : 1
            }}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        <div style={styles.formContainer}>
          <div style={styles.formGrid}>
            {/* Bank Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏛️ Bank Information</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={styles.input}
                  placeholder="Enter bank name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Branch Name</label>
                <input
                  type="text"
                  value={bankDetails.branch_name}
                  onChange={(e) => handleInputChange('branch_name', e.target.value)}
                  style={styles.input}
                  placeholder="Enter branch name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <textarea
                  value={bankDetails.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter full address"
                  rows="3"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  value={bankDetails.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={styles.input}
                  placeholder="+1 (XXX) XXX-XXXX"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Fax Number</label>
                <input
                  type="tel"
                  value={bankDetails.fax}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  style={styles.input}
                  placeholder="+1 (XXX) XXX-XXXX"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Website</label>
                <input
                  type="url"
                  value={bankDetails.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  style={styles.input}
                  placeholder="https://www.theoaklinebank.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Logo URL</label>
                <input
                  type="text"
                  value={bankDetails.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  style={styles.input}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Customer Service Hours</label>
                <textarea
                  value={bankDetails.customer_service_hours}
                  onChange={(e) => handleInputChange('customer_service_hours', e.target.value)}
                  style={styles.textarea}
                  placeholder="Mon-Fri: 9AM-5PM, Sat: 10AM-2PM"
                  rows="2"
                />
              </div>
            </div>

            {/* Standard Email Addresses Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📧 Standard Email Addresses</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Info Email</label>
                <input
                  type="email"
                  value={bankDetails.email_info}
                  onChange={(e) => handleInputChange('email_info', e.target.value)}
                  style={styles.input}
                  placeholder="info@theoaklinebank.com"
                />
                <p style={styles.helperText}>General information inquiries</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Email</label>
                <input
                  type="email"
                  value={bankDetails.email_contact}
                  onChange={(e) => handleInputChange('email_contact', e.target.value)}
                  style={styles.input}
                  placeholder="contact@theoaklinebank.com"
                />
                <p style={styles.helperText}>Main contact address</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Support Email</label>
                <input
                  type="email"
                  value={bankDetails.email_support}
                  onChange={(e) => handleInputChange('email_support', e.target.value)}
                  style={styles.input}
                  placeholder="support@theoaklinebank.com"
                />
                <p style={styles.helperText}>Customer support inquiries</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Loans Email</label>
                <input
                  type="email"
                  value={bankDetails.email_loans}
                  onChange={(e) => handleInputChange('email_loans', e.target.value)}
                  style={styles.input}
                  placeholder="loans@theoaklinebank.com"
                />
                <p style={styles.helperText}>Loan applications and inquiries</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notifications Email</label>
                <input
                  type="email"
                  value={bankDetails.email_notify}
                  onChange={(e) => handleInputChange('email_notify', e.target.value)}
                  style={styles.input}
                  placeholder="notify@theoaklinebank.com"
                />
                <p style={styles.helperText}>System notifications and alerts</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Updates Email</label>
                <input
                  type="email"
                  value={bankDetails.email_updates}
                  onChange={(e) => handleInputChange('email_updates', e.target.value)}
                  style={styles.input}
                  placeholder="updates@theoaklinebank.com"
                />
                <p style={styles.helperText}>Service updates and announcements</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Welcome Email</label>
                <input
                  type="email"
                  value={bankDetails.email_welcome}
                  onChange={(e) => handleInputChange('email_welcome', e.target.value)}
                  style={styles.input}
                  placeholder="welcome@theoaklinebank.com"
                />
                <p style={styles.helperText}>New customer welcome messages</p>
              </div>
            </div>

            {/* Banking Codes Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🔢 Banking Codes</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Routing Number</label>
                <input
                  type="text"
                  value={bankDetails.routing_number}
                  onChange={(e) => handleInputChange('routing_number', e.target.value)}
                  style={styles.input}
                  placeholder="XXXXXXXXX (9 digits)"
                />
                <p style={styles.helperText}>9-digit ABA routing number</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>SWIFT Code</label>
                <input
                  type="text"
                  value={bankDetails.swift_code}
                  onChange={(e) => handleInputChange('swift_code', e.target.value)}
                  style={styles.input}
                  placeholder="XXXXXXXX or XXXXXXXXXXX"
                />
                <p style={styles.helperText}>8 or 11 character SWIFT/BIC code</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>NMLS ID</label>
                <input
                  type="text"
                  value={bankDetails.nmls_id}
                  onChange={(e) => handleInputChange('nmls_id', e.target.value)}
                  style={styles.input}
                  placeholder="NMLS #XXXXXX"
                />
                <p style={styles.helperText}>Nationwide Mortgage Licensing System ID</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Additional Information</label>
                <textarea
                  value={bankDetails.additional_info}
                  onChange={(e) => handleInputChange('additional_info', e.target.value)}
                  style={styles.textarea}
                  placeholder="Any additional bank information..."
                  rows="4"
                />
              </div>
            </div>
          </div>

          {/* Custom Email Addresses Section */}
          <div style={styles.customEmailSection}>
            <div style={styles.customEmailHeader}>
              <h3 style={styles.sectionTitle}>✉️ Custom Email Addresses</h3>
              <button onClick={addCustomEmail} style={styles.addEmailButton}>
                ➕ Add Custom Email
              </button>
            </div>

            {customEmails.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No custom emails yet. Click "Add Custom Email" to create one.</p>
              </div>
            ) : (
              <div style={styles.customEmailGrid}>
                {customEmails.map((email) => (
                  <div key={email.id} style={styles.customEmailItem}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Label</label>
                      <input
                        type="text"
                        value={email.label}
                        onChange={(e) => handleCustomEmailLabelChange(email.id, e.target.value)}
                        style={styles.input}
                        placeholder="e.g., Marketing, Sales, HR"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address</label>
                      <input
                        type="email"
                        value={email.value}
                        onChange={(e) => handleCustomEmailChange(email.id, e.target.value)}
                        style={styles.input}
                        placeholder="email@theoaklinebank.com"
                      />
                    </div>
                    <button 
                      onClick={() => removeCustomEmail(email.id)} 
                      style={styles.removeButton}
                      title="Remove this email"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '💾 Saving...' : '💾 Save All Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#F5F6F8',
    paddingBottom: '2rem'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #FFC857',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1.5rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '600',
    fontSize: '1rem',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 9999,
    animation: 'slideInRight 0.3s ease'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1.25rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: 0,
    lineHeight: '1.2'
  },
  brandTagline: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  adminAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: '700'
  },
  adminDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  adminEmail: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: '#FFC857',
    color: '#1A3E6F'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0'
  },
  pageSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1A3E6F',
    margin: 0,
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  textarea: {
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0
  },
  customEmailSection: {
    marginTop: '2rem',
    paddingTop: '2rem',
    borderTop: '2px solid #e2e8f0'
  },
  customEmailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  addEmailButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
  },
  customEmailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  customEmailItem: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    position: 'relative'
  },
  removeButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%'
  },
  emptyState: {
    padding: '3rem 2rem',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px'
  },
  emptyText: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid #e2e8f0',
    marginTop: '2rem'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  }
};
