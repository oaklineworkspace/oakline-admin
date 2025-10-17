import { useState } from 'react';
import styles from '../styles/Navbar.module.css';
import Link from 'next/link';

export default function Navbar({ links }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Oakline Bank</div>

      <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      <ul className={`${styles.navLinks} ${menuOpen ? styles.showMenu : ''}`}>
        {links.map((link, idx) => (
          <li key={idx} className={link.dropdown ? styles.dropdown : ''}>
            {link.dropdown ? (
              <>
                <span onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {link.name} ▼
                </span>
                {dropdownOpen && (
                  <ul className={styles.dropdownMenu}>
                    {link.dropdown.map((item, i) => (
                      <li key={i}>
                        <Link href={item.href}>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <Link href={link.href}>
                {link.name}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.authButtons}>
        <Link href="/sign-in">
          <button className={styles.login}>Sign In</button>
        </Link>
        <Link href="/enroll">
          <button className={styles.signup}>Enroll</button>
        </Link>
      </div>
    </nav>
  );
}
