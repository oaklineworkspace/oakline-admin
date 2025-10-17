// components/AccountCard.js
import styles from "../styles/AccountCard.module.css";

export default function AccountCard({ accountName, balance }) {
  return (
    <div className={styles.card}>
      <p className={styles.accountName}>{accountName}</p>
      <p className={styles.balance}>{balance}</p>
    </div>
  );
}
