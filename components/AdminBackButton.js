
import { useRouter } from 'next/router';

export default function AdminBackButton({ text = '← Back to Dashboard', href = '/admin/admin-dashboard' }) {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push(href)}
      style={styles.backButton}
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
