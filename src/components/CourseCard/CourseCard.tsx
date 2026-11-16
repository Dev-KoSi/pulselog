import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveCode } from '../../hooks/useLiveCode';
import { formatDay, formatTime } from '../../lib/format';
import type { Course } from '../../types';
import { CourseQrCode } from '../CourseQrCode/CourseQrCode';
import { LockSummary } from '../LocationLock/LocationLock';
import { buttonClassName } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { StatusBadge } from '../ui/StatusBadge';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  course: Course;
  /** Briefly highlight and scroll to a just-created course. */
  highlight?: boolean;
}

export function CourseCard({ course, highlight = false }: CourseCardProps) {
  const ref = useRef<HTMLElement>(null);
  const active = course.status === 'active';
  const live = useLiveCode(course);

  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  return (
    <article ref={ref} className={highlight ? `${styles.card} ${styles.highlight}` : styles.card} aria-labelledby={`course-${course.id}`}>
      <header className={styles.top}>
        <div className={styles.heading}>
          <h3 id={`course-${course.id}`} className={styles.code}>
            {course.courseCode}
          </h3>
          <p className={styles.title}>{course.courseTitle}</p>
        </div>
        <StatusBadge status={course.status} />
      </header>

      <dl className={styles.details}>
        <div>
          <dt>Lecturer</dt>
          <dd>{course.lecturerName}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDay(course.date)}</dd>
        </div>
        <div>
          <dt>{active ? 'Closes' : 'Ended'}</dt>
          <dd>{formatTime(course.closedAt ?? course.expiresAt)}</dd>
        </div>
      </dl>

      <CourseQrCode
        url={course.checkInUrl}
        label={`Check-in QR code for ${course.courseCode}`}
        inactive={!active}
        live={live}
        details={{
          heading: course.courseCode,
          subheading: `${course.courseTitle} · ${course.lecturerName}`,
          sessionCode: course.routeToken,
          lockRadiusMeters: course.locationLock?.radiusMeters,
        }}
      />

      {active && <LockSummary course={course} />}

      <div className={styles.linkBlock}>
        <span className={styles.linkLabel}>
          Student check-in link{course.liveCode && active ? ' (asks for the live code)' : ''}
        </span>
        <a href={course.checkInUrl} target="_blank" rel="noreferrer" className={styles.link} title={course.checkInUrl}>
          {course.checkInUrl.replace(/^https?:\/\//, '')}
        </a>
        <CopyButton text={course.checkInUrl} />
      </div>

      <footer className={styles.footer}>
        <span className={styles.count}>
          <strong>{course.attendanceCount}</strong> checked in
        </span>
        <Link to={`/admin/sessions/${course.routeToken}`} className={buttonClassName('primary', false, styles.manage)}>
          Live attendance →
        </Link>
      </footer>
    </article>
  );
}
