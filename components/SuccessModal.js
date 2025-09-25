import React from 'react';
import Link from 'next/link';
import styles from './SuccessModal.module.css';

export default function SuccessModal({ accountNumber, enrollLink, onClose }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Application Submitted!</h2>
        <p>Your account number is: <strong>{accountNumber}</strong></p>
        <p>Click below to enroll in online banking:</p>
        <Link href={enrollLink}>
          <button className={styles.enrollButton}>Enroll Now</button>
        </Link>
        <button onClick={onClose} className={styles.closeButton}>Close</button>
      </div>
    </div>
  );
}
