import styles from '../styles/TransactionItem.module.css';

export default function TransactionItem({ date, description, amount, type }) {
  return (
    <div className={`${styles.transactionItem} ${type === 'income' ? styles.income : styles.expense}`}>
      <p className={styles.date}>{date}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.amount}>{amount}</p>
    </div>
  );
}
