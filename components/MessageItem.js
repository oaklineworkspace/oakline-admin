import styles from '../styles/MessageItem.module.css';

export default function MessageItem({ sender, text, timestamp }) {
  return (
    <div className={styles.message}>
      <div className={styles.header}>
        <strong>{sender}</strong>
        <span className={styles.time}>{timestamp}</span>
      </div>
      <p>{text}</p>
    </div>
  );
}
