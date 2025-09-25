import React from 'react';
import styles from './UserProfile.module.css';

export default function UserProfile({ user, onLogout }) {
  return (
    <div className={styles.container}>
      <h2>Welcome, {user.email}!</h2>
      <button onClick={onLogout} className={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}
