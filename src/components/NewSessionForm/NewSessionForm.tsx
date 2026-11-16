import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../api/client';
import { todayYmd } from '../../lib/format';
import { getCurrentLocation, LocationError } from '../../lib/geolocation';
import { RADIUS_OPTIONS, type Course, type RadiusMeters } from '../../types';
import { PinIcon } from '../icons';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import styles from './NewSessionForm.module.css';

interface NewSessionFormProps {
  onCreated: (course: Course) => void;
  onCancel: () => void;
}

const RADIUS_HINTS: Record<RadiusMeters, string> = {
  50: 'Small room',
  100: 'Lecture hall',
  200: 'Large hall / building',
};

/**
 * "Add New List": creates a course session, which gets a unique route token + QR check-in URL.
 * With the location lock on, the lecturer's current position is captured on submit and only
 * phones within the chosen radius can check in.
 */
export function NewSessionForm({ onCreated, onCancel }: NewSessionFormProps) {
  const [form, setForm] = useState({
    courseCode: '',
    courseTitle: '',
    lecturerName: '',
    date: todayYmd(),
    durationMinutes: '90',
  });
  const [locationLock, setLocationLock] = useState(true);
  const [radiusMeters, setRadiusMeters] = useState<RadiusMeters>(100);
  const [phase, setPhase] = useState<'idle' | 'locating' | 'creating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [locationFailed, setLocationFailed] = useState(false);
  const submitting = phase !== 'idle';

  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLocationFailed(false);
    try {
      let location;
      if (locationLock) {
        setPhase('locating');
        location = await getCurrentLocation();
      }
      setPhase('creating');
      const { course } = await api.createCourse({
        ...form,
        durationMinutes: Number(form.durationMinutes),
        ...(location ? { location, radiusMeters } : {}),
      });
      onCreated(course);
    } catch (err) {
      setError(errorMessage(err));
      setLocationFailed(err instanceof LocationError);
      setPhase('idle');
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} aria-labelledby="new-session-title">
      <div>
        <h2 id="new-session-title" className={styles.title}>
          New attendance list
        </h2>
        <p className={styles.subtitle}>Students scan the generated QR code to check in for this lecture.</p>
      </div>

      <div className={styles.grid}>
        <Field
          label="Course code"
          placeholder="e.g. PSY 805"
          value={form.courseCode}
          onChange={update('courseCode')}
          required
          autoFocus
          autoCapitalize="characters"
        />
        <Field
          label="Course title"
          placeholder="e.g. Personnel Psychology"
          value={form.courseTitle}
          onChange={update('courseTitle')}
          required
        />
        <Field
          label="Lecturer name"
          placeholder="e.g. Dr. Mensah"
          value={form.lecturerName}
          onChange={update('lecturerName')}
          required
          autoComplete="name"
        />
        <Field label="Date" type="date" value={form.date} onChange={update('date')} required />
        <Field
          label="Check-in window (minutes)"
          type="number"
          inputMode="numeric"
          min={5}
          max={600}
          value={form.durationMinutes}
          onChange={update('durationMinutes')}
          required
        />
      </div>

      <fieldset className={styles.lock} disabled={submitting}>
        <legend className="visually-hidden">Location lock</legend>
        <label className={styles.lockToggle}>
          <input
            type="checkbox"
            className={styles.switch}
            checked={locationLock}
            onChange={(e) => setLocationLock(e.target.checked)}
          />
          <span className={styles.lockText}>
            <span className={styles.lockTitle}>
              <PinIcon width={16} height={16} /> Location lock
            </span>
            <span className={styles.lockHint}>
              {locationLock
                ? 'Only students in the room with you can check in. Your current location is saved when you create the list, so do this from the lecture hall.'
                : 'Off: anyone with the QR code can check in from anywhere.'}
            </span>
          </span>
        </label>

        {locationLock && (
          <div className={styles.radius} role="radiogroup" aria-label="Allowed distance from you">
            {RADIUS_OPTIONS.map((r) => (
              <label key={r} className={r === radiusMeters ? `${styles.radiusOption} ${styles.radiusActive}` : styles.radiusOption}>
                <input
                  type="radio"
                  name="radiusMeters"
                  value={r}
                  checked={r === radiusMeters}
                  onChange={() => setRadiusMeters(r)}
                  className="visually-hidden"
                />
                <span className={styles.radiusValue}>{r} m</span>
                <span className={styles.radiusHint}>{RADIUS_HINTS[r]}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {error && (
        <Alert tone="danger">
          {error}
          {locationFailed && locationLock && (
            <>
              {' '}
              <button type="button" className={styles.inlineLink} onClick={() => setLocationLock(false)}>
                Create without location lock
              </button>
            </>
          )}
        </Alert>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {phase === 'locating' ? 'Getting your location…' : phase === 'creating' ? 'Creating…' : 'Create & generate QR'}
        </Button>
      </div>
    </form>
  );
}
