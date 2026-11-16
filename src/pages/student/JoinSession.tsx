import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentShell } from '../../components/StudentShell/StudentShell';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import styles from './CheckIn.module.css';

/** Fallback for students who can't scan the QR: type the session code shown on screen. */
export default function JoinSession() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) navigate(`/checkin/${encodeURIComponent(clean)}`);
  }

  return (
    <StudentShell>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.summary}>
          <span className={styles.courseTitle}>Join a lecture</span>
          <span className={styles.summaryMeta}>Scan the QR code on the projector, or type the session code below. You’ll then enter the live code shown under the QR.</span>
        </div>
        <Field
          label="Session code"
          placeholder="e.g. PSY241-7KQ2X"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          required
        />
        <Button type="submit" block disabled={!code.trim()} className={styles.submit}>
          Continue
        </Button>
      </form>
    </StudentShell>
  );
}
