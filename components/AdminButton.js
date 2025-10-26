
export default function AdminButton({ 
  onClick, 
  type = 'button', 
  disabled = false, 
  loading = false, 
  children, 
  variant = 'primary',
  fullWidth = false,
  style = {}
}) {
  const variants = {
    primary: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
    },
    success: {
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
    },
    warning: {
      backgroundColor: '#f59e0b',
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
    }
  };

  const baseStyle = {
    padding: '0.875rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    ...variants[variant],
    ...style
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
      }}
    >
      {loading && <span style={{ fontSize: '1.2rem' }}>⏳</span>}
      {children}
    </button>
  );
}
