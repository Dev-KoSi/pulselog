import { useId, type InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function Field({ label, hint, error, id, className, ...inputProps }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const message = error || hint;
  const descId = message ? `${inputId}-desc` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={descId}
        {...inputProps}
      />
      {message && (
        <p id={descId} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}
