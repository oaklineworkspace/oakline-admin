
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DebitCard({ 
  user, 
  userProfile, 
  account, 
  cardData = null,
  showDetails = true,
  showControls = true,
  isSelected = false
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cardSettings, setCardSettings] = useState({
    isLocked: false,
    dailyLimit: 1000,
    monthlyLimit: 10000,
    contactlessEnabled: true,
    internationalEnabled: false,
    onlineEnabled: true
  });

  useEffect(() => {
    if (cardData) {
      setCardSettings({
        isLocked: cardData.is_locked || false,
        dailyLimit: cardData.daily_limit || 1000,
        monthlyLimit: cardData.monthly_limit || 10000,
        contactlessEnabled: cardData.contactless_enabled !== false,
        internationalEnabled: cardData.international_enabled || false,
        onlineEnabled: cardData.online_enabled !== false
      });
    }
  }, [cardData]);

  const getCardholderName = () => {
    if (cardData?.cardholder_name) return cardData.cardholder_name;
    if (userProfile) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim().toUpperCase();
    }
    return user?.email?.split('@')[0]?.toUpperCase() || 'CARD HOLDER';
  };

  const getCardNumber = () => {
    if (cardData?.card_number) {
      return cardData.card_number;
    }
    return '**** **** **** ****';
  };

  const getExpiryDate = () => {
    if (cardData?.expiry_date) {
      return cardData.expiry_date;
    }
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    return `${String(futureDate.getMonth() + 1).padStart(2, '0')}/${String(futureDate.getFullYear()).slice(-2)}`;
  };

  const getAccountBalance = () => {
    if (account?.balance !== undefined) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(account.balance);
    }
    return '$0.00';
  };

  const getAccountNumber = () => {
    if (account?.account_number) {
      return `****${account.account_number.slice(-4)}`;
    }
    return '****0000';
  };

  const updateCardSettings = async (newSettings) => {
    if (!cardData) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          is_locked: newSettings.isLocked,
          daily_limit: newSettings.dailyLimit,
          monthly_limit: newSettings.monthlyLimit,
          contactless_enabled: newSettings.contactlessEnabled,
          international_enabled: newSettings.internationalEnabled,
          online_enabled: newSettings.onlineEnabled
        })
        .eq('id', cardData.id);

      if (error) {
        setMessage('Error updating card settings');
      } else {
        setCardSettings(newSettings);
        setMessage('Card settings updated successfully');
      }
    } catch (error) {
      setMessage('Error updating card settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardLock = () => {
    const newSettings = { ...cardSettings, isLocked: !cardSettings.isLocked };
    updateCardSettings(newSettings);
  };

  return (
    <div style={{
      ...styles.container,
      border: isSelected ? '3px solid #1e40af' : '1px solid #e2e8f0'
    }}>
      {isSelected && (
        <div style={styles.selectedIndicator}>
          ✓ Selected
        </div>
      )}

      {/* Virtual Debit Card */}
      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.bankName}>OAKLINE BANK</div>
            <div style={styles.cardType}>DEBIT</div>
          </div>
          
          <div style={styles.chipSection}>
            <div style={styles.chip}></div>
            <div style={styles.contactless}>
              <svg style={styles.contactlessIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div style={styles.cardNumber}>
            {getCardNumber()}
          </div>

          <div style={styles.cardFooter}>
            <div style={styles.cardholderSection}>
              <div style={styles.cardLabel}>CARDHOLDER NAME</div>
              <div style={styles.cardholderName}>{getCardholderName()}</div>
            </div>
            <div style={styles.expirySection}>
              <div style={styles.cardLabel}>EXPIRES</div>
              <div style={styles.expiryDate}>{getExpiryDate()}</div>
            </div>
          </div>
        </div>
      </div>

      {showDetails && account && (
        <div style={styles.accountDetails}>
          <h4 style={styles.accountTitle}>Linked Account</h4>
          <div style={styles.accountInfo}>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>Account Type:</span>
              <span style={styles.accountValue}>{account.account_type || 'Checking'}</span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>Account Number:</span>
              <span style={styles.accountValue}>{getAccountNumber()}</span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>Available Balance:</span>
              <span style={styles.accountValue}>{getAccountBalance()}</span>
            </div>
          </div>
        </div>
      )}

      {showControls && cardData && (
        <div style={styles.cardControls}>
          <h4 style={styles.controlsTitle}>Card Controls</h4>
          
          <div style={styles.controlSection}>
            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>Card Status:</span>
              <button
                onClick={toggleCardLock}
                style={{
                  ...styles.toggleButton,
                  backgroundColor: cardSettings.isLocked ? '#ef4444' : '#10b981'
                }}
                disabled={loading}
              >
                {cardSettings.isLocked ? '🔒 Locked' : '🔓 Active'}
              </button>
            </div>

            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>Daily Limit:</span>
              <span style={styles.controlValue}>
                ${cardSettings.dailyLimit.toLocaleString()}
              </span>
            </div>

            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>Monthly Limit:</span>
              <span style={styles.controlValue}>
                ${cardSettings.monthlyLimit.toLocaleString()}
              </span>
            </div>

            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>Contactless:</span>
              <span style={styles.controlValue}>
                {cardSettings.contactlessEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>

            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>International:</span>
              <span style={styles.controlValue}>
                {cardSettings.internationalEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>

            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>Online Payments:</span>
              <span style={styles.controlValue}>
                {cardSettings.onlineEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              color: message.includes('Error') ? '#ef4444' : '#10b981'
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    position: 'relative'
  },
  selectedIndicator: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  cardContainer: {
    marginBottom: '2rem'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    height: '250px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '16px',
    padding: '2rem',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(30, 64, 175, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bankName: {
    fontSize: '1rem',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  cardType: {
    fontSize: '0.875rem',
    fontWeight: 'bold',
    opacity: 0.9
  },
  chipSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1rem 0'
  },
  chip: {
    width: '50px',
    height: '40px',
    backgroundColor: '#ffd700',
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden'
  },
  contactless: {
    opacity: 0.8
  },
  contactlessIcon: {
    width: '24px',
    height: '24px',
    color: 'white'
  },
  cardNumber: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    letterSpacing: '2px',
    fontFamily: 'monospace',
    margin: '1rem 0'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  cardholderSection: {
    flex: 1
  },
  expirySection: {
    textAlign: 'right'
  },
  cardLabel: {
    fontSize: '0.7rem',
    opacity: 0.8,
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  cardholderName: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  expiryDate: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  accountDetails: {
    backgroundColor: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  },
  accountTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  accountValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: 'bold'
  },
  cardControls: {
    backgroundColor: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '12px'
  },
  controlsTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  controlSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  controlLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  controlValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: 'bold'
  },
  toggleButton: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  message: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    fontSize: '0.875rem',
    fontWeight: '500'
  }
};
