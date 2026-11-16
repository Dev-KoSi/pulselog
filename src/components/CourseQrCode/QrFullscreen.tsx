import { useEffect, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Brand } from '../Brand/Brand';
import type { LiveCodeState } from '../../hooks/useLiveCode';
import { CollapseIcon, PinIcon } from '../icons';
import { LiveCountdown, spacedCode } from './LiveCountdown';
import { QrSvg } from './QrSvg';
import styles from './QrFullscreen.module.css';

export interface QrDetails {
  /** Big heading in fullscreen, e.g. the course code. */
  heading: string;
  /** e.g. course title · lecturer */
  subheading?: string;
  /** Short code students can type instead of scanning. */
  sessionCode?: string;
  /** Location lock radius, shown as a deterrent on the projector. */
  lockRadiusMeters?: number;
}

interface QrFullscreenProps {
  url: string;
  label: string;
  inactive: boolean;
  details: QrDetails;
  live: LiveCodeState | null;
  onClose: () => void;
}

/**
 * Projector view of a check-in QR. Uses the browser Fullscreen API where it exists (hides the
 * browser UI on laptops/Android); elsewhere (iPhone Safari) it is still a full-window overlay.
 */
export function QrFullscreen({ url, label, inactive, details, live, onClose }: QrFullscreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    exitRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Leaving native fullscreen (browser Esc, F11, swipe) closes the view too.
    let enteredNative = false;
    const onFullscreenChange = () => {
      if (document.fullscreenElement === dialog) enteredNative = true;
      else if (enteredNative) onCloseRef.current();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    if (document.fullscreenEnabled && dialog.requestFullscreen) {
      dialog.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
        /* Not allowed here; the overlay still covers the window. */
      });
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement === dialog) document.exitFullscreen().catch(() => undefined);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function close() {
    if (document.fullscreenElement === dialogRef.current) {
      document.exitFullscreen().catch(() => undefined).finally(onClose);
    } else {
      onClose();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    // Keep Tab focus inside the dialog.
    if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${label}, fullscreen`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.topBar}>
        <Brand size="lg" />
        <button ref={exitRef} type="button" className={styles.exit} onClick={close}>
          <CollapseIcon width={18} height={18} />
          Exit fullscreen
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.headingBlock}>
          <h2 className={styles.heading}>{details.heading}</h2>
          {details.subheading && <p className={styles.subheading}>{details.subheading}</p>}
        </div>

        <button
          type="button"
          className={inactive ? `${styles.qr} ${styles.qrInactive}` : styles.qr}
          onClick={close}
          aria-label="Exit fullscreen"
          title="Click to exit fullscreen"
        >
          <QrSvg url={url} className={styles.qrSvg} />
          {inactive && <span className={styles.closedTag}>Check-in closed</span>}
        </button>

        <p className={styles.instruction}>
          {inactive ? 'This session is no longer accepting check-ins.' : 'Scan with your phone camera to check in'}
        </p>

        {live && !inactive && (
          <div className={styles.liveWrap}>
            <LiveCountdown live={live} size="lg" />
          </div>
        )}

        {!inactive && details.lockRadiusMeters && (
          <p className={styles.lockNotice}>
            <PinIcon width={16} height={16} />
            Location lock on: check-in only works within {details.lockRadiusMeters} m of this room
          </p>
        )}

        <div className={styles.meta}>
          {details.sessionCode && (
            <span className={styles.sessionCode}>
              <span className={styles.metaLabel}>Session code</span>
              {details.sessionCode}
            </span>
          )}
          {/* The typed fallback: base link + session code + live code (never the ?t= URL). */}
          <span className={styles.url}>
            {url.split('?')[0].replace(/^https?:\/\//, '')}
            {live?.code && !inactive ? ` · then enter ${spacedCode(live.code)}` : ''}
          </span>
        </div>
      </div>

      <p className={styles.hint} aria-hidden="true">
        Press <kbd>Esc</kbd> or click the code to exit
      </p>
    </div>,
    document.body,
  );
}
