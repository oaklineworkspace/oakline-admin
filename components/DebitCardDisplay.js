
import { useState, useEffect } from 'react';

export default function DebitCardDisplay({ card, account, onAction }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatCardNumber = (number) => {
    if (!number) return '**** **** **** ****';
    const cleaned = number.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance || 0);
  };

  const getCardStatus = () => {
    if (card.is_locked) return { text: 'Locked', color: '#ef4444' };
    if (card.status === 'active') return { text: 'Active', color: '#10b981' };
    return { text: 'Inactive', color: '#6b7280' };
  };

  const status = getCardStatus();

  return (
    <div style={styles.container}>
      {/* Card Visual */}
      <div 
        style={styles.cardWrapper}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div style={{
          ...styles.card,
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          {/* Front of card */}
          <div style={{
            ...styles.cardSide,
            opacity: isFlipped ? 0 : 1,
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}>
            <div style={styles.cardHeader}>
              <span style={styles.bankName}>OAKLINE BANK</span>
              <span style={styles.cardType}>DEBIT</span>
            </div>
            
            <div style={styles.chipRow}>
              <div style={styles.chip}></div>
              <div style={styles.contactless}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6" stroke="white" strokeWidth="2"/>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="white" strokeWidth="2"/>
                  <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
            </div>

            <div style={styles.cardNumber}>
              {formatCardNumber(card.card_number)}
            </div>

            <div style={styles.cardFooter}>
              <div>
                <div style={styles.label}>CARDHOLDER</div>
                <div style={styles.value}>{card.cardholder_name}</div>
              </div>
              <div>
                <div style={styles.label}>EXPIRES</div>
                <div style={styles.value}>{card.expiry_date}</div>
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div style={{
            ...styles.cardSide,
            ...styles.cardBack,
            opacity: isFlipped ? 1 : 0,
            transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)'
          }}>
            <div style={styles.magneticStripe}></div>
            <div style={styles.cvvArea}>
              <div style={styles.cvvLabel}>CVV</div>
              <div style={styles.cvvBox}>{card.cvv || '***'}</div>
            </div>
            <div style={styles.cardInfo}>
              <p style={styles.cardInfoText}>
                For customer service call 1-800-OAKLINE
              </p>
              <p style={styles.cardInfoText}>
                This card is property of Oakline Bank
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Details */}
      <div style={styles.details}>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Status:</span>
          <span style={{
            ...styles.statusValue,
            color: status.color
          }}>
            {status.text}
          </span>
        </div>

        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Daily Limit</span>
            <span style={styles.detailValue}>
              {formatBalance(card.daily_limit)}
            </span>
          </div>
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Monthly Limit</span>
            <span style={styles.detailValue}>
              {formatBalance(card.monthly_limit)}
            </span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Account Balance</span>
            <span style={styles.detailValue}>
              {formatBalance(account?.balance)}
            </span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Account Type</span>
            <span style={styles.detailValue}>
              {account?.account_type?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            style={{
              ...styles.actionButton,
              backgroundColor: card.is_locked ? '#10b981' : '#f59e0b'
            }}
            onClick={() => onAction(card.id, card.is_locked ? 'unlock' : 'lock')}
          >
            {card.is_locked ? '🔓 Unlock Card' : '🔒 Lock Card'}
          </button>
          
          <button
            style={styles.actionButton}
            onClick={() => onAction(card.id, 'view_transactions')}
          >
            📊 View Transactions
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem'
  },
  cardWrapper: {
    perspective: '1000px',
    marginBottom: '2rem',
    cursor: 'pointer'
  },
  card: {
    width: '380px',
    height: '240px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s',
    margin: '0 auto'
  },
  cardSide: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '16px',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 8px 32px rgba(30, 64, 175, 0.3)',
    transition: 'opacity 0.3s, transform 0.6s'
  },
  cardBack: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
    transform: 'rotateY(180deg)'
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
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  chip: {
    width: '50px',
    height: '40px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    borderRadius: '8px',
    position: 'relative'
  },
  contactless: {
    opacity: 0.8
  },
  cardNumber: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    letterSpacing: '3px',
    fontFamily: 'monospace',
    textAlign: 'center'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  label: {
    fontSize: '0.7rem',
    opacity: 0.8,
    marginBottom: '4px'
  },
  value: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  magneticStripe: {
    width: '100%',
    height: '40px',
    backgroundColor: '#000',
    marginTop: '20px'
  },
  cvvArea: {
    backgroundColor: 'white',
    color: 'black',
    padding: '1rem',
    margin: '20px 0',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cvvLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  cvvBox: {
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace'
  },
  cardInfo: {
    fontSize: '0.7rem',
    opacity: 0.8
  },
  cardInfoText: {
    margin: '4px 0'
  },
  details: {
    padding: '1rem 0'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  statusLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151'
  },
  statusValue: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  detailItem: {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    textAlign: 'center'
  },
  detailLabel: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.5rem'
  },
  detailValue: {
    display: 'block',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#111827'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center'
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    border: 'none',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#3b82f6'
  }
};
