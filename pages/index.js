// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated } from '../lib/auth';
import styles from '../styles/Index.module.css';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className={styles.container}>
      <p className={styles.message}>Redirecting...</p>
    </div>
  );
}
