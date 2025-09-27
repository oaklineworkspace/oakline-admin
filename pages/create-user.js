import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AdminRoute from '../components/AdminRoute';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'OTHER', name: 'Other (specify)' }
];

const ACCOUNT_TYPES = [
  { id: 'checking', name: 'Checking Account', description: 'Perfect for everyday banking needs', icon: '💳', rate: '0.01% APY' },
  { id: 'savings', name: 'Savings Account', description: 'Grow your money with competitive rates', icon: '💰', rate: '4.50% APY' },
  { id: 'business', name: 'Business Account', description: 'Designed for business operations', icon: '🏢', rate: '0.01% APY' },
  { id: 'investment', name: 'Investment Account', description: 'Trade stocks, bonds, and more', icon: '📊', rate: 'Variable' }
];

const EMPLOYMENT_OPTIONS = [
  'Employed Full-time',
  'Employed Part-time',
  'Self-employed',
  'Student',
  'Retired',
  'Unemployed',
  'Other'
];

function CreateUser() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    country: 'US',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    accountType: 'checking',
    employmentStatus: 'Employed Full-time',
    annualIncome: '',
    initialDeposit: '0',
    sendWelcomeEmail: true
  });
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!formData.city?.trim()) newErrors.city = 'City is required';
    if (!formData.state?.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
    if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage('❌ Please fix the validation errors below');
      return;
    }

    setLoading(true);
    setMessage('Creating user profile...');

    try {
      // Generate account number
      const accountNumber = `OLB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          full_name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.dateOfBirth,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          user_id: profile.id,
          account_number: accountNumber,
          account_type: formData.accountType,
          balance: parseFloat(formData.initialDeposit),
          status: 'active',
          created_by: user.id
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Create initial transaction if deposit > 0
      if (parseFloat(formData.initialDeposit) > 0) {
        await supabase
          .from('transactions')
          .insert({
            account_id: account.id,
            user_id: profile.id,
            type: 'deposit',
            amount: parseFloat(formData.initialDeposit),
            description: 'Initial deposit - Admin created account',
            status: 'completed',
            created_by: user.id
          });
      }

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'user_created',
          target_type: 'profile',
          target_id: profile.id,
          details: {
            account_number: accountNumber,
            account_type: formData.accountType,
            initial_deposit: formData.initialDeposit
          }
        });

      setMessage(`✅ User account created successfully!\n\nProfile ID: ${profile.id}\nAccount Number: ${accountNumber}\nEmail: ${formData.email}\n\n${formData.sendWelcomeEmail ? 'Welcome email will be sent.' : 'No welcome email sent.'}`);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        country: 'US',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        accountType: 'checking',
        employmentStatus: 'Employed Full-time',
        annualIncome: '',
        initialDeposit: '0',
        sendWelcomeEmail: true
      });
      setErrors({});

    } catch (error) {
      console.error('Error creating user:', error);
      setMessage(`❌ Error creating user account: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>👥 Create User Account</h1>
            <p style={styles.subtitle}>Create a new customer account with banking services</p>
          </div>
          <div style={styles.headerActions}>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div style={styles.formContainer}>
          {message && (
            <div style={{
              ...styles.messageBox,
              ...(message.includes('✅') ? styles.successMessage : styles.errorMessage)
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Personal Information */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>👤 Personal Information</h3>

              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.firstName ? styles.inputError : {})
                    }}
                    placeholder="Enter first name"
                    required
                  />
                  {errors.firstName && <div style={styles.errorText}>{errors.firstName}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.lastName ? styles.inputError : {})
                    }}
                    placeholder="Enter last name"
                    required
                  />
                  {errors.lastName && <div style={styles.errorText}>{errors.lastName}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.email ? styles.inputError : {})
                    }}
                    placeholder="Enter email address"
                    required
                  />
                  {errors.email && <div style={styles.errorText}>{errors.email}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.phone ? styles.inputError : {})
                    }}
                    placeholder="Enter phone number"
                    required
                  />
                  {errors.phone && <div style={styles.errorText}>{errors.phone}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.dateOfBirth ? styles.inputError : {})
                    }}
                    required
                  />
                  {errors.dateOfBirth && <div style={styles.errorText}>{errors.dateOfBirth}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Country</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏠 Address Information</h3>

              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.address ? styles.inputError : {})
                    }}
                    placeholder="Enter street address"
                    required
                  />
                  {errors.address && <div style={styles.errorText}>{errors.address}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.city ? styles.inputError : {})
                    }}
                    placeholder="Enter city"
                    required
                  />
                  {errors.city && <div style={styles.errorText}>{errors.city}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.state ? styles.inputError : {})
                    }}
                    placeholder="Enter state"
                    required
                  />
                  {errors.state && <div style={styles.errorText}>{errors.state}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>ZIP Code *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.zipCode ? styles.inputError : {})
                    }}
                    placeholder="Enter ZIP code"
                    required
                  />
                  {errors.zipCode && <div style={styles.errorText}>{errors.zipCode}</div>}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏦 Account Information</h3>

              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Account Type *</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name} - {type.rate}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Employment Status *</label>
                  <select
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    {EMPLOYMENT_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Annual Income ($) *</label>
                  <input
                    type="number"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.annualIncome ? styles.inputError : {})
                    }}
                    placeholder="Enter annual income"
                    min="0"
                    required
                  />
                  {errors.annualIncome && <div style={styles.errorText}>{errors.annualIncome}</div>}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Initial Deposit ($)</label>
                  <input
                    type="number"
                    name="initialDeposit"
                    value={formData.initialDeposit}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter initial deposit amount"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="sendWelcomeEmail"
                    checked={formData.sendWelcomeEmail}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  Send welcome email to customer
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : '👥 Create User Account'}
            </button>
          </form>
        </div>
      </div>
    </AdminRoute>
  );
}

export default CreateUser;

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
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
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  section: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #0070f3'
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease'
  },
  inputError: {
    borderColor: '#ef4444'
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },
  checkboxGroup: {
    marginTop: '20px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '8px 0'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginRight: '8px',
    accentColor: '#0070f3'
  },
  submitButton: {
    padding: '16px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '20px'
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '500'
  },
  messageBox: {
    padding: '16px',
    margin: '16px 0',
    borderRadius: '8px',
    whiteSpace: 'pre-line',
    fontSize: '14px'
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #a7f3d0'
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  }
};