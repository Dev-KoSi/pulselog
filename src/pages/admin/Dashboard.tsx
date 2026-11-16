import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../../api/client';
import { CourseCard } from '../../components/CourseCard/CourseCard';
import { HttpsNotice, needsHttpsForLock } from '../../components/LocationLock/LocationLock';
import { NewSessionForm } from '../../components/NewSessionForm/NewSessionForm';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import type { Course } from '../../types';
import styles from './Dashboard.module.css';

const REFRESH_MS = 10_000;

/** Admin course session manager: "Add New List" + one QR card per course. */
export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCourses(await api.listCourses());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, REFRESH_MS); // keeps counts + open/closed status fresh
    return () => window.clearInterval(timer);
  }, [load]);

  function handleCreated(course: Course) {
    setCourses((prev) => [course, ...prev.filter((c) => c.id !== course.id)]);
    setJustCreatedId(course.id);
    setShowForm(false);
  }

  const openCount = courses.filter((c) => c.status === 'active').length;
  const httpsProblem = courses.some((c) => c.status === 'active' && c.locationLock && needsHttpsForLock(c.checkInUrl));

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin / Lecturer Dashboard</p>
          <h1 className={styles.title}>Course sessions</h1>
          <p className={styles.subtitle}>
            Add a new list for each lecture, then project its QR code so students can check in.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className={styles.addButton}>
            + Add New List
          </Button>
        )}
      </header>

      {showForm && <NewSessionForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}

      {error && <Alert tone="danger">{error}</Alert>}
      {httpsProblem && <HttpsNotice />}

      {loading ? (
        <p className={styles.muted}>Loading course sessions…</p>
      ) : courses.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No course sessions yet</p>
          <p>Use “Add New List” to create your first lecture check-in and its QR code.</p>
        </div>
      ) : (
        <>
          <p className={styles.summary}>
            {courses.length} session{courses.length === 1 ? '' : 's'} · <strong>{openCount} open</strong> for check-in
          </p>
          <ul className={styles.grid}>
            {courses.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} highlight={course.id === justCreatedId} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
