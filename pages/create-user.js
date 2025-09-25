import { useState } from 'react';

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
  { id: 1, name: 'Checking Account', description: 'Perfect for everyday banking needs', icon: '💳', rate: '0.01% APY' },
  { id: 2, name: 'Savings Account', description: 'Grow your money with competitive rates', icon: '💰', rate: '4.50% APY' },
  { id: 3, name: 'Business Checking', description: 'Designed for business operations', icon: '🏢', rate: '0.01% APY' },
  { id: 4, name: 'Business Savings', description: 'Business savings with higher yields', icon: '🏦', rate: '4.25% APY' },
  { id: 5, name: 'Student Checking', description: 'No-fee checking for students', icon: '🎓', rate: '0.01% APY' },
  { id: 6, name: 'Money Market Account', description: 'Premium savings with higher yields', icon: '📈', rate: '4.75% APY' },
  { id: 7, name: 'Certificate of Deposit (CD)', description: 'Secure your future with fixed rates', icon: '🔒', rate: '5.25% APY' },
  { id: 8, name: 'Retirement Account (IRA)', description: 'Plan for your retirement', icon: '🏖️', rate: '4.80% APY' },
  { id: 9, name: 'Joint Checking Account', description: 'Shared checking for couples', icon: '👫', rate: '0.01% APY' },
  { id: 10, name: 'Trust Account', description: 'Manage assets for beneficiaries', icon: '🛡️', rate: '3.50% APY' },
  { id: 11, name: 'Investment Brokerage Account', description: 'Trade stocks, bonds, and more', icon: '📊', rate: 'Variable' },
  { id: 12, name: 'High-Yield Savings Account', description: 'Maximum earning potential', icon: '💎', rate: '5.00% APY' },
  { id: 13, name: 'International Checking', description: 'Banking without borders', icon: '🌍', rate: '0.01% APY' },
  { id: 14, name: 'Foreign Currency Account', description: 'Hold multiple currencies', icon: '💱', rate: 'Variable' },
  { id: 15, name: 'Cryptocurrency Wallet', description: 'Digital asset storage', icon: '₿', rate: 'Variable' },
  { id: 16, name: 'Loan Repayment Account', description: 'Streamline your loan payments', icon: '💳', rate: 'N/A' },
  { id: 17, name: 'Mortgage Account', description: 'Home financing solutions', icon: '🏠', rate: 'Variable' },
  { id: 18, name: 'Auto Loan Account', description: 'Vehicle financing made easy', icon: '🚗', rate: 'Variable' },
  { id: 19, name: 'Credit Card Account', description: 'Flexible spending power', icon: '💳', rate: 'Variable APR' },
  { id: 20, name: 'Prepaid Card Account', description: 'Controlled spending solution', icon: '🎫', rate: 'N/A' },
  { id: 21, name: 'Payroll Account', description: 'Direct deposit convenience', icon: '💼', rate: '0.01% APY' },
  { id: 22, name: 'Nonprofit/Charity Account', description: 'Special rates for nonprofits', icon: '❤️', rate: '2.50% APY' },
  { id: 23, name: 'Escrow Account', description: 'Secure transaction holding', icon: '🔐', rate: '1.50% APY' },
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

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

