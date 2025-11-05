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

      const response = await fetch('/api/admin/update-bank-details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
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

  return (
    <AdminAuth>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <Link href="/admin/admin-dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>🏦 Manage Bank Details</h1>
            <p style={styles.subtitle}>Update bank information and contact emails</p>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Loading bank details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Bank Information Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🏢 Bank Information</h2>
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
                    rows="3"
                    placeholder="Any additional information about the bank"
                  />
                </div>
              </div>
            </div>

            {/* Email Addresses Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📧 Email Addresses</h2>
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

            {/* Banking Codes Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🔢 Banking Codes</h2>
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
                  />
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
                  />
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
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={fetchBankDetails}
                style={styles.cancelButton}
                disabled={saving}
              >
                🔄 Reset
              </button>
              <button
                type="submit"
                style={styles.saveButton}
                disabled={saving}
              >
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        )}

        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  backButton: {
    display: 'inline-block',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: '500'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1a202c',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  successBox: {
    background: '#d1fae5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#065f46'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    color: '#666'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3.5vw, 20px)',
    fontWeight: '700',
    color: '#1e3c72',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e2e8f0'
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
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e3c72'
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  textarea: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
  }
};