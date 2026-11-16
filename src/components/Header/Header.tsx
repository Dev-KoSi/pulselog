import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { Brand } from '../Brand/Brand';
import styles from './Header.module.css';

type Portal = 'student' | 'admin';

const PORTALS: { id: Portal; to: string; long: string; short: string }[] = [
  { id: 'student', to: '/checkin', long: 'Student Portal', short: 'Student' },
  { id: 'admin', to: '/admin', long: 'Admin / Lecturer Dashboard', short: 'Lecturer' },
];

/** Sticky top bar shared by both portals, with a segmented toggle to switch between them. */
export function Header() {
  const { pathname } = useLocation();
  const current: Portal = pathname.startsWith('/admin') ? 'admin' : 'student';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={current === 'admin' ? '/admin' : '/checkin'} className={styles.brand} aria-label={`${APP_NAME} home`}>
          <Brand textClassName={styles.brandText} />
        </Link>

        <nav className={styles.toggle} aria-label="Switch portal">
          {PORTALS.map((p) => {
            const active = p.id === current;
            return (
              <Link
                key={p.id}
                to={p.to}
                className={active ? `${styles.option} ${styles.optionActive}` : styles.option}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.long}>{p.long}</span>
                <span className={styles.short} aria-hidden="true">
                  {p.short}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
