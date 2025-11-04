
import { useRouter } from 'next/router';

export default function AdminBackButton({ text = '← Back', href = null, useBrowserHistory = false }) {
  const router = useRouter();

  const handleClick = () => {
    if (useBrowserHistory) {
      router.back();
    } else if (href) {
      router.push(href);
    } else {
      router.push('/admin/admin-dashboard');
    }
  };

  return (
    <button 
      onClick={handleClick}
      style={styles.backButton}
      onMouseEnter={(e) => e.target.style.background = '#5a6268'}
      onMouseLeave={(e) => e.target.style.background = '#6c757d'}
    >
      {text}
    </button>
  );
}

const styles = {
  backButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  }
};
