// components/Certificates.js
import styles from "../styles/Certificates.module.css";

const certificates = [
  "FDIC Insured",
  "ISO 27001 Certified",
  "PCI DSS Compliant",
];

export default function Certificates() {
  return (
    <section className={styles.certificates}>
      <h2>Our Certifications</h2>
      <ul>
        {certificates.map((cert, idx) => <li key={idx}>{cert}</li>)}
      </ul>
    </section>
  );
}
