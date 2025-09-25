import styles from '../styles/FormInput.module.css';

export default function FormInput({ label, ...props }) {
  return (
    <div className={styles.inputContainer}>
      <label className={styles.inputLabel}>{label}</label>
      <input className={styles.inputField} {...props} />
    </div>
  );
}
