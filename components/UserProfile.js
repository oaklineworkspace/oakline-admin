export default function UserProfile({ user, onLogout }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h2>Welcome, {user.email}!</h2>
      <button onClick={onLogout} style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
        Logout
      </button>
    </div>
  )
}
