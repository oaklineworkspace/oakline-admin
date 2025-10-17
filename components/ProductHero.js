// components/ProductHero.js
import styles from "../styles/ProductHero.module.css";

export default function ProductHero({ imgSrc, title, description, ctaText, ctaHref, list, imageLeft }) {
  return (
    <section className={styles.productHero}>
      <div className={styles.content} style={{ order: imageLeft ? 2 : 1 }}>
        <h2>{title}</h2>
        <p>{description}</p>
        {list && (
          <ul>
            {list.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}
        {ctaText && <a href={ctaHref || "#"} className={styles.cta}>{ctaText}</a>}
      </div>
      <div className={styles.image} style={{ order: imageLeft ? 1 : 2 }}>
        <img src={imgSrc} alt={title} />
      </div>
    </section>
  );
}
