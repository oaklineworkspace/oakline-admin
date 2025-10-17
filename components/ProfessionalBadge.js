
export default function ProfessionalBadge() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '1rem',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      margin: '2rem 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#22c55e',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'white', fontSize: '1rem' }}>🔒</span>
        </div>
        <span style={{ fontWeight: '600', color: '#1f2937' }}>FDIC Insured</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'white', fontSize: '1rem' }}>🛡️</span>
        </div>
        <span style={{ fontWeight: '600', color: '#1f2937' }}>256-bit SSL</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#8b5cf6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'white', fontSize: '1rem' }}>⚡</span>
        </div>
        <span style={{ fontWeight: '600', color: '#1f2937' }}>24/7 Monitoring</span>
      </div>
    </div>
  );
}
