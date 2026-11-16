import { useState } from 'react';
import { api, ApiError, errorMessage } from '../../api/client';
import { CheckIcon, PinIcon } from '../../components/icons';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { isTicketError } from '../../lib/checkInTicket';
import { canUseLocation, formatDistance, getCurrentLocation } from '../../lib/geolocation';
import type { Course, GeoPoint } from '../../types';
import styles from './CheckIn.module.css';

export interface ConfirmedLocation {
  point: GeoPoint;
  distanceMeters: number;
}

interface LocationStepProps {
  course: Course;
  ticket: string | null;
  indexNumber: string;
  value: ConfirmedLocation | null;
  onConfirmed: (location: ConfirmedLocation) => void;
  onTicketExpired: (message: string) => void;
  disabled?: boolean;
}

/** Location lock: confirm the phone is in the lecture area before the selfie. */
export function LocationStep({ course, ticket, indexNumber, value, onConfirmed, onTicketExpired, disabled }: LocationStepProps) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const radius = course.locationLock?.radiusMeters ?? 0;

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const point = await getCurrentLocation();
      const result = await api.checkLocation({ courseId: course.id, ticket, indexNumber, location: point });
      onConfirmed({ point, distanceMeters: result?.distanceMeters ?? 0 });
    } catch (err) {
      if (err instanceof ApiError && isTicketError(err.code)) onTicketExpired(err.message);
      else setError(errorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  if (value) {
    return (
      <div className={`${styles.locStep} ${styles.locOk}`} role="status">
        <span className={styles.locIcon} aria-hidden="true">
          <CheckIcon width={18} height={18} />
        </span>
        <span className={styles.locText}>
          <span className={styles.locTitle}>You’re in the lecture area</span>
          <span className={styles.locHint}>About {formatDistance(value.distanceMeters)} from your lecturer</span>
        </span>
      </div>
    );
  }

  return (
    <div className={styles.locStep}>
      <div className={styles.locHead}>
        <span className={styles.locIcon} aria-hidden="true">
          <PinIcon width={18} height={18} />
        </span>
        <span className={styles.locText}>
          <span className={styles.locTitle}>Confirm you’re in class</span>
          <span className={styles.locHint}>
            This lecture only accepts check-ins within {radius} m of the lecture hall. Your location is only used for this
            check.
          </span>
        </span>
      </div>

      {canUseLocation() ? (
        <Button variant="secondary" block onClick={locate} loading={locating} disabled={disabled}>
          {locating ? 'Finding your location…' : error ? 'Try again' : 'Share my location'}
        </Button>
      ) : (
        <Alert tone="danger">
          Location only works on a secure (https://) link, and this page isn’t one. Ask your lecturer to start Pulselog in
          HTTPS mode, then scan again.
        </Alert>
      )}

      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
