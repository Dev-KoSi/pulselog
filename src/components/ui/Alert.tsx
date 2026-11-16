import type { ReactNode } from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}

export function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
