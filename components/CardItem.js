// components/CardItems.js
import styles from "../styles/CardItems.module.css";

export default function CardItems({ cards }) {
  return (
    <div className={styles.cardGrid}>
      {cards.map((card, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.cardHeader}>
            <img
              src={card.logo}
              alt={`${card.bank} logo`}
              className={styles.bankLogo}
            />
            <span className={styles.bankName}>{card.bank}</span>
          </div>

          <div className={styles.cardNumber}>
            **** **** **** {card.last4}
          </div>

          <div className={styles.cardDetails}>
            <div>
              <span className={styles.label}>Card Holder</span>
              <p>{card.holder}</p>
            </div>
            <div>
              <span className={styles.label}>Expiry</span>
              <p>{card.expiry}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
