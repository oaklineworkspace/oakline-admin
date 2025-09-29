
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await signIn(email, password);

    if (error) {
      setMessage(`Sign in failed: ${error.message}`);
    } else {
      setMessage('Sign in successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      {message && <p>{message}</p>}
    </form>
  );
}
