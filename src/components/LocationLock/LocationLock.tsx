import { useState } from 'react';
import { api, errorMessage } from '../../api/client';
import { formatTime } from '../../lib/format';
import { formatDistance, getCurrentLocation } from '../../lib/geolocation';
import { RADIUS_OPTIONS, type Course, type LocationLock, type RadiusMeters } from '../../types';
import { PinIcon } from '../icons';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import styles from './LocationLock.module.css';

/** The lecturer's own fix was so rough that students in the room may be blocked. */
export const isLockImprecise = (lock: LocationLock) => lock.accuracyMeters > lock.radiusMeters;

/**
 * Phones only share location on https:// pages (or localhost). A plain-http LAN link in the QR
 * means every location-locked check-in would fail, so tell the lecturer before class.
 */
export function needsHttpsForLock(checkInUrl: string) {
  try {
    const { protocol, hostname } = new URL(checkInUrl);
    return protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

export function HttpsNotice() {
  return (
    <Alert tone="warning">
      <strong>Students’ phones can’t share their location on this link.</strong> Phones only allow location on secure
      (https://) pages, and this QR code uses http://. Restart Pulselog with <code>npm run dev:https</code> before class (each
      phone will ask to trust the certificate once).
    </Alert>
  );
}

/** One-line status for course cards. */
export function LockSummary({ course }: { course: Course }) {
  const lock = course.locationLock;
  if (!lock) {
    return (
      <p className={`${styles.summary} ${styles.off}`}>
        <PinIcon width={14} height={14} /> No location lock
      </p>
    );
  }
  return (
    <p className={`${styles.summary} ${isLockImprecise(lock) ? styles.warn : styles.on}`}>
      <PinIcon width={14} height={14} />
      {isLockImprecise(lock)
        ? `Location lock ${lock.radiusMeters} m · your location was approximate (±${formatDistance(lock.accuracyMeters)})`
        : `Location lock · within ${lock.radiusMeters} m`}
    </p>
  );
}

/** Session page panel: shows the lock and lets the lecturer re-pin it (e.g. from their phone in the hall). */
export function LocationLockPanel({ course, onChange }: { course: Course; onChange: (course: Course) => void }) {
  const lock = course.locationLock;
  const [radius, setRadius] = useState<RadiusMeters>((lock?.radiusMeters as RadiusMeters) ?? 100);
  const [busy, setBusy] = useState<'pin' | 'off' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editable = course.status === 'active';

  async function pinHere() {
    setBusy('pin');
    setError(null);
    try {
      const location = await getCurrentLocation();
      onChange(await api.setCourseLocation(course.id, location, radius));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    if (!window.confirm('Turn off the location lock? Anyone with the QR code could then check in from anywhere.')) return;
    setBusy('off');
    setError(null);
    try {
      onChange(await api.setCourseLocation(course.id, null));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="lock-heading">
      <div className={styles.head}>
        <span className={lock ? `${styles.icon} ${styles.iconOn}` : styles.icon} aria-hidden="true">
          <PinIcon width={18} height={18} />
        </span>
        <div className={styles.headText}>
          <h2 id="lock-heading" className={styles.title}>
            Location lock {lock ? <span className={styles.pillOn}>On</span> : <span className={styles.pillOff}>Off</span>}
          </h2>
          <p className={styles.desc}>
            {lock
              ? `Check-in only works within ${lock.radiusMeters} m of where you pinned it at ${formatTime(lock.setAt)} (your accuracy ±${formatDistance(lock.accuracyMeters)}).`
              : 'Anyone with the QR code can check in from anywhere.'}
          </p>
        </div>
      </div>

      {lock && isLockImprecise(lock) && (
        <Alert tone="warning">
          Your device could only place you within ±{formatDistance(lock.accuracyMeters)}, so students in the room might be
          blocked. Open this page on your phone in the lecture hall and tap “Pin to my location”.
        </Alert>
      )}

      {editable && (
        <div className={styles.controls}>
          <div className={styles.radius} role="radiogroup" aria-label="Allowed distance">
            {RADIUS_OPTIONS.map((r) => (
              <label key={r} className={r === radius ? `${styles.chip} ${styles.chipActive}` : styles.chip}>
                <input
                  type="radio"
                  name={`radius-${course.id}`}
                  className="visually-hidden"
                  checked={r === radius}
                  onChange={() => setRadius(r)}
                />
                {r} m
              </label>
            ))}
          </div>
          <div className={styles.buttons}>
            <Button variant="secondary" onClick={pinHere} loading={busy === 'pin'} disabled={busy !== null}>
              {busy === 'pin' ? 'Getting location…' : lock ? 'Pin to my location' : 'Turn on here'}
            </Button>
            {lock && (
              <Button variant="ghost" onClick={turnOff} loading={busy === 'off'} disabled={busy !== null}>
                Turn off
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}
    </section>
  );
}
