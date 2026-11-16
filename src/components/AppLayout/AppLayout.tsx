import { Outlet } from 'react-router-dom';
import { Header } from '../Header/Header';
import styles from './AppLayout.module.css';

/** Shell for the lecturer/admin area. */
export default function AppLayout() {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
