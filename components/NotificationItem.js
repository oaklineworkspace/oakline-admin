import styles from '../styles/NotificationItem.module.css';

export default function NotificationItem({ message, type }) {
  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      {message}
    </div>
  );
}
