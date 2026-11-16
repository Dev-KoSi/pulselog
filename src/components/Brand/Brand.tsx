import { APP_NAME } from '../../config';
import { LogoMark } from '../icons';
import styles from './Brand.module.css';

interface BrandProps {
  size?: 'md' | 'lg';
  /** Lets a parent hide the wordmark at small widths, keeping just the mark. */
  textClassName?: string;
}

/** Pulselog logo + two-tone wordmark ("Pulse" in ink, "log" in the blue→green brand gradient). */
export function Brand({ size = 'md', textClassName }: BrandProps) {
  const px = size === 'lg' ? 40 : 34;
  return (
    <span className={size === 'lg' ? `${styles.brand} ${styles.lg}` : styles.brand} role="img" aria-label={APP_NAME}>
      <LogoMark width={px} height={px} className={styles.logo} />
      <span className={textClassName ? `${styles.text} ${textClassName}` : styles.text} aria-hidden="true">
        Pulse<span className={styles.accent}>log</span>
      </span>
    </span>
  );
}
