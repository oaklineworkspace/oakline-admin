import { useState, useEffect } from 'react';

export default function WelcomeBanner() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const messages = [
    "🎉 Welcome to Oakline Bank - Your trusted financial partner since 1995",
    "💳 New! Explore all 23 account types with detailed comparisons and benefits",
    "🏦 Join over 500,000+ satisfied customers who trust Oakline Bank",
    "📱 Award-winning mobile app - Bank anywhere, anytime with confidence",
    "🔒 FDIC Insured • Equal Housing Lender • Your deposits are protected up to $250,000",
    "🌟 Rated #1 Customer Service - Experience banking the way it should be"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) =>
        prevIndex === messages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div style={styles.banner}>
      <div style={styles.container}>
        <div style={styles.messageContainer}>
          <div
            style={styles.messageText}
            key={currentMessageIndex}
          >
            {messages[currentMessageIndex]}
          </div>
        </div>

        <div style={styles.indicators}>
          {messages.map((_, index) => (
            <button
              key={index}
              style={{
                ...styles.indicator,
                ...(currentMessageIndex === index ? styles.activeIndicator : {})
              }}
              onClick={() => setCurrentMessageIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
    color: 'white',
    padding: '1rem 0',
    position: 'relative',
    overflow: 'hidden',
    width: '100%'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem'
  },
  messageContainer: {
    width: '100%',
    textAlign: 'center',
    minHeight: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messageText: {
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    fontWeight: '500',
    lineHeight: '1.4',
    animation: 'fadeInSlide 0.6s ease-out',
    maxWidth: '100%',
    padding: '0 1rem'
  },
  indicators: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  indicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  activeIndicator: {
    backgroundColor: 'white',
    transform: 'scale(1.2)'
  }
};

// Add CSS animation keyframes if not already present
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  const keyframes = `
    @keyframes fadeInSlide {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch (e) {
    // Keyframes might already exist
  }
}