import { Link } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell/StudentShell';
import { buttonClassName } from '../components/ui/Button';
import styles from './student/CheckIn.module.css';

export default function NotFound() {
  return (
    <StudentShell>
      <div className={`${styles.card} ${styles.success}`}>
        <h1 className={styles.successTitle}>Page not found</h1>
        <p className={styles.muted}>That link doesn’t match any page. If you scanned a QR code, ask your lecturer for the session code.</p>
        <Link to="/checkin" className={buttonClassName('primary', true)}>
          Enter a session code
        </Link>
        <Link to="/admin" className={styles.textLink}>
          Lecturer dashboard
        </Link>
      </div>
    </StudentShell>
  );
}
