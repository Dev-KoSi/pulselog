import type { LiveCodeState } from '../../hooks/useLiveCode';
import styles from './LiveCountdown.module.css';

/** "482 913" for legibility on a projector. */
export const spacedCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** Live 6-digit code with a draining bar until the QR changes. */
export function LiveCountdown({ live, size = 'sm' }: { live: LiveCodeState; size?: 'sm' | 'lg' }) {
  const fraction = live.code ? live.secondsLeft / live.windowSeconds : 0;
  return (
    <span className={size === 'lg' ? `${styles.root} ${styles.lg}` : styles.root}>
      <span className={styles.row}>
        <span className={styles.label}>Live code</span>
        <span className={styles.code}>{live.code ? spacedCode(live.code) : '··· ···'}</span>
        <span className={styles.seconds} aria-hidden="true">
          {live.code ? `${live.secondsLeft}s` : ''}
        </span>
      </span>
      <span className={styles.track} aria-hidden="true">
        {/* Keyed by code so the bar snaps back to full when the code changes. */}
        <span key={live.code ?? 'none'} className={styles.bar} style={{ transform: `scaleX(${fraction})` }} />
      </span>
      {size === 'lg' && live.code && (
        <span className={styles.caption}>New code in {live.secondsLeft} s. Photos of this code stop working within 90 s.</span>
      )}
    </span>
  );
}
