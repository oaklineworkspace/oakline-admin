// components/Promo.js
import styles from "../styles/Promo.module.css";
import Link from "next/link";

export default function Promo({ imgSrc, title, description, ctaText, ctaHref, isDark }) {
  return (
    <section className={`${styles.promo} ${isDark ? styles.dark : ""}`}>
      <div className={styles.content}>
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
        {ctaText && ctaHref && (
          <Link href={ctaHref}>
            <button>{ctaText}</button>
          </Link>
        )}
      </div>
      {imgSrc && <img src={imgSrc} alt={title || "Promo"} className={styles.image} />}
    </section>
  );
}
