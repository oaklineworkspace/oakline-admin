
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AdminRoute from '../components/AdminRoute';

export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    // Bank Configuration
    bank_name: 'Oakline Bank',
    bank_code: 'OLB001',
    routing_number: '123456789',
    swift_code: 'OLBKUS33',
    
    // Transaction Limits
    daily_transaction_limit: 5000,
    monthly_transaction_limit: 50000,
    max_transfer_amount: 10000,
    min_account_balance: 0,
    
    // Card Settings
    default_daily_card_limit: 1000,
    default_monthly_card_limit: 10000,
    card_activation_required: true,
    
    // Interest Rates
    savings_interest_rate: 4.50,
    checking_interest_rate: 0.01,
    loan_base_rate: 6.00,
    
    // Security Settings
    session_timeout_minutes: 30,
    password_expiry_days: 90,
    max_login_attempts: 5,
    require_2fa: false,
    
    // Notification Settings
    email_notifications: true,
    sms_notifications: true,
    transaction_alerts: true,
    security_alerts: true,
    
    // System Settings
    maintenance_mode: false,
    allow_new_registrations: true,
    auto_approve_accounts: false,
    backup_frequency_hours: 24
  });
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch system settings from settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Convert array of settings to object
      if (settingsData && settingsData.length > 0) {
        const settingsObj = {};
        settingsData.forEach(setting => {
          settingsObj[setting.key] = setting.value;
        });
        
        setSettings(prevSettings => ({
          ...prevSettings,
          ...settingsObj
        }));
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare settings for upsert
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_by: user.id
      }));

      // Upsert settings one by one
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            updated_by: setting.updated_by,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      setSuccess('Settings saved successfully!');

    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) return;

    setSettings({
      bank_name: 'Oakline Bank',
      bank_code: 'OLB001',
      routing_number: '123456789',
      swift_code: 'OLBKUS33',
      daily_transaction_limit: 5000,
      monthly_transaction_limit: 50000,
      max_transfer_amount: 10000,
      min_account_balance: 0,
      default_daily_card_limit: 1000,
      default_monthly_card_limit: 10000,
      card_activation_required: true,
      savings_interest_rate: 4.50,
      checking_interest_rate: 0.01,
      loan_base_rate: 6.00,
      session_timeout_minutes: 30,
      password_expiry_days: 90,
      max_login_attempts: 5,
      require_2fa: false,
      email_notifications: true,
      sms_notifications: true,
      transaction_alerts: true,
      security_alerts: true,
      maintenance_mode: false,
      allow_new_registrations: true,
      auto_approve_accounts: false,
      backup_frequency_hours: 24
    });

    setSuccess('Settings reset to defaults. Click Save to apply changes.');
  };

  if (loading) {
    return (
      <AdminRoute>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading system settings...</p>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>⚙️ System Settings</h1>
            <p style={styles.subtitle}>Configure bank system parameters and preferences</p>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={handleResetToDefaults}
              style={styles.resetButton}
            >
              🔄 Reset to Defaults
            </button>
            <Link href="/dashboard" style={styles.backButton}>
              ← Dashboard
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.content}>
          {/* Bank Configuration */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🏦 Bank Configuration</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Bank Name</label>
                <input
                  type="text"
                  value={settings.bank_name}
                  onChange={(e) => handleSettingChange('bank_name', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Bank Code</label>
                <input
                  type="text"
                  value={settings.bank_code}
                  onChange={(e) => handleSettingChange('bank_code', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Routing Number</label>
                <input
                  type="text"
                  value={settings.routing_number}
                  onChange={(e) => handleSettingChange('routing_number', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>SWIFT Code</label>
                <input
                  type="text"
                  value={settings.swift_code}
                  onChange={(e) => handleSettingChange('swift_code', e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Transaction Limits */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>💰 Transaction Limits</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Daily Transaction Limit ($)</label>
                <input
                  type="number"
                  value={settings.daily_transaction_limit}
                  onChange={(e) => handleSettingChange('daily_transaction_limit', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Monthly Transaction Limit ($)</label>
                <input
                  type="number"
                  value={settings.monthly_transaction_limit}
                  onChange={(e) => handleSettingChange('monthly_transaction_limit', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Max Transfer Amount ($)</label>
                <input
                  type="number"
                  value={settings.max_transfer_amount}
                  onChange={(e) => handleSettingChange('max_transfer_amount', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Minimum Account Balance ($)</label>
                <input
                  type="number"
                  value={settings.min_account_balance}
                  onChange={(e) => handleSettingChange('min_account_balance', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Card Settings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>💳 Card Settings</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Default Daily Card Limit ($)</label>
                <input
                  type="number"
                  value={settings.default_daily_card_limit}
                  onChange={(e) => handleSettingChange('default_daily_card_limit', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Default Monthly Card Limit ($)</label>
                <input
                  type="number"
                  value={settings.default_monthly_card_limit}
                  onChange={(e) => handleSettingChange('default_monthly_card_limit', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.card_activation_required}
                    onChange={(e) => handleSettingChange('card_activation_required', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Require Card Activation
                </label>
              </div>
            </div>
          </div>

          {/* Interest Rates */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📈 Interest Rates (%)</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Savings Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.savings_interest_rate}
                  onChange={(e) => handleSettingChange('savings_interest_rate', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Checking Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.checking_interest_rate}
                  onChange={(e) => handleSettingChange('checking_interest_rate', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Loan Base Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.loan_base_rate}
                  onChange={(e) => handleSettingChange('loan_base_rate', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🔒 Security Settings</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={(e) => handleSettingChange('session_timeout_minutes', parseInt(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password Expiry (days)</label>
                <input
                  type="number"
                  value={settings.password_expiry_days}
                  onChange={(e) => handleSettingChange('password_expiry_days', parseInt(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Max Login Attempts</label>
                <input
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => handleSettingChange('max_login_attempts', parseInt(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.require_2fa}
                    onChange={(e) => handleSettingChange('require_2fa', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Require 2FA
                </label>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🔔 Notification Settings</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Email Notifications
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={(e) => handleSettingChange('sms_notifications', e.target.checked)}
                    style={styles.checkbox}
                  />
                  SMS Notifications
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.transaction_alerts}
                    onChange={(e) => handleSettingChange('transaction_alerts', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Transaction Alerts
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.security_alerts}
                    onChange={(e) => handleSettingChange('security_alerts', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Security Alerts
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🖥️ System Settings</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Maintenance Mode
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.allow_new_registrations}
                    onChange={(e) => handleSettingChange('allow_new_registrations', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Allow New Registrations
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settings.auto_approve_accounts}
                    onChange={(e) => handleSettingChange('auto_approve_accounts', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Auto-Approve Accounts
                </label>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Backup Frequency (hours)</label>
                <input
                  type="number"
                  value={settings.backup_frequency_hours}
                  onChange={(e) => handleSettingChange('backup_frequency_hours', parseInt(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={styles.saveSection}>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '💾 Saving...' : '💾 Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  resetButton: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  backButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
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
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #fecaca'
  },
  success: {
    background: '#d1fae5',
    color: '#059669',
    padding: '15px',
    borderRadius: '8px',
    margin: '0 0 20px 0',
    border: '1px solid #a7f3d0'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  section: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    margin: '0 0 20px 0'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
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
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#374151'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  saveSection: {
    display: 'flex',
    justifyContent: 'center',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  saveButton: {
    background: '#059669',
    color: 'white',
    border: 'none',
    padding: '15px 40px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600'
  }
};