export default function CreateUser() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    mothersMaidenName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
    idNumber: '',
    country: 'US',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    accountTypes: [1], // Default to checking account
    employmentStatus: 'Employed Full-time',
    annualIncome: '',
    password: '',
    sendEnrollmentEmail: true
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'sendEnrollmentEmail') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleAccountType = (accountId) => {
    setFormData(prev => {
      const isSelected = prev.accountTypes.includes(accountId);
      if (isSelected) {
        // Don't allow removing if it's the only one selected
        if (prev.accountTypes.length === 1) return prev;
        return { ...prev, accountTypes: prev.accountTypes.filter(id => id !== accountId) };
      } else {
        return { ...prev, accountTypes: [...prev.accountTypes, accountId] };
      }
    });

    if (errors.accountTypes) {
      setErrors(prev => ({ ...prev, accountTypes: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Personal Information
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.country) newErrors.country = 'Country is required';

    // SSN or ID validation
    if (formData.country === 'US') {
      if (!formData.ssn?.trim()) newErrors.ssn = 'SSN is required for US residents';
    } else {
      if (!formData.idNumber?.trim()) newErrors.idNumber = 'ID number is required for non-US residents';
    }

    // Address Information
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!formData.city?.trim()) newErrors.city = 'City is required';
    if (!formData.state?.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';

    // Account Information
    if (!formData.accountTypes || formData.accountTypes.length === 0) {
      newErrors.accountTypes = 'At least one account type must be selected';
    }
    if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
    if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';
    if (!formData.password?.trim()) newErrors.password = 'Initial password is required';

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
    setMessage('Creating user account...');

    try {
      // Map form data to match API expectations
      const apiData = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth, // This will be mapped to 'dob' in API
        ssn: formData.country === 'US' ? formData.ssn : null,
        idNumber: formData.country !== 'US' ? formData.idNumber : null,
        country: formData.country,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        accountTypes: formData.accountTypes, // This will be mapped to 'selectedAccountTypes' in API
        employmentStatus: formData.employmentStatus,
        annualIncome: formData.annualIncome,
        password: formData.password,
        agreeToTerms: true, // Admin creation auto-agrees to terms
        sendEnrollmentEmail: formData.sendEnrollmentEmail
      };

      // Submit using the admin API endpoint
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ User account created successfully!\n\nUser ID: ${data.userId}\nEmail: ${formData.email}\n\n${formData.sendEnrollmentEmail ? 'Enrollment email has been sent.' : 'No enrollment email sent.'}`);

        // Reset form
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          mothersMaidenName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          ssn: '',
          idNumber: '',
          country: 'US',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          accountTypes: [1],
          employmentStatus: 'Employed Full-time',
          annualIncome: '',
          password: '',
          sendEnrollmentEmail: true
        });
        setErrors({});
      } else {
        // Handle specific API errors if available, otherwise a general message
        setMessage(`❌ Error creating user account: ${data.error || 'An unknown error occurred.'}`);
      }
    } catch (error) {
      setMessage(`❌ An unexpected error occurred: ${error.message}`);
    }

    setLoading(false);
  };

  // Styles
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      background: 'linear-gradient(135deg, #0070f3 0%, #0051a5 100%)',
      color: 'white',
      padding: '2rem',
      borderRadius: '16px',
      marginBottom: '2rem',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0, 112, 243, 0.3)'
    },
    form: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
      border: '1px solid #e2e8f0'
    },
    section: {
      marginBottom: '2.5rem',
      padding: '1.5rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '1.5rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #0070f3'
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    },
    inputGroup: {
      marginBottom: '1rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '500',
      color: '#374151',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    inputFocus: {
      borderColor: '#0070f3',
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(0, 112, 243, 0.1)'
    },
    inputError: {
      borderColor: '#ef4444'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    accountTypesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem',
      marginTop: '1rem'
    },
    accountCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      position: 'relative'
    },
    accountCardSelected: {
      borderColor: '#0070f3',
      backgroundColor: '#eff6ff',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 112, 243, 0.15)'
    },
    accountHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px'
    },
    accountIcon: {
      fontSize: '24px',
      padding: '8px',
      borderRadius: '10px',
      backgroundColor: '#f1f5f9'
    },
    accountName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '4px'
    },
    accountDescription: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '12px'
    },
    accountRate: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#059669',
      backgroundColor: '#ecfdf5',
      padding: '4px 8px',
      borderRadius: '6px',
      display: 'inline-block'
    },
    submitButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: loading ? '#94a3b8' : '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '2rem'
    },
    errorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      fontWeight: '500'
    },
    messageBox: {
      padding: '1rem',
      margin: '1rem 0',
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
    },
    checkbox: {
      width: '18px',
      height: '18px',
      marginRight: '8px',
      accentColor: '#0070f3'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      padding: '8px 0'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>👥 Admin - Create User Account</h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Create a new user account with banking services</p>
      </div>

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
              <label style={styles.label}>Middle Name</label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Enter middle name (optional)"
              />
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
          </div>

          <div style={styles.inputGrid}>
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
          </div>

          <div style={styles.inputGrid}>
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
              <label style={styles.label}>Country *</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                style={{
                  ...styles.select,
                  ...(errors.country ? styles.inputError : {})
                }}
                required
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
              {errors.country && <div style={styles.errorText}>{errors.country}</div>}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>{formData.country === 'US' ? 'SSN *' : 'ID Number *'}</label>
              <input
                type="text"
                name={formData.country === 'US' ? 'ssn' : 'idNumber'}
                value={formData.country === 'US' ? formData.ssn : formData.idNumber}
                onChange={handleInputChange}
                style={{
                  ...styles.input,
                  ...(errors.ssn || errors.idNumber ? styles.inputError : {})
                }}
                placeholder={formData.country === 'US' ? 'XXX-XX-XXXX' : 'Government ID Number'}
                required
              />
              {(errors.ssn || errors.idNumber) && (
                <div style={styles.errorText}>{errors.ssn || errors.idNumber}</div>
              )}
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mother's Maiden Name</label>
            <input
              type="text"
              name="mothersMaidenName"
              value={formData.mothersMaidenName}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter mother's maiden name (optional)"
            />
          </div>
        </div>

        {/* Address Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🏠 Address Information</h3>

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

          <div style={styles.inputGrid}>
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
              <label style={styles.label}>State/Province *</label>
              {formData.country === 'US' ? (
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  style={{
                    ...styles.select,
                    ...(errors.state ? styles.inputError : {})
                  }}
                  required
                >
                  <option value="">Select state</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    ...(errors.state ? styles.inputError : {})
                  }}
                  placeholder="Enter state/province"
                  required
                />
              )}
              {errors.state && <div style={styles.errorText}>{errors.state}</div>}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>ZIP/Postal Code *</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                style={{
                  ...styles.input,
                  ...(errors.zipCode ? styles.inputError : {})
                }}
                placeholder="Enter ZIP/postal code"
                required
              />
              {errors.zipCode && <div style={styles.errorText}>{errors.zipCode}</div>}
            </div>
          </div>
        </div>

        {/* Account & Financial Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>💼 Account & Financial Information</h3>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Account Types * (Select at least one)</label>
            <div style={styles.accountTypesGrid}>
              {ACCOUNT_TYPES.map(accountType => {
                const isSelected = formData.accountTypes.includes(accountType.id);
                return (
                  <div
                    key={accountType.id}
                    onClick={() => toggleAccountType(accountType.id)}
                    style={{
                      ...styles.accountCard,
                      ...(isSelected ? styles.accountCardSelected : {})
                    }}
                  >
                    <div style={styles.accountHeader}>
                      <div style={{
                        ...styles.accountIcon,
                        backgroundColor: formData.accountTypes.includes(accountType.id) ? '#dbeafe' : '#f1f5f9'
                      }}>
                        {accountType.icon}
                      </div>
                      <div style={styles.accountName}>{accountType.name}</div>
                    </div>
                    <div style={styles.accountDescription}>{accountType.description}</div>
                    <div style={styles.accountRate}>{accountType.rate}</div>
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.accountTypes && <div style={styles.errorText}>{errors.accountTypes}</div>}
          </div>

          <div style={styles.inputGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Employment Status *</label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleInputChange}
                style={{
                  ...styles.select,
                  ...(errors.employmentStatus ? styles.inputError : {})
                }}
                required
              >
                {EMPLOYMENT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.employmentStatus && <div style={styles.errorText}>{errors.employmentStatus}</div>}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Annual Income *</label>
              <select
                name="annualIncome"
                value={formData.annualIncome}
                onChange={handleInputChange}
                style={{
                  ...styles.select,
                  ...(errors.annualIncome ? styles.inputError : {})
                }}
                required
              >
                <option value="">Select annual income range</option>
                <option value="under_25k">Under $25,000</option>
                <option value="25k_50k">$25,000 - $50,000</option>
                <option value="50k_75k">$50,000 - $75,000</option>
                <option value="75k_100k">$75,000 - $100,000</option>
                <option value="100k_150k">$100,000 - $150,000</option>
                <option value="150k_200k">$150,000 - $200,000</option>
                <option value="over_200k">Over $200,000</option>
              </select>
              {errors.annualIncome && <div style={styles.errorText}>{errors.annualIncome}</div>}
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🔒 Account Security</h3>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Initial Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              style={{
                ...styles.input,
                ...(errors.password ? styles.inputError : {})
              }}
              placeholder="Set initial password for user"
              required
            />
            {errors.password && <div style={styles.errorText}>{errors.password}</div>}
          </div>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="sendEnrollmentEmail"
              checked={formData.sendEnrollmentEmail}
              onChange={handleInputChange}
              style={styles.checkbox}
            />
            Send enrollment email to user
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? '⏳ Creating Account...' : '✅ Create User Account'}
        </button>
      </form>

      {/* Status Message */}
      {message && (
        <div style={{
          ...styles.messageBox,
          ...(message.includes('✅') ? styles.successMessage : styles.errorMessage)
        }}>
          {message}
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: '12px'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>🛡️ Admin Notes:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#92400e' }}>
          <li>This form creates a complete user application with accounts</li>
          <li>The user will receive login credentials and account details</li>
          <li>All required KYC information must be provided</li>
          <li>Account numbers and initial balances are automatically generated</li>
          <li>If enrollment email is enabled, the user will receive setup instructions</li>
        </ul>
      </div>
    </div>
  );
}