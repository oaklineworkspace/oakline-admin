import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import DebitCard from '../components/DebitCard';
import LiveChat from '../components/LiveChat';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function DashboardContent() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [cardApplicationStatus, setCardApplicationStatus] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [visibleCardDetails, setVisibleCardDetails] = useState({});
  const [pinModal, setPinModal] = useState({ open: false, cardId: null });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData(user.id);
    }
  }, [user]);

  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('applications')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Fetch accounts - use single query method to avoid duplicates
      let accountsData = [];

      try {
        // Primary method: fetch by user_id
        const { data: accountsByUserId, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (!accountsError && accountsByUserId && accountsByUserId.length > 0) {
          accountsData = accountsByUserId;
        } else {
          // Fallback: try by email if user_id doesn't work
          const { data: accountsByEmail } = await supabase
            .from('accounts')
            .select('*')
            .eq('email', user.email)
            .order('created_at', { ascending: true });

          accountsData = accountsByEmail || [];
        }

        // Remove duplicates by account_number (in case there are any)
        const uniqueAccounts = accountsData.filter((account, index, self) =>
          index === self.findIndex((a) => a.account_number === account.account_number)
        );

        accountsData = uniqueAccounts;
      } catch (accountError) {
        console.error('Error fetching accounts:', accountError);
        accountsData = [];
      }

      setAccounts(accountsData || []);

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setTransactions(transactionsData || []);

      // Fetch user cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setCards(cardsData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyForCard = async () => {
    setCardApplicationStatus('');

    if (accounts.length === 0) {
      setCardApplicationStatus('error: You need to have an account first to apply for a card.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCardApplicationStatus('error: Please log in to apply for a card');
        return;
      }

      const response = await fetch('/api/apply-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accounts[0].id // Apply for card linked to first account
        })
      });

      const data = await response.json();

      if (data.success) {
        setCardApplicationStatus('Card application submitted successfully! You will receive confirmation once approved.');
      } else {
        setCardApplicationStatus('error: ' + (data.error || 'Failed to submit application'));
      }
    } catch (error) {
      console.error('Error applying for card:', error);
      setCardApplicationStatus('error: Error submitting application');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount || 0));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, acc) => total + (parseFloat(acc.balance) || 0), 0);
  };

  const getUserDisplayName = () => {
    if (userProfile) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const toggleDropdown = (menu) => {
    setDropdownOpen(prev => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [menu]: !prev[menu]
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownOpen({});
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleCardVisibility = (cardId) => {
    setVisibleCardDetails(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const openPinModal = (cardId) => {
    setPinModal({ open: true, cardId });
    setPinInput('');
    setPinError('');
    setPinSuccess('');
  };

  const closePinModal = () => {
    setPinModal({ open: false, cardId: null });
    setPinInput('');
    setPinError('');
    setPinSuccess('');
  };

  const handleSetPin = async () => {
    setPinError('');
    setPinSuccess('');

    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN must be 4-6 digits');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPinError('Please log in to set PIN');
        return;
      }

      const response = await fetch('/api/cards/set-pin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardId: pinModal.cardId,
          pin: pinInput
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPinSuccess('PIN set successfully!');
        setTimeout(() => {
          closePinModal();
          loadUserData(user.id); // Reload to update PIN status
        }, 1500);
      } else {
        setPinError(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      setPinError('Error setting PIN. Please try again.');
    }
  };

  const getCardTypeColor = (cardType) => {
    const colors = {
      visa: 'linear-gradient(135deg, #1a1f71 0%, #0f7dc1 100%)',
      mastercard: 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)',
      amex: 'linear-gradient(135deg, #006fcf 0%, #00a3e0 100%)'
    };
    return colors[cardType?.toLowerCase()] || 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';
  };

  const getCardTypeLogo = (cardType) => {
    const logos = {
      visa: 'VISA',
      mastercard: 'Mastercard',
      amex: 'AMEX'
    };
    return logos[cardType?.toLowerCase()] || 'CARD';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your dashboard...</div>
      </div>
    );
  }

  // Add hover effects for dropdown items
  if (typeof document !== 'undefined') {
    const existingStyle = document.querySelector('#dropdown-styles');
    if (!existingStyle) {
      const dropdownStyles = document.createElement('style');
      dropdownStyles.id = 'dropdown-styles';
      dropdownStyles.textContent = `
      .dropdown-link:hover {
        background-color: #f3f4f6 !important;
        color: #1a365d !important;
        transform: translateX(4px);
      }

      .nav-button:hover {
        background-color: rgba(255, 255, 255, 0.2) !important;
        transform: translateY(-2px);
      }
    `;
      document.head.appendChild(dropdownStyles);
    }
  }


  return (
    <div style={styles.container} onClick={closeAllDropdowns}>
      {/* Professional Banking Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <span style={styles.brandTagline}>Your Financial Partner</span>
              </div>
            </Link>
          </div>

          <nav style={styles.mainNav}>
            <div style={styles.navItem}>
              <button style={styles.navButton} onClick={(e) => { e.stopPropagation(); toggleDropdown('main'); }}>
                <span style={styles.navIcon}>☰</span>
                Banking Menu
                <span style={styles.navArrow}>▼</span>
              </button>
              {dropdownOpen.main && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>🏦 My Banking</h4>
                    <Link href="/" style={styles.dropdownLink}>🏠 Home</Link>
                    <Link href="/main-menu" style={styles.dropdownLink}>📋 Main Menu</Link>
                    <Link href="/account-details" style={styles.dropdownLink}>🏦 Account Details</Link>
                    <Link href="/transfer" style={styles.dropdownLink}>💸 Transfer Money</Link>
                    <Link href="/cards" style={styles.dropdownLink}>💳 My Cards</Link>
                    <Link href="/transactions" style={styles.dropdownLink}>📜 Transaction History</Link>
                    <Link href="/bill-pay" style={styles.dropdownLink}>🧾 Pay Bills</Link>
                    <Link href="/deposit-real" style={styles.dropdownLink}>📱 Mobile Deposit</Link>
                    <Link href="/withdrawal" style={styles.dropdownLink}>📤 Withdraw Funds</Link>
                    <Link href="/zelle" style={styles.dropdownLink}>💰 Zelle</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>💼 Loans & Credit</h4>
                    <Link href="/loans" style={styles.dropdownLink}>💰 Apply for Loan</Link>
                    <Link href="/credit-report" style={styles.dropdownLink}>📊 Credit Report</Link>
                    <Link href="/apply-card" style={styles.dropdownLink}>💳 Apply for Card</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>📈 Investments</h4>
                    <Link href="/investments" style={styles.dropdownLink}>📊 Portfolio</Link>
                    <Link href="/crypto" style={styles.dropdownLink}>₿ Crypto Trading</Link>
                    <Link href="/market-news" style={styles.dropdownLink}>📰 Market News</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>🛡️ Security & Settings</h4>
                    <Link href="/security" style={styles.dropdownLink}>🔒 Security Settings</Link>
                    <Link href="/notifications" style={styles.dropdownLink}>🔔 Notifications</Link>
                    <Link href="/privacy" style={styles.dropdownLink}>🛡️ Privacy Settings</Link>
                    <Link href="/profile" style={styles.dropdownLink}>👤 Edit Profile</Link>
                    <Link href="/messages" style={styles.dropdownLink}>📧 Messages</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>📬 Communications</h4>
                    <Link href="/notifications" style={styles.dropdownLink}>🔔 Alerts & Notifications</Link>
                    <Link href="/messages" style={styles.dropdownLink}>💬 Messages</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>❓ Help & Support</h4>
                    <Link href="/support" style={styles.dropdownLink}>🎧 Customer Support</Link>
                    <Link href="/faq" style={styles.dropdownLink}>❓ FAQ</Link>
                    <Link href="/financial-education" style={styles.dropdownLink}>📚 Financial Education</Link>
                    <Link href="/calculators" style={styles.dropdownLink}>🧮 Financial Calculators</Link>
                    <Link href="/branch-locator" style={styles.dropdownLink}>📍 Find Branch/ATM</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <button onClick={handleSignOut} style={styles.logoutDropdownButton}>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div style={styles.headerRight}>
            <div style={styles.userSection}>
              <div style={styles.userInfo}>
                <span style={styles.welcomeText}>Welcome back</span>
                <span style={styles.userName}>{getUserDisplayName()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main style={styles.main}>
        {/* Account Summary Section */}
        <section style={styles.summarySection}>
          <div style={styles.summaryHeader}>
            <h2 style={styles.sectionTitle}>Account Summary</h2>
            <span style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</span>
          </div>

          <div style={styles.summaryCards}>
            <div style={styles.primaryBalanceCard}>
              <div style={styles.balanceCardHeader}>
                <div style={styles.balanceHeaderInfo}>
                  <h3 style={styles.balanceCardLabel}>Total Available Balance</h3>
                  <span style={styles.balanceCardSubtext}>Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={styles.balanceAmountContainer}>
                <div style={styles.balanceAmount}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(getTotalBalance())}
                </div>
                <div style={styles.balanceSubInfo}>
                  Available Balance • Updated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={styles.balanceCardFooter}>
                <div style={styles.balanceFooterItem}>
                  <span style={styles.footerText}>FDIC Insured</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Details Section - Moved below balance */}
        <section style={styles.accountsSection}>
          <div style={styles.sectionHeaderWithAction}>
            <h3 style={styles.sectionTitle}>Account Details</h3>
            <Link href="/account-details" style={styles.viewAllLink}>View All Details →</Link>
          </div>

          <div style={styles.accountsList}>
            {accounts.map(account => (
              <div key={account.id} style={styles.accountItem}>
                <div style={styles.accountInfo}>
                  <div style={styles.accountTypeIcon}>
                    {account.account_type === 'checking' ? '🏦' : 
                     account.account_type === 'savings' ? '💰' : '📊'}
                  </div>
                  <div style={styles.accountDetails}>
                    <h4 style={styles.accountName}>
                      {account.account_type ? account.account_type.replace('_', ' ').toUpperCase() : 'Account'}
                    </h4>
                    <span style={styles.accountNumber}>****{account.account_number?.slice(-4)}</span>
                  </div>
                </div>
                <div style={styles.accountBalance}>
                  {formatCurrency(account.balance || 0)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Transactions - Moved after Account Details */}
        <section style={styles.transactionsSection}>
          <div style={styles.sectionHeaderWithAction}>
            <h3 style={styles.sectionTitle}>Recent Transactions</h3>
            <Link href="/transactions" style={styles.viewAllLink}>View All →</Link>
          </div>

          <div style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} style={styles.transactionItem}>
                  <div style={styles.transactionIcon}>
                    {(transaction.amount || 0) >= 0 ? '📥' : '📤'}
                  </div>
                  <div style={styles.transactionDetails}>
                    <span style={styles.transactionDescription}>
                      {transaction.description || 'Transaction'}
                    </span>
                    <span style={styles.transactionDate}>
                      {formatDate(transaction.created_at)}
                    </span>
                  </div>
                  <div style={{
                    ...styles.transactionAmount,
                    color: (transaction.amount || 0) >= 0 ? '#2e7d32' : '#d32f2f'
                  }}>
                    {(transaction.amount || 0) >= 0 ? '+' : ''}{formatCurrency(transaction.amount || 0)}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <h4 style={styles.emptyTitle}>No recent transactions</h4>
                <p style={styles.emptyDesc}>Your transaction history will appear here.</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.quickActionsSection}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.quickActions}>
            <Link href="/transfer" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>💸</span>
              <span style={styles.quickActionText}>Transfer Money</span>
            </Link>
            <Link href="/deposit-real" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>📥</span>
              <span style={styles.quickActionText}>Mobile Deposit</span>
            </Link>
            <Link href="/bill-pay" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>🧾</span>
              <span style={styles.quickActionText}>Pay Bills</span>
            </Link>
            <Link href="/withdrawal" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>📤</span>
              <span style={styles.quickActionText}>Withdraw Funds</span>
            </Link>
            <Link href="/apply-card" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>💳</span>
              <span style={styles.quickActionText}>Apply for Card</span>
            </Link>
            <Link href="/zelle" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>⚡</span>
              <span style={styles.quickActionText}>Send with Zelle</span>
            </Link>
            <Link href="/loans" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>💰</span>
              <span style={styles.quickActionText}>Apply for Loan</span>
            </Link>
            <Link href="/investments" style={styles.standardActionButton}>
              <span style={styles.quickActionIcon}>📈</span>
              <span style={styles.quickActionText}>Invest</span>
            </Link>
          </div>
        </section>

        

        {/* My Cards Section */}
        {cards.length > 0 && (
          <section style={styles.cardsSection}>
            <div style={styles.sectionHeaderWithAction}>
              <h3 style={styles.sectionTitle}>My Cards</h3>
              <Link href="/cards" style={styles.viewAllLink}>Manage Cards →</Link>
            </div>

            <div style={styles.cardsGrid}>
              {cards.map(card => (
                <div key={card.id} style={styles.cardContainer}>
                  <div 
                    style={{
                      ...styles.cardFlipWrapper,
                      transform: flippedCards[card.id] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Card Front */}
                    <div style={{
                      ...styles.cardFace,
                      ...styles.cardFront,
                      background: getCardTypeColor(card.card_type),
                      opacity: flippedCards[card.id] ? 0 : 1
                    }}>
                      <div style={styles.cardHeader}>
                        <span style={styles.bankNameCard}>OAKLINE BANK</span>
                        <span style={styles.cardTypeLabel}>{getCardTypeLogo(card.card_type)}</span>
                      </div>
                      
                      <div style={styles.chipSection}>
                        <div style={styles.chip}></div>
                        <div style={styles.contactless}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6" stroke="white" strokeWidth="2"/>
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="white" strokeWidth="2"/>
                            <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10" stroke="white" strokeWidth="2"/>
                          </svg>
                        </div>
                      </div>

                      <div style={styles.cardNumberDisplay}>
                        {visibleCardDetails[card.id] 
                          ? (card.card_number ? card.card_number.replace(/(.{4})/g, '$1 ').trim() : '**** **** **** ****')
                          : `**** **** **** ${card.card_number?.slice(-4) || '****'}`
                        }
                      </div>

                      <div style={styles.cardFooterDetails}>
                        <div>
                          <div style={styles.cardLabelSmall}>CARDHOLDER</div>
                          <div style={styles.cardValueSmall}>
                            {userProfile ? `${userProfile.first_name?.toUpperCase() || ''} ${userProfile.last_name?.toUpperCase() || ''}`.trim() : card.cardholder_name || 'CARDHOLDER NAME'}
                          </div>
                        </div>
                        <div>
                          <div style={styles.cardLabelSmall}>EXPIRES</div>
                          <div style={styles.cardValueSmall}>{card.expiry_date || 'MM/YY'}</div>
                        </div>
                        <div>
                          <div style={styles.cardLabelSmall}>CVV</div>
                          <div style={styles.cardValueSmall}>
                            {visibleCardDetails[card.id] ? (card.cvc || '***') : '***'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Back */}
                    <div style={{
                      ...styles.cardFace,
                      ...styles.cardBack,
                      background: getCardTypeColor(card.card_type),
                      opacity: flippedCards[card.id] ? 1 : 0,
                      transform: 'rotateY(180deg)'
                    }}>
                      <div style={styles.magneticStripe}></div>
                      <div style={styles.cvvSection}>
                        <div style={styles.cvvLabel}>CVV</div>
                        <div style={styles.cvvBox}>
                          {visibleCardDetails[card.id] ? (card.cvc || '***') : '***'}
                        </div>
                      </div>
                      <div style={styles.cardBackInfo}>
                        <p style={styles.cardBackText}>For customer service call 1-800-OAKLINE</p>
                        <p style={styles.cardBackText}>This card is property of Oakline Bank</p>
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.cardControls}>
                    <button 
                      onClick={() => toggleCardVisibility(card.id)}
                      style={styles.cardControlButton}
                    >
                      {visibleCardDetails[card.id] ? '👁️ Hide' : '👁️ Show'}
                    </button>
                    <button 
                      onClick={() => setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                      style={styles.cardControlButton}
                    >
                      🔄 Flip
                    </button>
                  </div>

                  <div style={styles.cardStatus}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: card.is_locked ? '#ef4444' : '#10b981'
                    }}>
                      {card.is_locked ? '🔒 Locked' : '✓ Active'}
                    </span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: card.pin_set ? '#10b981' : '#f59e0b'
                    }}>
                      {card.pin_set ? '🔐 PIN Set' : '⚠️ Set PIN'}
                    </span>
                  </div>

                  <div style={styles.cardInfoGrid}>
                    <div style={styles.cardInfoItem}>
                      <span style={styles.cardInfoLabel}>Daily Limit</span>
                      <span style={styles.cardInfoValue}>${card.daily_limit || '2,000'}</span>
                    </div>
                    <div style={styles.cardInfoItem}>
                      <span style={styles.cardInfoLabel}>Monthly Limit</span>
                      <span style={styles.cardInfoValue}>${card.monthly_limit || '10,000'}</span>
                    </div>
                  </div>

                  {!card.pin_set && (
                    <button 
                      onClick={() => openPinModal(card.id)}
                      style={styles.setPinButton}
                    >
                      Set PIN
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* PIN Modal */}
      {pinModal.open && (
        <div style={styles.modalOverlay} onClick={closePinModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Set Card PIN</h3>
            <p style={styles.modalDescription}>
              Enter a 4-6 digit PIN for your card. This PIN will be required for certain transactions.
            </p>

            <div style={styles.pinInputGroup}>
              <label style={styles.pinLabel}>Enter PIN (4-6 digits)</label>
              <input
                type="password"
                maxLength="6"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                style={styles.pinInput}
                placeholder="••••"
                autoFocus
              />
            </div>

            {pinError && (
              <div style={styles.pinError}>{pinError}</div>
            )}

            {pinSuccess && (
              <div style={styles.pinSuccess}>{pinSuccess}</div>
            )}

            <div style={styles.modalActions}>
              <button onClick={handleSetPin} style={styles.modalConfirmButton}>
                Set PIN
              </button>
              <button onClick={closePinModal} style={styles.modalCancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <LiveChat />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 50%, #059669 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #059669',
    borderRight: '4px solid #d97706',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
    marginBottom: '2rem',
    boxShadow: '0 0 20px rgba(5, 150, 105, 0.3)'
  },
  loadingText: {
    fontSize: '1.2rem',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.95
  },
  header: {
    background: '#1a365d',
    borderBottom: '3px solid #059669',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)'
  },
  headerContainer: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '0.75rem 1rem',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    minHeight: '70px',
    gap: '1rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'white',
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
    fontWeight: 'bold',
    margin: 0,
    color: 'white'
  },
  brandTagline: {
    fontSize: '0.8rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  mainNav: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navItem: {
    position: 'relative'
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    minWidth: 'auto'
  },
  navIcon: {
    fontSize: '1rem'
  },
  navArrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.2s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    padding: '1rem',
    minWidth: '280px',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 1000,
    marginTop: '0.5rem',
    border: '1px solid #e2e8f0'
  },
  dropdownSection: {
    marginBottom: '0.5rem'
  },
  dropdownSectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0',
    padding: '0 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '0.75rem 0',
    width: '100%'
  },
  logoutDropdownButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left'
  },
  dropdownLink: {
    display: 'block',
    padding: '0.75rem 1rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  welcomeText: {
    fontSize: '0.8rem',
    color: '#bfdbfe'
  },
  userName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white'
  },

  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  routingInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  routingLabel: {
    fontSize: '0.7rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  routingNumber: {
    fontSize: '0.8rem',
    color: '#059669',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: '1px'
  },
  phoneInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(5, 150, 105, 0.2)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#059669'
  },
  phoneIcon: {
    fontSize: '1rem'
  },

  // Mobile Styles
  '@media (max-width: 768px)': {
    headerContainer: {
      flexDirection: 'column',
      padding: '0.75rem',
      minHeight: 'auto',
      gap: '0.75rem'
    },
    mainNav: {
      width: '100%',
      justifyContent: 'space-around',
      order: 2
    },
    navButton: {
      padding: '0.4rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.2rem'
    },
    userSection: {
      order: 1,
      width: '100%',
      justifyContent: 'flex-end'
    },
    main: {
      padding: '0.75rem 0.5rem'
    },
    summaryCards: {
      gridTemplateColumns: '1fr',
      gap: '0.75rem'
    },
    summaryCard: {
      padding: '1rem'
    },
    quickActions: {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.5rem'
    },
    quickAction: {
      padding: '1rem 0.5rem'
    },
    sectionTitle: {
      fontSize: '1.1rem'
    }
  },
  '@media (max-width: 480px)': {
    navButton: {
      fontSize: '0.65rem',
      padding: '0.3rem 0.4rem'
    },
    actionButton: {
      fontSize: '0.65rem',
      padding: '0.25rem 0.4rem'
    },
    main: {
      padding: '0.5rem 0.25rem'
    },
    quickActions: {
      gridTemplateColumns: '1fr'
    }
  },
  main: {
    maxWidth: '100%',
    margin: '0',
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
    boxSizing: 'border-box'
  },
  summarySection: {
    background: 'white',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.7rem',
    fontWeight: 'bold',
    color: '#1a365d',
    margin: 0
  },
  lastUpdated: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem'
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  cardIcon: {
    fontSize: '2rem',
    padding: '1rem',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.25)'
  },
  cardContent: {
    flex: 1
  },
  cardLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: 'rgba(255,255,255,0.9)'
  },
  cardValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 0.25rem 0',
    textShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardSubtext: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.75)'
  },
  primaryBalanceCard: {
    gridColumn: 'span 1',
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    color: '#1a365d',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    minWidth: '320px'
  },
  balanceCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  balanceIconLarge: {
    fontSize: '2.5rem',
    background: 'rgba(255,255,255,0.2)',
    padding: '1rem',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  balanceHeaderInfo: {
    flex: 1
  },
  balanceCardLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 0.25rem 0',
    color: '#1a365d'
  },
  balanceCardSubtext: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  balanceAmountContainer: {
    margin: '1.5rem 0',
    width: '100%',
    overflow: 'visible'
  },
  balanceAmount: {
    fontSize: '2.5rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    letterSpacing: 'normal',
    wordBreak: 'keep-all',
    whiteSpace: 'nowrap',
    overflow: 'visible',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'block',
    color: '#1a365d'
  },
  balanceSubInfo: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500',
    marginTop: '0.5rem'
  },
  balanceGrowthIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(34, 197, 94, 0.2)',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    width: 'fit-content',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  },
  growthArrow: {
    fontSize: '1.2rem',
    color: '#4ade80'
  },
  growthText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)'
  },
  balanceCardFooter: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0',
    justifyContent: 'center'
  },
  balanceFooterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  footerIcon: {
    fontSize: '1.2rem'
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500'
  },
  quickActionsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
    marginTop: '1rem'
  },
  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem 1rem',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    color: '#374151',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  standardActionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem 1rem',
    backgroundColor: '#1a365d',
    color: 'white',
    borderRadius: '10px',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 'inherit'
  },
  quickActionIcon: {
    fontSize: '1.5rem'
  },
  quickActionText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'center'
  },
  statusMessage: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  accountsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  sectionHeaderWithAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  accountInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  accountTypeIcon: {
    fontSize: '1.5rem',
    padding: '0.5rem',
    background: '#eff6ff',
    borderRadius: '8px'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  accountName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  accountNumber: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontFamily: 'monospace'
  },
  accountBalance: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  transactionsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  transactionIcon: {
    fontSize: '1.2rem',
    padding: '0.5rem',
    background: '#eff6ff',
    borderRadius: '6px'
  },
  transactionDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  transactionDescription: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  transactionDate: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  transactionAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    textAlign: 'right'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    display: 'block'
  },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyDesc: {
    fontSize: '0.9rem',
    margin: 0
  },
  dashboardDropdownLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  cardsSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    border: '2px solid #e2e8f0'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  cardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    border: '2px solid #e2e8f0'
  },
  cardFlipWrapper: {
    perspective: '1000px',
    width: '100%',
    maxWidth: '337.5px',
    height: '212.5px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s',
    cursor: 'pointer',
    margin: '0 auto'
  },
  cardFace: {
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
    transition: 'opacity 0.3s'
  },
  cardFront: {
    zIndex: 2
  },
  cardBack: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bankNameCard: {
    fontSize: '1rem',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  cardTypeLabel: {
    fontSize: '0.875rem',
    fontWeight: 'bold',
    opacity: 0.9
  },
  chipSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '0.5rem 0'
  },
  chip: {
    width: '50px',
    height: '40px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    borderRadius: '8px'
  },
  contactless: {
    opacity: 0.8
  },
  cardNumberDisplay: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    letterSpacing: '2px',
    fontFamily: 'monospace',
    textAlign: 'center',
    margin: '0.5rem 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardFooterDetails: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  cardLabelSmall: {
    fontSize: '0.7rem',
    opacity: 0.8,
    marginBottom: '4px'
  },
  cardValueSmall: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  magneticStripe: {
    width: '100%',
    height: '45px',
    backgroundColor: '#000',
    marginTop: '20px'
  },
  cvvSection: {
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
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  cvvBox: {
    backgroundColor: '#f3f4f6',
    padding: '6px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  cardBackInfo: {
    fontSize: '0.7rem',
    opacity: 0.8
  },
  cardBackText: {
    margin: '4px 0'
  },
  cardStatus: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '0.5rem'
  },
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  cardControls: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
    justifyContent: 'center'
  },
  cardControlButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cardInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginTop: '1rem',
    marginBottom: '1rem'
  },
  cardInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  cardInfoLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.25rem',
    fontWeight: '500'
  },
  cardInfoValue: {
    fontSize: '1rem',
    color: '#1e40af',
    fontWeight: '700'
  },
  setPinButton: {
    width: '100%',
    padding: '0.75rem',
    marginTop: '0.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  modalDescription: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  pinInputGroup: {
    marginBottom: '1rem'
  },
  pinLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  pinInput: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1.5rem',
    letterSpacing: '0.5rem',
    textAlign: 'center',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontFamily: 'monospace'
  },
  pinError: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem'
  },
  pinSuccess: {
    padding: '0.75rem',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  modalConfirmButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  modalCancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
