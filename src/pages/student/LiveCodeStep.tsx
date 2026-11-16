import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, errorMessage } from '../../api/client';
import { ShieldIcon } from '../../components/icons';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import type { CheckInTicket, Course } from '../../types';
import styles from './CheckIn.module.css';

interface LiveCodeStepProps {
  course: Course;
  /** Code from the scanned QR (?t=); tried automatically once. */
  scannedCode: string | null;
  /** Why we're asking (e.g. the previous ticket expired). */
  notice?: string | null;
  onTicket: (ticket: CheckInTicket) => void;
}

/** Proves the student is looking at the projector right now: the QR's rotating code → check-in ticket. */
export function LiveCodeStep({ course, scannedCode, notice, onTicket }: LiveCodeStepProps) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(Boolean(scannedCode));
  const [error, setError] = useState<string | null>(null);
  const triedScan = useRef(false);

  async function submit(value: string) {
    setChecking(true);
    setError(null);
    try {
      onTicket(await api.startCheckIn(course.id, value));
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'CODE_INVALID' && value === scannedCode
          ? 'That QR code has already changed. Scan the code on the projector again, or type the 6-digit live code shown under it.'
          : errorMessage(err),
      );
      setChecking(false);
    }
  }

  useEffect(() => {
    if (scannedCode && !triedScan.current) {
      triedScan.current = true;
      void submit(scannedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the scanned code
  }, [scannedCode]);

  if (checking && scannedCode && !error && code === '') {
    return (
      <p className={styles.checking} role="status">
        <span className={styles.spinner} aria-hidden="true" /> Checking the QR code…
      </p>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const digits = code.replace(/\D/g, '');
    if (digits.length === 6) void submit(digits);
  }

  return (
    <form className={styles.codeStep} onSubmit={handleSubmit} noValidate>
      <div className={styles.codeIntro}>
        <span className={styles.codeIcon} aria-hidden="true">
          <ShieldIcon width={20} height={20} />
        </span>
        <div>
          <p className={styles.codeTitle}>Enter the live code</p>
          <p className={styles.codeHint}>
            It’s the 6-digit number under the QR code on the projector. It changes every 30 seconds, so a code sent from
            a friend won’t work.
          </p>
        </div>
      </div>
      {notice && !error && <Alert tone="warning">{notice}</Alert>}
      <Field
        label="Live code"
        name="liveCode"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 7))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        placeholder="e.g. 482 913"
        enterKeyHint="go"
        className={styles.codeField}
        autoFocus={!scannedCode}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" block loading={checking} disabled={code.replace(/\D/g, '').length !== 6} className={styles.submit}>
        Continue
      </Button>
    </form>
  );
}
