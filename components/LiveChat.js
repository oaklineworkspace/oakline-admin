
import { useState, useEffect, useRef } from 'react';

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm Sarah from Oakline Bank Customer Service. I'm here to help you with all your banking needs. How can I assist you today?",
      sender: 'agent',
      timestamp: new Date(),
      agentName: 'Sarah Wilson',
      agentId: 'SW001'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [currentAgent, setCurrentAgent] = useState('Sarah Wilson');
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [chatStartTime] = useState(new Date());
  const messagesEndRef = useRef(null);

  const agents = [
    { name: 'Sarah Wilson', id: 'SW001', specialty: 'General Banking' },
    { name: 'Michael Chen', id: 'MC002', specialty: 'Loans & Credit' },
    { name: 'Emily Rodriguez', id: 'ER003', specialty: 'Investments' },
    { name: 'David Thompson', id: 'DT004', specialty: 'Business Banking' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage = {
        id: messages.length + 1,
        text: newMessage,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      setIsTyping(true);

      // Simulate realistic typing delay based on message length
      const typingDelay = Math.max(1500, Math.min(4000, newMessage.length * 100));
      
      setTimeout(() => {
        setIsTyping(false);
        const agentResponse = {
          id: messages.length + 2,
          text: getAgentResponse(newMessage),
          sender: 'agent',
          timestamp: new Date(),
          agentName: currentAgent,
          agentId: agents.find(a => a.name === currentAgent)?.id || 'SW001'
        };
        setMessages(prev => [...prev, agentResponse]);
      }, typingDelay);
    }
  };

  const getAgentResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // Banking-specific responses
    if (message.includes('balance') || message.includes('account balance')) {
      return "I can help you check your account balance. For security purposes, I'll need to verify your identity first. Please log into your online banking account or I can transfer you to our secure verification line. Your account balance will be displayed in real-time once authenticated.";
    } 
    
    if (message.includes('routing number')) {
      return "Oakline Bank's routing number is 075915826. This number is used for all wire transfers, direct deposits, and ACH transactions. Is there a specific transaction you need help setting up?";
    }
    
    if (message.includes('loan') || message.includes('mortgage') || message.includes('credit')) {
      return "I'd be happy to help you with our loan products. We offer:\n• Personal loans up to $50,000\n• Auto loans with rates starting at 3.99% APR\n• Home mortgages from 6.5% APR\n• Business loans for qualified applicants\n\nWould you like me to connect you with our loan specialist or help you start a pre-qualification?";
    }
    
    if (message.includes('card') || message.includes('debit') || message.includes('credit card')) {
      return "We have several card options available:\n• Premium Rewards Debit Card (no fees)\n• Cashback Credit Card (1.5% on all purchases)\n• Business Credit Cards\n• Secured Credit Cards for building credit\n\nWhich type of card are you interested in? I can check your eligibility right now.";
    }
    
    if (message.includes('hours') || message.includes('location') || message.includes('branch')) {
      return "Our branch hours are:\nMonday-Friday: 9:00 AM - 6:00 PM\nSaturday: 9:00 AM - 2:00 PM\nSunday: Closed\n\nATMs are available 24/7. Would you like me to help you find the nearest branch location?";
    }
    
    if (message.includes('investment') || message.includes('savings') || message.includes('retirement')) {
      return "Our investment services include:\n• High-yield savings accounts (5.00% APY)\n• Certificates of Deposit\n• IRA accounts (Traditional & Roth)\n• Investment portfolios managed by certified advisors\n• 401(k) rollover services\n\nWould you like to schedule a free consultation with one of our financial advisors?";
    }
    
    if (message.includes('transfer') || message.includes('wire') || message.includes('send money')) {
      return "We offer several transfer options:\n• Instant transfers between Oakline accounts (free)\n• External bank transfers (1-3 business days)\n• Wire transfers (domestic & international)\n• Zelle payments (instant to enrolled users)\n\nWhat type of transfer do you need help with?";
    }
    
    if (message.includes('fee') || message.includes('charge')) {
      return "Here are our standard fees:\n• No monthly maintenance fees on most accounts\n• No overdraft fees with overdraft protection\n• Free ATM usage at 55,000+ locations\n• No fees for online/mobile banking\n\nWould you like me to review the fee schedule for your specific account type?";
    }
    
    if (message.includes('fraud') || message.includes('suspicious') || message.includes('security')) {
      return "If you suspect fraudulent activity, please:\n1. Log into your account immediately to review transactions\n2. Change your passwords\n3. Call our fraud hotline at 1-800-OAKLINE (24/7)\n\nWe take security very seriously and will investigate any suspicious activity immediately. Have you noticed any unauthorized transactions?";
    }
    
    if (message.includes('mobile app') || message.includes('online banking')) {
      return "Our award-winning mobile app offers:\n• Mobile check deposit\n• Real-time account notifications\n• Bill pay and scheduling\n• Money transfer capabilities\n• ATM/branch locator\n• Budgeting tools\n\nYou can download it from the App Store or Google Play. Need help setting up mobile banking?";
    }
    
    if (message.includes('problem') || message.includes('issue') || message.includes('help')) {
      return "I'm sorry to hear you're experiencing an issue. To provide the best assistance, could you please describe the specific problem you're encountering? I'm here to help resolve any banking concerns you may have.";
    }
    
    if (message.includes('thank') || message.includes('thanks')) {
      return "You're very welcome! Is there anything else I can help you with today? I'm here to ensure you have the best banking experience possible.";
    }
    
    // Default response
    return "Thank you for contacting Oakline Bank. I want to make sure I provide you with the most accurate information. Could you please provide more details about what you need help with? You can also call our customer service line at 1-800-OAKLINE for immediate assistance.";
  };

  const quickReplies = [
    "Check account balance",
    "Apply for a loan",
    "Find branch locations", 
    "Card services",
    "Transfer money",
    "Investment options",
    "Speak to a specialist"
  ];

  const handleQuickReply = (reply) => {
    setNewMessage(reply);
    handleSendMessage();
  };

  return (
    <>
      {/* Enhanced Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.chatButton,
          animation: !isOpen ? 'pulse 2s infinite' : 'none'
        }}
      >
        {isOpen ? (
          '✕'
        ) : (
          <>
            <span style={styles.chatIcon}>💬</span>
            <span style={styles.chatText}>Chat</span>
            <span style={styles.onlineDot}></span>
          </>
        )}
      </button>

      {/* Enhanced Chat Window */}
      {isOpen && (
        <div style={styles.chatWindow}>
          {/* Enhanced Chat Header */}
          <div style={styles.chatHeader}>
            <div style={styles.agentInfo}>
              <div style={styles.agentAvatar}>
                <img src="/images/agent-avatar.png" alt="Agent" style={styles.avatarImage} 
                     onError={(e) => e.target.style.display = 'none'} />
                <span style={styles.avatarFallback}>🏦</span>
              </div>
              <div>
                <div style={styles.agentName}>{currentAgent}</div>
                <div style={styles.agentStatus}>
                  <span style={{...styles.statusDot, backgroundColor: isConnected ? '#10b981' : '#ef4444'}}></span>
                  {isConnected ? 'Online • Banking Specialist' : 'Reconnecting...'}
                </div>
              </div>
            </div>
            <div style={styles.headerActions}>
              <div style={styles.sessionInfo}>
                Session: {sessionId}
              </div>
              <button onClick={() => setIsOpen(false)} style={styles.closeButton}>✕</button>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={styles.messagesContainer}>
            <div style={styles.welcomeMessage}>
              <div style={styles.bankLogo}>🏦</div>
              <div style={styles.welcomeText}>
                <strong>Welcome to Oakline Bank Live Support</strong>
                <br />Secure • Encrypted • Professional Banking Assistance
              </div>
            </div>

            {messages.map((message) => (
              <div key={message.id} style={styles.messageWrapper}>
                <div style={{
                  ...styles.message,
                  ...(message.sender === 'user' ? styles.userMessage : styles.agentMessage)
                }}>
                  {message.sender === 'agent' && (
                    <div style={styles.agentMessageHeader}>
                      <span style={styles.agentNameSmall}>
                        {message.agentName} ({message.agentId})
                      </span>
                      <span style={styles.timestamp}>
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  )}
                  <div style={styles.messageText}>{message.text}</div>
                  {message.sender === 'user' && (
                    <div style={styles.userTimestamp}>
                      {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={styles.messageWrapper}>
                <div style={{...styles.message, ...styles.agentMessage}}>
                  <div style={styles.agentMessageHeader}>
                    <span style={styles.agentNameSmall}>{currentAgent} is typing...</span>
                  </div>
                  <div style={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Quick Replies */}
          <div style={styles.quickReplies}>
            <div style={styles.quickRepliesHeader}>Quick Actions:</div>
            <div style={styles.quickRepliesGrid}>
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  style={styles.quickReplyButton}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Input */}
          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your banking question..."
                style={styles.messageInput}
                disabled={isTyping}
              />
              <button 
                onClick={handleSendMessage} 
                style={{
                  ...styles.sendButton,
                  opacity: newMessage.trim() ? 1 : 0.5,
                  cursor: newMessage.trim() ? 'pointer' : 'default'
                }}
                disabled={!newMessage.trim() || isTyping}
              >
                <span style={styles.sendIcon}>➤</span>
              </button>
            </div>
            <div style={styles.inputFooter}>
              <span style={styles.securityNote}>🔒 Secure banking conversation</span>
              <span style={styles.powerText}>Powered by Oakline Bank AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  chatButton: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(26, 54, 93, 0.3)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    maxWidth: '140px',
    minWidth: 'auto'
  },
  chatIcon: {
    fontSize: '16px'
  },
  chatText: {
    fontSize: '14px',
    fontWeight: '600'
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 2s infinite',
    marginLeft: '4px'
  },
  chatWindow: {
    position: 'fixed',
    bottom: '240px',
    right: '24px',
    width: '420px',
    height: '600px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '2px solid #1a365d'
  },
  chatHeader: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  agentAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    position: 'relative',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%'
  },
  avatarFallback: {
    fontSize: '18px'
  },
  agentName: {
    fontWeight: '700',
    fontSize: '15px'
  },
  agentStatus: {
    fontSize: '12px',
    opacity: 0.9,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  sessionInfo: {
    fontSize: '10px',
    opacity: 0.8,
    fontFamily: 'monospace'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  messagesContainer: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#f8fafc'
  },
  welcomeMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#e0f2fe',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #0ea5e9'
  },
  bankLogo: {
    fontSize: '24px'
  },
  welcomeText: {
    fontSize: '13px',
    color: '#0c4a6e',
    lineHeight: '1.4'
  },
  messageWrapper: {
    marginBottom: '16px'
  },
  message: {
    maxWidth: '85%',
    padding: '14px 18px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  userMessage: {
    backgroundColor: '#1e3a8a',
    color: 'white',
    marginLeft: 'auto',
    borderBottomRightRadius: '6px'
  },
  agentMessage: {
    backgroundColor: 'white',
    color: '#374151',
    marginRight: 'auto',
    border: '1px solid #e5e7eb',
    borderBottomLeftRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  agentMessageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '11px'
  },
  agentNameSmall: {
    fontWeight: '600',
    color: '#1e3a8a'
  },
  timestamp: {
    color: '#9ca3af'
  },
  userTimestamp: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
    marginTop: '6px'
  },
  messageText: {
    margin: 0,
    whiteSpace: 'pre-line'
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  quickReplies: {
    padding: '16px 20px',
    backgroundColor: '#f1f5f9',
    borderTop: '1px solid #e5e7eb'
  },
  quickRepliesHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '12px'
  },
  quickRepliesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  quickReplyButton: {
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#374151',
    transition: 'all 0.2s ease',
    fontWeight: '500'
  },
  inputContainer: {
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: 'white'
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px'
  },
  messageInput: {
    flex: 1,
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#f8fafc'
  },
  sendButton: {
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    width: '48px',
    height: '48px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  sendIcon: {
    transform: 'rotate(0deg)',
    transition: 'transform 0.2s'
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '10px',
    color: '#9ca3af'
  },
  securityNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  powerText: {
    fontStyle: 'italic'
  }
};
