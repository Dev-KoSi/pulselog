import { useState } from 'react';
import type { LiveCodeState } from '../../hooks/useLiveCode';
import { ExpandIcon } from '../icons';
import { LiveCountdown } from './LiveCountdown';
import { QrFullscreen, type QrDetails } from './QrFullscreen';
import { QrSvg } from './QrSvg';
import styles from './CourseQrCode.module.css';

export type { QrDetails };

interface CourseQrCodeProps {
  /** Check-in URL to encode. */
  url: string;
  /** Accessible label, e.g. "Check-in QR for PSY 805". */
  label: string;
  /** Dims the code when check-in is no longer open. */
  inactive?: boolean;
  /** Shown alongside the code in fullscreen. */
  details: QrDetails;
  /** Rotating code (from useLiveCode); when set, the QR encodes its URL and shows a countdown. */
  live?: LiveCodeState | null;
}

/**
 * Scannable QR rendered client-side as crisp SVG (scales cleanly on a projector).
 * Error-correction level "M" survives glare and phone cameras at an angle.
 * Click (or Enter/Space) opens it fullscreen for projecting; click again, Esc or "Exit" closes it.
 */
export function CourseQrCode({ url: baseUrl, label, inactive = false, details, live }: CourseQrCodeProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const url = live?.url ?? baseUrl;

  return (
    <>
      <button
        type="button"
        className={inactive ? `${styles.frame} ${styles.inactive}` : styles.frame}
        onClick={() => setFullscreen(true)}
        aria-label={`${label}. Show fullscreen`}
        aria-haspopup="dialog"
      >
        <QrSvg url={url} className={styles.code} />
        {inactive && <span className={styles.overlay}>Check-in closed</span>}
        {live && (
          <span className={styles.live}>
            <LiveCountdown live={live} />
          </span>
        )}
        <span className={styles.expandHint} aria-hidden="true">
          <ExpandIcon width={14} height={14} />
          Fullscreen
        </span>
      </button>

      {fullscreen && (
        <QrFullscreen
          url={url}
          label={label}
          inactive={inactive}
          details={details}
          live={live ?? null}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}
