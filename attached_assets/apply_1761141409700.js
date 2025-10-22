import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

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

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'KE', name: 'Kenya' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },
  { code: 'RU', name: 'Russia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AR', name: 'Argentina' },
  { code: 'OTHER', name: 'Other / Enter Manually' }
];

const STATES_BY_COUNTRY = {
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ],
  CA: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ],
  AU: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
    'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ],
  IN: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ],
  BR: [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
    'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Para', 'Paraíba',
    'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
    'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ]
};

const MAJOR_CITIES_BY_STATE = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose', 'Fresno'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Tallahassee'],
  'Illinois': ['Chicago', 'Springfield', 'Rockford', 'Peoria', 'Elgin', 'Waukegan'],
  'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Mississauga', 'Windsor'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford']
};

export default function Apply() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showManualCountry, setShowManualCountry] = useState(false);
  const [showManualState, setShowManualState] = useState(false);
  const [showManualCity, setShowManualCity] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState('');

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
    manualCountry: '',
    address: '',
    city: '',
    manualCity: '',
    state: '',
    manualState: '',
    zipCode: '',
    accountTypes: [],
    employmentStatus: '',
    annualIncome: '',
    agreeToTerms: false
  });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^[\d\s\-\(\)]{10,}$/.test(phone);

  const getEffectiveCountry = () => {
    return formData.country === 'OTHER' ? formData.manualCountry : formData.country;
  };

  const getEffectiveState = () => {
    // Return manual state if manual entry is being used, otherwise return selected state
    if (showManualState || shouldShowManualState()) {
      return formData.manualState;
    }
    return formData.state;
  };

  const getEffectiveCity = () => {
    // Return manual city if manual entry is being used, otherwise return selected city
    if (showManualCity || shouldShowManualCity()) {
      return formData.manualCity;
    }
    return formData.city;
  };

  const getAvailableStates = () => {
    const country = getEffectiveCountry();
    return STATES_BY_COUNTRY[country] || [];
  };

  const getAvailableCities = () => {
    const state = getEffectiveState();
    return MAJOR_CITIES_BY_STATE[state] || [];
  };

  const shouldShowManualState = () => {
    const country = getEffectiveCountry();
    return !STATES_BY_COUNTRY[country] || showManualState;
  };

  const shouldShowManualCity = () => {
    const state = getEffectiveState();
    return !MAJOR_CITIES_BY_STATE[state] || showManualCity;
  };

  const handleSendVerificationCode = async () => {
    if (!verificationEmail.trim()) {
      setErrors({ verificationEmail: 'Email is required' });
      return;
    }

    if (!validateEmail(verificationEmail)) {
      setErrors({ verificationEmail: 'Invalid email format' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail.trim().toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ verificationEmail: data.error || 'Failed to send verification code' });
        setLoading(false);
        return;
      }

      setCodeSent(true);
      setResendTimer(60);
      setErrors({});

    } catch (error) {
      console.error('Error sending verification code:', error);
      setErrors({ verificationEmail: 'Failed to send verification code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setErrors({ verificationCode: 'Verification code is required' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Verifying email:', verificationEmail.trim().toLowerCase());
      const response = await fetch('/api/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail.trim().toLowerCase(),
          code: verificationCode.trim()
        })
      });

      const data = await response.json();
      console.log('Verification response:', data);

      if (!response.ok) {
        setErrors({ verificationCode: data.error || 'Invalid verification code' });
        setLoading(false);
        return;
      }

      console.log('✅ Email verified successfully');
      setIsEmailVerified(true);
      setVerifiedEmailAddress(verificationEmail.trim().toLowerCase());
      setFormData(prev => ({ ...prev, email: verificationEmail.trim().toLowerCase() }));
      setCurrentStep(1);
      setErrors({});

    } catch (error) {
      console.error('Error verifying email:', error);
      setErrors({ verificationCode: 'Failed to verify email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Invalid phone number';
      }
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

      if (!getEffectiveCountry()) newErrors.country = 'Country is required';

      if (getEffectiveCountry() === 'US') {
        if (!formData.ssn.trim()) newErrors.ssn = 'SSN is required';
      } else {
        if (!formData.idNumber.trim()) newErrors.idNumber = 'Government ID Number is required';
      }
    }

    if (step === 2) {
      if (!formData.address.trim()) newErrors.address = 'Address is required';

      const effectiveCity = getEffectiveCity();
      const effectiveState = getEffectiveState();

      if (!effectiveCity || !effectiveCity.trim()) newErrors.city = 'City is required';
      if (!effectiveState || !effectiveState.trim()) newErrors.state = 'State/Province is required';
      if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/Postal code is required';
    }

    if (step === 3) {
      if (formData.accountTypes.length === 0) newErrors.accountTypes = 'Select at least one account type';
      if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
      if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Handle country change
      if (name === 'country') {
        setShowManualCountry(value === 'OTHER');
        if (value !== 'OTHER') {
          newData.manualCountry = '';
        }
        // Reset state and city when country changes
        newData.state = '';
        newData.manualState = '';
        newData.city = '';
        newData.manualCity = '';
        setShowManualState(false);
        setShowManualCity(false);
      }

      // Handle state change
      if (name === 'state') {
        // Reset city when state changes
        newData.city = '';
        newData.manualCity = '';
        setShowManualCity(false);
      }

      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleAccountType = (accountId) => {
    setFormData(prev => {
      const selected = prev.accountTypes.includes(accountId)
        ? prev.accountTypes.filter(id => id !== accountId)
        : [...prev.accountTypes, accountId];
      return { ...prev, accountTypes: selected };
    });

    if (errors.accountTypes) {
      setErrors(prev => ({ ...prev, accountTypes: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    // Ensure the email hasn't been changed from the verified one
    if (!isEmailVerified || formData.email.trim().toLowerCase() !== verifiedEmailAddress) {
      setErrors({ submit: 'Please use the verified email address or verify your new email first.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // CRITICAL: Double-check email verification status in database BEFORE attempting insert
      console.log('Checking email verification status before submission...');
      const verifyResponse = await fetch('/api/check-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.verified) {
        console.error('Email verification check failed:', verifyResult);
        setErrors({ submit: 'Email verification has expired or is invalid. Please go back to Step 1 and verify your email again.' });
        setLoading(false);
        return;
      }

      console.log('✅ Email verification confirmed:', verifyResult);

      // Debug: Check the actual database state
      const debugResponse = await fetch('/api/debug-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const debugData = await debugResponse.json();
      console.log('📊 Database state before insert:', debugData);

      // Wait a moment to ensure database trigger can see the verification
      await new Promise(resolve => setTimeout(resolve, 500));

      const effectiveCountry = getEffectiveCountry();
      const effectiveState = getEffectiveState();
      const effectiveCity = getEffectiveCity();

      // Create account type enum mapping
      const enumMapping = {
        'Checking Account': 'checking_account',
        'Savings Account': 'savings_account',
        'Business Checking': 'business_checking',
        'Business Savings': 'business_savings',
        'Student Checking': 'student_checking',
        'Money Market Account': 'money_market',
        'Certificate of Deposit (CD)': 'certificate_of_deposit',
        'Retirement Account (IRA)': 'retirement_ira',
        'Joint Checking Account': 'joint_checking',
        'Trust Account': 'trust_account',
        'Investment Brokerage Account': 'investment_brokerage',
        'High-Yield Savings Account': 'high_yield_savings',
        'International Checking': 'international_checking',
        'Foreign Currency Account': 'foreign_currency',
        'Cryptocurrency Wallet': 'cryptocurrency_wallet',
        'Loan Repayment Account': 'loan_repayment',
        'Mortgage Account': 'mortgage',
        'Auto Loan Account': 'auto_loan',
        'Credit Card Account': 'credit_card',
        'Prepaid Card Account': 'prepaid_card',
        'Payroll Account': 'payroll_account',
        'Nonprofit/Charity Account': 'nonprofit_charity',
        'Escrow Account': 'escrow_account'
      };

      const mappedAccountTypes = formData.accountTypes.map(id => {
        const accountType = ACCOUNT_TYPES.find(at => at.id === id);
        return enumMapping[accountType?.name] || accountType?.name?.toLowerCase().replace(/\s+/g, '_');
      });

      // Check if email already exists in applications
      const { data: existingApp } = await supabase
        .from('applications')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase())
        .single();

      if (existingApp) {
        setErrors({ submit: 'An application with this email already exists. Please try another email or contact support.' });
        setLoading(false);
        return;
      }

      // Insert the application with user_id = NULL (admin will create user later)
      console.log('Creating application without user_id for email:', normalizedEmail);
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .insert([{
          user_id: null, // User will be created by admin during approval
          first_name: formData.firstName.trim(),
          middle_name: formData.middleName.trim() || null,
          last_name: formData.lastName.trim(),
          mothers_maiden_name: formData.mothersMaidenName.trim() || null,
          email: normalizedEmail, // Use the verified email
          phone: formData.phone.trim(),
          date_of_birth: formData.dateOfBirth,
          country: effectiveCountry,
          ssn: effectiveCountry === 'US' ? formData.ssn.trim() : null,
          id_number: effectiveCountry !== 'US' ? formData.idNumber.trim() : null,
          address: formData.address.trim(),
          city: effectiveCity,
          state: effectiveState,
          zip_code: formData.zipCode.trim(),
          employment_status: formData.employmentStatus,
          annual_income: formData.annualIncome,
          account_types: mappedAccountTypes,
          agree_to_terms: formData.agreeToTerms,
          application_status: 'pending',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (applicationError) {
        console.error('Application creation error:', applicationError);

        if (applicationError.code === '23505') {
          setErrors({ submit: 'An application with this email already exists. Please try another email or contact support.' });
          setLoading(false);
          return;
        }

        throw new Error('Failed to create application: ' + applicationError.message);
      }

      console.log('✅ Application created successfully:', applicationData.id);
      console.log('Application will be reviewed by admin who will create user account and send credentials');

      // Show success screen
      setSubmitSuccess(true);
      setCurrentStep(4); // Move to success screen

    } catch (error) {
      console.error('Application submission error:', error);

      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.message) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'An application with this email already exists. Please try another email or contact support.';
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = 'Invalid data format. Please check all fields and try again.';
        } else if (error.message.includes('Email must be verified')) {
          errorMessage = 'Email verification is required. Please verify your email first.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F6F8 0%, #e0f2fe 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
      color: 'white',
      padding: '1.5rem 0 0.5rem',
      boxShadow: '0 8px 32px rgba(26, 62, 111, 0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: 'white',
      textDecoration: 'none'
    },
    logoImage: {
      height: '50px',
      width: 'auto',
      objectFit: 'contain'
    },
    bankName: {
      fontSize: '1.5rem',
      fontWeight: '700',
      letterSpacing: '0.5px'
    },
    bankTagline: {
      fontSize: '0.85rem',
      fontWeight: '500',
      opacity: 0.8,
      color: '#FFC857'
    },
    headerInfo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem'
    },
    supportInfo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem'
    },
    supportLabel: {
      fontSize: '0.85rem',
      opacity: 0.9,
      fontWeight: '500',
      color: '#FFD687'
    },
    supportPhone: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#FFC857'
    },
    headerActions: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    loginButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.8rem 1.5rem',
      backgroundColor: 'rgba(255,200,87,0.15)',
      border: '2px solid rgba(255,200,87,0.3)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '10px',
      fontSize: '0.9rem',
      fontWeight: '700',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    homeButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,200,87,0.15)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '600',
      border: '2px solid rgba(255,200,87, 0.3)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    goBackButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,200,87,0.25)',
      color: 'white',
      border: '2px solid rgba(255,200,87,0.4)',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    buttonIcon: {
      fontSize: '1.1rem'
    },
    progressContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1rem 2rem 0'
    },
    progressBar: {
      width: '100%',
      height: '4px',
      backgroundColor: 'rgba(255,200,87,0.2)',
      borderRadius: '2px',
      marginBottom: '1rem',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #FFC857 0%, #FFD687 100%)',
      borderRadius: '2px',
      transition: 'width 0.5s ease'
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    progressStep: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: 0.5,
      transition: 'all 0.3s ease',
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '500'
    },
    progressStepActive: {
      opacity: 1,
      color: '#FFC857',
      fontWeight: '700',
      transform: 'scale(1.05)'
    },
    formCard: {
      background: 'white',
      borderRadius: '24px',
      padding: '3rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem',
      animation: 'fadeInUp 0.6s ease'
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1A3E6F',
      marginBottom: '2rem',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px'
    },
    formGrid: {
      display: 'grid',
      gap: '1.5rem'
    },
    gridCols2: {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    gridCols3: {
      gridTemplateColumns: 'repeat(3, 1fr)'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1A3E6F',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    required: {
      color: '#ef4444'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      backgroundColor: '#ffffff',
      fontFamily: 'inherit'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#1A3E6F',
      boxShadow: '0 0 0 3px rgba(26, 62, 111, 0.1)'
    },
    inputError: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2'
    },
    select: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '500',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    errorMessage: {
      color: '#ef4444',
      fontSize: '13px',
      fontWeight: '500',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    toggleButton: {
      fontSize: '12px',
      color: '#1A3E6F',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
      padding: '4px 0'
    },
    accountTypesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem',
      marginTop: '1rem'
    },
    accountCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden'
    },
    accountCardSelected: {
      borderColor: '#1A3E6F',
      backgroundColor: '#f0f4f8',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(26, 62, 111, 0.15)'
    },
    accountCardHover: {
      borderColor: '#9ca3af',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
      color: '#1A3E6F'
    },
    accountDescription: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '12px',
      lineHeight: 1.5
    },
    accountRate: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1A3E6F',
      backgroundColor: '#FFC857',
      padding: '4px 8px',
      borderRadius: '6px',
      display: 'inline-block'
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      marginTop: '1.5rem',
      position: 'relative',
      zIndex: 10
    },
    checkbox: {
      width: '20px',
      height: '20px',
      marginTop: '2px',
      cursor: 'pointer',
      accentColor: '#1A3E6F',
      transform: 'scale(1.2)',
      position: 'relative',
      zIndex: 11
    },
    checkboxLabel: {
      fontSize: '15px',
      color: '#1A3E6F',
      lineHeight: '1.6',
      cursor: 'pointer',
      fontWeight: '500',
      flex: 1,
      userSelect: 'none',
      paddingTop: '1px'
    },
    link: {
      color: '#1A3E6F',
      textDecoration: 'none',
      fontWeight: '600'
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '3rem',
      gap: '1rem'
    },
    button: {
      padding: '14px 28px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '52px'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
      color: 'white',
      border: 'none',
      padding: '1rem 2rem',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
      position: 'relative',
      overflow: 'hidden'
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      color: '#1A3E6F',
      border: '2px solid #1A3E6F',
      padding: '1rem 2rem',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    },
    outlineButton: {
      background: 'transparent',
      color: '#6b7280',
      border: '2px solid #d1d5db'
    },
    buttonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    errorAlert: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '12px',
      padding: '1rem',
      marginTop: '1rem'
    },
    errorAlertText: {
      color: '#ef4444',
      fontSize: '13px',
      fontWeight: '500'
    },
    successAlert: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1rem',
      textAlign: 'center'
    },
    successAlertText: {
      color: '#16a34a',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '0.5rem'
    },
    successMessage: {
      color: '#15803d',
      fontSize: '14px',
      fontWeight: '500'
    },

    // Footer Styles
    footer: {
      backgroundColor: '#1A3E6F',
      color: 'white',
      padding: '3rem 0 1rem',
      marginTop: '2rem'
    },
    footerContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 2rem'
    },
    footerGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '2rem',
      marginBottom: '2rem'
    },
    footerColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    footerLogo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1rem'
    },
    footerLogoImg: {
      height: '40px',
      width: 'auto',
      objectFit: 'contain'
    },
    footerBankName: {
      fontSize: '1.2rem',
      fontWeight: '700',
      color: 'white'
    },
    footerTagline: {
      fontSize: '0.8rem',
      color: '#FFC857'
    },
    footerDescription: {
      fontSize: '0.9rem',
      color: '#FFD687',
      lineHeight: '1.5'
    },
    footerColumnTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#FFC857',
      marginBottom: '0.5rem'
    },
    footerLinks: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    footerLink: {
      color: '#FFD687',
      textDecoration: 'none',
      fontSize: '0.9rem',
      transition: 'color 0.3s ease'
    },
    securityBadges: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    securityBadge: {
      backgroundColor: '#2A5490',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    footerBottom: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
      paddingTop: '2rem',
      borderTop: '1px solid rgba(255,200,87,0.3)'
    },
    footerBottomLeft: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    },
    routingText: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#FFC857',
      fontFamily: 'monospace'
    },
    memberText: {
      fontSize: '0.8rem',
      color: '#FFD687',
      fontWeight: '500'
    },
    footerBottomRight: {
      display: 'flex',
      gap: '1.5rem',
      flexWrap: 'wrap'
    },
    footerBottomLink: {
      color: '#FFD687',
      textDecoration: 'none',
      fontSize: '0.8rem',
      transition: 'color 0.3s ease'
    },
    copyright: {
      textAlign: 'center',
      paddingTop: '1rem',
      borderTop: '1px solid rgba(255,200,87,0.3)',
      marginTop: '1rem'
    },
    scrollingAccountContainer: {
      maxWidth: '1200px',
      margin: '1rem auto 0',
      padding: '0 2rem',
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '0.75rem 1.5rem',
      position: 'relative'
    },
    scrollingAccountText: {
      whiteSpace: 'nowrap',
      animation: 'scrollAccountOpening 25s linear infinite',
      color: '#FFD687',
      fontSize: '0.95rem',
      fontWeight: '600',
      letterSpacing: '0.5px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>

      <div style={styles.content}>
        {/* Enhanced Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logo}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logoImage} />
              <div>
                <div style={styles.bankName}>Oakline Bank</div>
                <div style={styles.bankTagline}>Your Financial Partner</div>
              </div>
            </Link>

            <div style={styles.headerInfo}>
              <div style={styles.supportInfo}>
                <span style={styles.supportLabel}>Need Help?</span>
                <span style={styles.supportPhone}>📞 1-800-OAKLINE</span>
              </div>
            </div>

            <div style={styles.headerActions}>
              <Link href="/login" style={styles.loginButton}>
                <span style={styles.buttonIcon}>👤</span>
                Existing Customer
              </Link>
              <div style={styles.headerButtons}>
                <Link href="/" style={styles.homeButton}>
                  <span style={styles.homeButtonIcon}>🏠</span>
                  Back to Home
                </Link>
                <button
                  onClick={() => window.history.back()}
                  style={styles.goBackButton}
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>

          {/* Scrolling Welcome Message */}
          <div style={styles.scrollingAccountContainer}>
            <div style={styles.scrollingAccountText}>
              Welcome to Oakline Bank - Your trusted financial partner since 1995 • Explore all 23 account types with detailed benefits • Join over 500,000+ satisfied customers • Award-winning mobile app • FDIC Insured up to $250,000 • Rated #1 Customer Service
            </div>
          </div>

          {/* Progress Indicator */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: currentStep === 0 ? '25%' : currentStep === 1 ? '50%' : currentStep === 2 ? '75%' : currentStep === 4 ? '100%' : '0%'
              }}></div>
            </div>
            <div style={styles.progressSteps}>
              <div style={{...styles.progressStep, ...(currentStep >= 0 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 0 ? '#FFC857' : 'rgba(255, 200, 87, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 0 ? '#1A3E6F' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 0 ? '3px solid #FFC857' : '3px solid rgba(255, 200, 87, 0.3)',
                  transition: 'all 0.3s ease'
                }}>✉</div>
                <span style={{fontWeight: currentStep === 0 ? '700' : '500'}}>Verify Email</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 1 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 1 ? '#FFC857' : 'rgba(255, 200, 87, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 1 ? '#1A3E6F' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 1 ? '3px solid #FFC857' : '3px solid rgba(255, 200, 87, 0.3)',
                  transition: 'all 0.3s ease'
                }}>👤</div>
                <span style={{fontWeight: currentStep === 1 ? '700' : '500'}}>Personal Info</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 2 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 2 ? '#FFC857' : 'rgba(255, 200, 87, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 2 ? '#1A3E6F' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 2 ? '3px solid #FFC857' : '3px solid rgba(255, 200, 87, 0.3)',
                  transition: 'all 0.3s ease'
                }}>🏠</div>
                <span style={{fontWeight: currentStep === 2 ? '700' : '500'}}>Address</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 3 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 3 ? '#FFC857' : 'rgba(255, 200, 87, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 3 ? '#1A3E6F' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 3 ? '3px solid #FFC857' : '3px solid rgba(255, 200, 87, 0.3)',
                  transition: 'all 0.3s ease'
                }}>💼</div>
                <span style={{fontWeight: currentStep === 3 ? '700' : '500'}}>Review</span>
              </div>
            </div>
          </div>
        </header>

        {/* Form Card */}
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {currentStep === 0 && (
              <>
                <span>✉️</span> Email Verification
              </>
            )}
            {currentStep === 1 && (
              <>
                <span>👤</span> Personal Information
              </>
            )}
            {currentStep === 2 && (
              <>
                <span>🏠</span> Address Details
              </>
            )}
            {currentStep === 3 && (
              <>
                <span>💼</span> Account & Employment
              </>
            )}
            {currentStep === 4 && (
              <>
                <span>🎉</span> Application Submitted
              </>
            )}
          </h2>

          {/* Step 0: Email Verification */}
          {currentStep === 0 && (
            <div style={{
              maxWidth: '500px',
              margin: '0 auto',
              padding: '2rem 0'
            }}>
              <p style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '16px',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                To ensure the security of your application, please verify your email address. We'll send you a verification code that you'll need to enter below.
              </p>

              {!codeSent ? (
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Email Address <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(e) => {
                        setVerificationEmail(e.target.value);
                        if (errors.verificationEmail) {
                          setErrors({});
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.verificationEmail ? styles.inputError : {})
                      }}
                      placeholder="your.email@example.com"
                      disabled={loading}
                    />
                    {errors.verificationEmail && (
                      <div style={styles.errorMessage}>⚠️ {errors.verificationEmail}</div>
                    )}
                  </div>

                  <button
                    onClick={handleSendVerificationCode}
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      ...(loading ? styles.buttonDisabled : {})
                    }}
                  >
                    {loading ? 'Sending...' : '📧 Send Verification Code'}
                  </button>
                </div>
              ) : (
                <div style={styles.formGrid}>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#16a34a',
                      fontWeight: '600'
                    }}>
                      ✅ Verification code sent to:
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#15803d',
                      fontWeight: '700',
                      marginTop: '0.5rem'
                    }}>
                      {verificationEmail}
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Verification Code <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        if (errors.verificationCode) {
                          setErrors({});
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.verificationCode ? styles.inputError : {}),
                        fontSize: '24px',
                        textAlign: 'center',
                        letterSpacing: '0.5rem',
                        fontFamily: 'monospace'
                      }}
                      placeholder="000000"
                      maxLength="6"
                      disabled={loading}
                    />
                    {errors.verificationCode && (
                      <div style={styles.errorMessage}>⚠️ {errors.verificationCode}</div>
                    )}
                    <p style={{
                      fontSize: '13px',
                      color: '#666',
                      marginTop: '0.5rem',
                      textAlign: 'center'
                    }}>
                      Please check your email and enter the 6-digit code we sent you.
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                  }}>
                    <button
                      onClick={handleVerifyEmail}
                      disabled={loading || !verificationCode}
                      style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        ...(loading || !verificationCode ? styles.buttonDisabled : {})
                      }}
                    >
                      {loading ? 'Verifying...' : '✓ Verify Email'}
                    </button>

                    <button
                      onClick={() => {
                        if (resendTimer === 0) {
                          handleSendVerificationCode();
                        }
                      }}
                      disabled={loading || resendTimer > 0}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton,
                        ...(loading || resendTimer > 0 ? styles.buttonDisabled : {})
                      }}
                    >
                      {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : '🔄 Resend Code'}
                    </button>

                    <button
                      onClick={() => {
                        setCodeSent(false);
                        setVerificationCode('');
                        setVerificationEmail('');
                        setErrors({});
                      }}
                      disabled={loading}
                      style={{
                        ...styles.button,
                        ...styles.outlineButton,
                        ...(loading ? styles.buttonDisabled : {})
                      }}
                    >
                      ✏️ Change Email Address
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div style={styles.formGrid}>
              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    First Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.firstName ? styles.inputError : {})
                    }}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <div style={styles.errorMessage}>⚠️ {errors.firstName}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your middle name"
                  />
                </div>
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Last Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.lastName ? styles.inputError : {})
                    }}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <div style={styles.errorMessage}>⚠️ {errors.lastName}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Mother's Maiden Name</label>
                  <input
                    type="text"
                    name="mothersMaidenName"
                    value={formData.mothersMaidenName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your mother's maiden name"
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Email Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly={isEmailVerified}
                  style={{
                    ...styles.input,
                    ...(errors.email ? styles.inputError : {}),
                    ...(isEmailVerified ? { backgroundColor: '#f0fdf4', cursor: 'not-allowed' } : {})
                  }}
                  placeholder="Enter your email address"
                />
                {isEmailVerified && (
                  <div style={{
                    fontSize: '13px',
                    color: '#16a34a',
                    fontWeight: '600',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ✅ Email verified
                  </div>
                )}
                {errors.email && (
                  <div style={styles.errorMessage}>⚠️ {errors.email}</div>
                )}
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Phone Number <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.phone ? styles.inputError : {})
                    }}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <div style={styles.errorMessage}>⚠️ {errors.phone}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Date of Birth <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.dateOfBirth ? styles.inputError : {})
                    }}
                  />
                  {errors.dateOfBirth && (
                    <div style={styles.errorMessage}>⚠️ {errors.dateOfBirth}</div>
                  )}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Country <span style={styles.required}>*</span>
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  style={{
                    ...styles.select,
                    ...(errors.country ? styles.inputError : {})
                  }}
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {showManualCountry && (
                  <input
                    type="text"
                    name="manualCountry"
                    value={formData.manualCountry}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your country"
                  />
                )}
                {errors.country && (
                  <div style={styles.errorMessage}>⚠️ {errors.country}</div>
                )}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {getEffectiveCountry() === 'US' ? 'Social Security Number' : 'Government ID Number'} <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name={getEffectiveCountry() === 'US' ? 'ssn' : 'idNumber'}
                  value={getEffectiveCountry() === 'US' ? formData.ssn : formData.idNumber}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    ...((getEffectiveCountry() === 'US' ? errors.ssn : errors.idNumber) ? styles.inputError : {})
                  }}
                  placeholder={getEffectiveCountry() === 'US' ? 'XXX-XX-XXXX' : 'Enter your government ID number'}
                />
                {getEffectiveCountry() === 'US' && errors.ssn && (
                  <div style={styles.errorMessage}>⚠️ {errors.ssn}</div>
                )}
                {getEffectiveCountry() !== 'US' && errors.idNumber && (
                  <div style={styles.errorMessage}>⚠️ {errors.idNumber}</div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Address Information */}
          {currentStep === 2 && (
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Street Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    ...(errors.address ? styles.inputError : {})
                  }}
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <div style={styles.errorMessage}>⚠️ {errors.address}</div>
                )}
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols3}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    City <span style={styles.required}>*</span>
                  </label>
                  {shouldShowManualCity() ? (
                    <input
                      type="text"
                      name="manualCity"
                      value={formData.manualCity || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.city) {
                          setErrors(prev => ({ ...prev, city: '' }));
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.city ? styles.inputError : {})
                      }}
                      placeholder="Enter your city"
                    />
                  ) : (
                    <select
                      name="city"
                      value={formData.city || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.city) {
                          setErrors(prev => ({ ...prev, city: '' }));
                        }
                      }}
                      style={{
                        ...styles.select,
                        ...(errors.city ? styles.inputError : {})
                      }}
                    >
                      <option value="">Select City</option>
                      {getAvailableCities().map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  )}
                  {getAvailableCities().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualCity(!showManualCity);
                        setFormData(prev => ({ ...prev, city: '', manualCity: '' }));
                        setErrors(prev => ({ ...prev, city: '' }));
                      }}
                      style={styles.toggleButton}
                    >
                      {showManualCity ? 'Select from list' : 'Enter manually'}
                    </button>
                  )}
                  {errors.city && (
                    <div style={styles.errorMessage}>⚠️ {errors.city}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    State / Province <span style={styles.required}>*</span>
                  </label>
                  {shouldShowManualState() ? (
                    <input
                      type="text"
                      name="manualState"
                      value={formData.manualState || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.state) {
                          setErrors(prev => ({ ...prev, state: '' }));
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.state ? styles.inputError : {})
                      }}
                      placeholder="Enter your state/province"
                    />
                  ) : (
                    <select
                      name="state"
                      value={formData.state || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.state) {
                          setErrors(prev => ({ ...prev, state: '' }));
                        }
                      }}
                      style={{
                        ...styles.select,
                        ...(errors.state ? styles.inputError : {})
                      }}
                    >
                      <option value="">Select State/Province</option>
                      {getAvailableStates().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  )}
                  {getAvailableStates().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualState(!showManualState);
                        setFormData(prev => ({ ...prev, state: '', manualState: '', city: '', manualCity: '' }));
                        setShowManualCity(false);
                        setErrors(prev => ({ ...prev, state: '', city: '' }));
                      }}
                      style={styles.toggleButton}
                    >
                      {showManualState ? 'Select from list' : 'Enter manually'}
                    </button>
                  )}
                  {errors.state && (
                    <div style={styles.errorMessage}>⚠️ {errors.state}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    ZIP / Postal Code <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.zipCode ? styles.inputError : {})
                    }}
                    placeholder="12345"
                  />
                  {errors.zipCode && (
                    <div style={styles.errorMessage}>⚠️ {errors.zipCode}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success Screen */}
          {currentStep === 4 && submitSuccess && (
            <div style={{
              textAlign: 'center',
              padding: '0',
              background: 'white',
              borderRadius: '20px',
              overflow: 'hidden',
              animation: 'fadeInUp 0.6s ease'
            }}>
              {/* Header Section with Oakline Branding */}
              <div style={{
                background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
                padding: '3rem 2rem',
                color: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <img src="/images/logo-primary.png" alt="Oakline Bank" style={{
                    height: '60px',
                    width: 'auto',
                    filter: 'brightness(0) invert(1)'
                  }} />
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>
                    Oakline Bank
                  </div>
                </div>

                <div style={{
                  fontSize: '80px',
                  marginBottom: '1rem',
                  animation: 'bounce 1s ease'
                }}>✅</div>

                <h2 style={{
                  fontSize: 'clamp(28px, 5vw, 36px)',
                  marginBottom: '1rem',
                  fontWeight: '700'
                }}>
                  Application Submitted Successfully!
                </h2>

                <p style={{
                  fontSize: 'clamp(16px, 3vw, 18px)',
                  marginBottom: '0',
                  lineHeight: '1.6',
                  opacity: 0.95
                }}>
                  Welcome to the Oakline Bank family
                </p>
              </div>

              {/* Content Section */}
              <div style={{ padding: '3rem 2rem' }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '2rem',
                  borderRadius: '15px',
                  marginBottom: '2rem',
                  border: '2px solid #e2e8f0'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    color: '#1A3E6F',
                    marginBottom: '1.5rem',
                    fontWeight: '700'
                  }}>📧 What Happens Next?</h3>

                  <div style={{
                    textAlign: 'left',
                    maxWidth: '600px',
                    margin: '0 auto'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: '1.5rem',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: '32px',
                        backgroundColor: '#FFC857',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>1</div>
                      <div>
                        <strong style={{ color: '#1A3E6F', fontSize: '18px' }}>Application Review</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                          Our team will review your application within 24-48 hours
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: '1.5rem',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: '32px',
                        backgroundColor: '#FFC857',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>2</div>
                      <div>
                        <strong style={{ color: '#1A3E6F', fontSize: '18px' }}>Approval Email</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                          Once approved, you'll receive an email at <strong style={{ color: '#1A3E6F' }}>{formData.email}</strong> with your login credentials
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: '32px',
                        backgroundColor: '#FFC857',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>3</div>
                      <div>
                        <strong style={{ color: '#1A3E6F', fontSize: '18px' }}>Start Banking</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                          Log in with your credentials and start enjoying your new banking accounts
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fff7ed',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  border: '2px solid #FFC857',
                  textAlign: 'left'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#92400e',
                    fontSize: '15px',
                    lineHeight: '1.6'
                  }}>
                    <strong>⏰ Important:</strong> Please allow 24-48 hours for application review. You will receive an email notification once your application has been processed.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => router.push('/')}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 24px rgba(26, 62, 111, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 6px 20px rgba(26, 62, 111, 0.4)';
                    }}
                  >
                    🏠 Return to Home
                  </button>

                  <button
                    onClick={() => router.push('/login')}
                    style={{
                      padding: '16px 32px',
                      backgroundColor: 'transparent',
                      color: '#1A3E6F',
                      border: '2px solid #1A3E6F',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#1A3E6F';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#1A3E6F';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    🔑 Go to Login
                  </button>
                </div>

                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    Need assistance? Contact our support team at{' '}
                    <a href="tel:1-800-OAKLINE" style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none' }}>
                      1-800-OAKLINE
                    </a>
                    {' '}or email{' '}
                    <a href="mailto:support@theoaklinebank.com" style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none' }}>
                      support@theoaklinebank.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Account & Employment */}
          {currentStep === 3 && (
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Choose Your Account Types <span style={styles.required}>*</span>
                </label>
                {errors.accountTypes && (
                  <div style={styles.errorMessage}>⚠️ {errors.accountTypes}</div>
                )}
                <div style={styles.accountTypesGrid}>
                  {ACCOUNT_TYPES.map(account => (
                    <div
                      key={account.id}
                      onClick={() => toggleAccountType(account.id)}
                      style={{
                        ...styles.accountCard,
                        ...(formData.accountTypes.includes(account.id) ? styles.accountCardSelected : {})
                      }}
                      onMouseEnter={(e) => {
                        if (!formData.accountTypes.includes(account.id)) {
                          Object.assign(e.target.style, styles.accountCardHover);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!formData.accountTypes.includes(account.id)) {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={styles.accountHeader}>
                        <div style={{
                          ...styles.accountIcon,
                          backgroundColor: formData.accountTypes.includes(account.id) ? '#3b82f6' : '#f1f5f9',
                          color: formData.accountTypes.includes(account.id) ? 'white' : 'inherit'
                        }}>
                          {account.icon}
                        </div>
                        <div style={styles.accountName}>{account.name}</div>
                      </div>
                      <div style={styles.accountDescription}>{account.description}</div>
                      <div style={styles.accountRate}>{account.rate}</div>
                      {formData.accountTypes.includes(account.id) && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#1A3E6F',
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
                  ))}
                </div>
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Employment Status <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleInputChange}
                    style={{
                      ...styles.select,
                      ...(errors.employmentStatus ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="employed_fulltime">Employed Full-time</option>
                    <option value="employed_parttime">Employed Part-time</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                  {errors.employmentStatus && (
                    <div style={styles.errorMessage}>⚠️ {errors.employmentStatus}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Annual Income <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                    style={{
                      ...styles.select,
                      ...(errors.annualIncome ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Income Range</option>
                    <option value="under_25k">Under $25,000</option>
                    <option value="25k_50k">$25,000 - $50,000</option>
                    <option value="50k_75k">$50,000 - $75,000</option>
                    <option value="75k_100k">$75,000 - $100,000</option>
                    <option value="100k_150k">$100,000 - $150,000</option>
                    <option value="over_150k">Over $150,000</option>
                  </select>
                  {errors.annualIncome && (
                    <div style={styles.errorMessage}>⚠️ {errors.annualIncome}</div>
                  )}
                </div>
              </div>

              <div style={{
                ...styles.checkboxContainer,
                borderColor: formData.agreeToTerms ? '#1A3E6F' : '#e2e8f0',
                backgroundColor: formData.agreeToTerms ? '#f0fdf4' : '#f8fafc'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  {formData.agreeToTerms && (
                    <span style={{color: '#1A3E6F', fontSize: '16px', fontWeight: 'bold'}}>✓</span>
                  )}
                </div>
                <label
                  style={styles.checkboxLabel}
                  onClick={() => handleInputChange({target: {name: 'agreeToTerms', type: 'checkbox', checked: !formData.agreeToTerms}})}
                >
                  I agree to the{' '}
                  <Link href="/terms" style={styles.link}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" style={styles.link}>
                    Privacy Policy
                  </Link>{' '}
                  <span style={styles.required}>*</span>
                </label>
              </div>
              {errors.agreeToTerms && (
                <div style={styles.errorMessage}>⚠️ {errors.agreeToTerms}</div>
              )}

              {errors.submit && (
                <div style={styles.errorAlert}>
                  <div style={styles.errorAlertText}>⚠️ {errors.submit}</div>
                </div>
              )}

              {submitSuccess && (
                <div style={styles.successAlert}>
                  <div style={styles.successAlertText}>🎉 Application Submitted Successfully!</div>
                  <div style={styles.successMessage}>
                    Your account has been created and a welcome email with enrollment instructions has been sent to {formData.email}.
                    Please check your inbox (and spam folder) for the enrollment link.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={styles.buttonContainer}>
            {currentStep > 0 && currentStep < 4 && (
              <button
                onClick={handleBack}
                style={{...styles.button, ...styles.outlineButton}}
              >
                ← Back
              </button>
            )}

            <div style={{marginLeft: currentStep === 1 ? 'auto' : currentStep === 0 ? 'auto' : '0'}}>
              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  style={{...styles.button, ...styles.primaryButton}}
                >
                  Next Step →
                </button>
              ) : currentStep === 3 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.agreeToTerms}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    ...(loading || !formData.agreeToTerms ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff40',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      🎉 Submit Application
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.footerLinks}>
          <Link href="/login" style={styles.footerLink}>
            Already have an account? Sign In
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerGrid}>
            <div style={styles.footerColumn}>
              <div style={styles.footerLogo}>
                <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.footerLogoImg} />
                <div style={styles.footerBankName}>Oakline Bank</div>
              </div>
              <div style={styles.footerTagline}>Your Financial Partner</div>
              <div style={styles.footerDescription}>
                We are committed to providing exceptional banking services tailored to your needs. From everyday accounts to strategic investments, we're here to help you achieve your financial goals.
              </div>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Quick Links</div>
              <ul style={styles.footerLinks}>
                <li><Link href="/about" style={styles.footerLink}>About Us</Link></li>
                <li><Link href="/services" style={styles.footerLink}>Services</Link></li>
                <li><Link href="/contact" style={styles.footerLink}>Contact Us</Link></li>
                <li><Link href="/faq" style={styles.footerLink}>FAQ</Link></li>
              </ul>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Support</div>
              <ul style={styles.footerLinks}>
                <li><Link href="/support/account-help" style={styles.footerLink}>Account Help</Link></li>
                <li><Link href="/support/security" style={styles.footerLink}>Security Center</Link></li>
                <li><Link href="/support/fees" style={styles.footerLink}>Fee Schedule</Link></li>
                <li><Link href="/support/privacy" style={styles.footerLink}>Privacy Policy</Link></li>
              </ul>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Connect With Us</div>
              <div style={styles.footerDescription}>Follow us on social media for the latest updates and financial tips.</div>
              <div style={styles.footerBottomRight}>
                <Link href="#" style={styles.footerBottomLink}>Facebook</Link>
                <Link href="#" style={styles.footerBottomLink}>Twitter</Link>
                <Link href="#" style={styles.footerBottomLink}>LinkedIn</Link>
              </div>
              <div style={styles.securityBadges}>
                <div style={styles.securityBadge}>🔒 Secure Connection</div>
                <div style={styles.securityBadge}>🛡️ FDIC Insured</div>
              </div>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <div style={styles.footerBottomLeft}>
              <div style={styles.routingText}>Routing Number: 075915826</div>
              <div style={styles.memberText}>Member FDIC | Equal Housing Lender</div>
            </div>
            <div style={styles.footerBottomRight}>
              <Link href="/terms" style={styles.footerBottomLink}>Terms of Service</Link>
              <Link href="/privacy" style={styles.footerBottomLink}>Privacy Policy</Link>
            </div>
          </div>
          <div style={styles.copyright}>
            © 2024 Oakline Bank. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes scrollAccountOpening {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }

        .grid-cols-2 {
          grid-template-columns: repeat(2, 1fr);
        }
        .grid-cols-3 {
          grid-template-columns: repeat(3, 1fr);
        }


        @media (max-width: 768px) {
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }

        input:focus, select:focus {
          outline: none !important;
          border-color: #1A3E6F !important;
          box-shadow: 0 0 0 3px rgba(26, 62, 111, 0.1) !important;
        }
      `}</style>
    </div>
  );
}