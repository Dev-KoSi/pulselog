import type { CourseStatus } from '../../types';
import styles from './StatusBadge.module.css';

const LABELS: Record<CourseStatus, string> = {
  active: 'Open',
  expired: 'Expired',
  closed: 'Closed',
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}
