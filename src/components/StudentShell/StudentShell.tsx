import type { ReactNode } from 'react';
import { Header } from '../Header/Header';
import styles from './StudentShell.module.css';

/** Phone-first, single-column layout for the student portal. */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.container}>{children}</main>
    </div>
  );
}
