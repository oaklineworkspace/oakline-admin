
export default function AdminLoadingBanner({ 
  isVisible, 
  current = 0, 
  total = 0, 
  action = 'Processing',
  message = ''
}) {
  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const showCount = total > 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.header}>
          <div style={styles.logo}>🏦 OAKLINE ADMIN</div>
          <div style={styles.spinner}>⏳</div>
        </div>
        
        <div style={styles.content}>
          <h3 style={styles.action}>{action}</h3>
          
          {showCount && (
            <div style={styles.progressText}>
              <span style={styles.count}>{current} / {total}</span>
              <span style={styles.percentage}>{percentage}%</span>
            </div>
          )}
          
          {message && (
            <p style={styles.message}>{message}</p>
          )}
          
          {showCount && (
            <div style={styles.progressBarContainer}>
              <div 
                style={{
                  ...styles.progressBar,
                  width: `${percentage}%`
                }}
              />
            </div>
          )}
        </div>
        
        <div style={styles.footer}>
          <div style={styles.loadingDots}>
            <span style={styles.dot}>●</span>
            <span style={styles.dot}>●</span>
            <span style={styles.dot}>●</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
  },
  banner: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    minWidth: '400px',
    maxWidth: '500px',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '2px',
    textTransform: 'uppercase'
  },
  spinner: {
    fontSize: '24px',
    animation: 'spin 1s linear infinite'
  },
  content: {
    padding: '30px 20px'
  },
  action: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e40af',
    textAlign: 'center'
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '0 10px'
  },
  count: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'monospace'
  },
  percentage: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#3b82f6'
  },
  message: {
    margin: '15px 0',
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  progressBarContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '20px'
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
  },
  footer: {
    backgroundColor: '#f8fafc',
    padding: '15px',
    display: 'flex',
    justifyContent: 'center'
  },
  loadingDots: {
    display: 'flex',
    gap: '8px'
  },
  dot: {
    fontSize: '12px',
    color: '#3b82f6',
    animation: 'pulse 1.5s ease-in-out infinite'
  }
};

// Add these keyframes to your global CSS or include them inline
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 0.3;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
    }
  `;
  if (!document.querySelector('#admin-loading-animations')) {
    styleSheet.id = 'admin-loading-animations';
    document.head.appendChild(styleSheet);
  }
}
