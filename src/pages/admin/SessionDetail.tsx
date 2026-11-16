import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { CourseQrCode } from '../../components/CourseQrCode/CourseQrCode';
import { HttpsNotice, LocationLockPanel, needsHttpsForLock } from '../../components/LocationLock/LocationLock';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAttendanceStream } from '../../hooks/useAttendanceStream';
import { useLiveCode } from '../../hooks/useLiveCode';
import { buildAttendanceCsv } from '../../lib/attendanceReport';
import { downloadCsv } from '../../lib/csv';
import { formatDistance } from '../../lib/geolocation';
import { formatDate, formatDay, formatExact, formatPercent, formatTime, formatTimeWithSeconds } from '../../lib/format';
import type { Course, QrPayload, Rejection } from '../../types';
import styles from './SessionDetail.module.css';

const STATUS_SUFFIX: Record<Course['status'], string> = { active: '', expired: ' (expired)', closed: ' (closed)' };

/** Latest blocked attempt per student, newest first. */
function groupRejections(rejections: Rejection[], records: { indexNumber: string }[]) {
  const byStudent = new Map<string, { latest: Rejection; attempts: number }>();
  for (const r of rejections) {
    const entry = byStudent.get(r.indexNumber);
    if (!entry) byStudent.set(r.indexNumber, { latest: r, attempts: 1 });
    else byStudent.set(r.indexNumber, { latest: r.timestamp > entry.latest.timestamp ? r : entry.latest, attempts: entry.attempts + 1 });
  }
  const checkedIn = new Set(records.map((r) => r.indexNumber));
  return [...byStudent.values()]
    .map((e) => ({ ...e, checkedInLater: checkedIn.has(e.latest.indexNumber) }))
    .sort((a, b) => b.latest.timestamp.localeCompare(a.latest.timestamp));
}

/** Admin live attendance dashboard for one course, with a selector to switch courses. */
export default function SessionDetail() {
  const { code: routeToken = '' } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { records, rejections, connected } = useAttendanceStream(course?.id);
  const live = useLiveCode(course);

  useEffect(() => {
    api
      .listCourses()
      .then(setAllCourses)
      .catch(() => undefined); // selector is a convenience; the page works without it
  }, [routeToken]);

  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setError(null);
    (async () => {
      try {
        const c = await api.getCourse(routeToken);
        if (cancelled) return;
        setCourse(c);
        const q = await api.getQr(c.id, window.location.origin);
        if (!cancelled) setQr(q);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeToken]);

  async function handleClose() {
    if (!course || !window.confirm('End this session? Students will no longer be able to check in.')) return;
    setClosing(true);
    try {
      setCourse(await api.closeCourse(course.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  }

  async function handleDownloadCsv() {
    if (!course) return;
    setExporting(true);
    try {
      // Fetch the authoritative log rather than trusting what the live stream has shown so far.
      const { course: fresh, records: all } = await api.getAttendance(course.id);
      const { filename, csv } = buildAttendanceCsv(fresh, all);
      downloadCsv(filename, csv);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const toolbar = (
    <div className={styles.toolbar}>
      <Link to="/admin" className={styles.back}>
        ← All sessions
      </Link>
      {allCourses.length > 0 && (
        <label className={styles.selector}>
          <span className={styles.selectorLabel}>Viewing course</span>
          <select
            className={styles.select}
            value={course?.routeToken ?? routeToken}
            onChange={(e) => navigate(`/admin/sessions/${e.target.value}`)}
          >
            {allCourses.map((c) => (
              <option key={c.id} value={c.routeToken}>
                {c.courseCode}: {c.courseTitle} · {formatDay(c.date)}
                {STATUS_SUFFIX[c.status]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  if (!course) {
    return (
      <>
        {toolbar}
        {error ? <Alert tone="danger">{error}</Alert> : <p className={styles.muted}>Loading session…</p>}
      </>
    );
  }

  const newestFirst = [...records].reverse();
  const blocked = groupRejections(rejections, records);
  // The /qr endpoint re-resolves the LAN address in case the network changed since creation.
  const checkInUrl = qr?.checkInUrl ?? course.checkInUrl;

  return (
    <>
      {toolbar}

      <header className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{course.courseCode}</h1>
            <StatusBadge status={course.status} />
          </div>
          <p className={styles.subtitle}>{course.courseTitle}</p>
          <p className={styles.muted}>
            {course.lecturerName} · {formatDay(course.date)} · Check-in closes {formatTime(course.expiresAt)}
          </p>
        </div>
        {course.status === 'active' && (
          <Button variant="danger" onClick={handleClose} loading={closing}>
            End session
          </Button>
        )}
      </header>

      {error && <Alert tone="danger">{error}</Alert>}
      {course.status === 'active' && course.locationLock && needsHttpsForLock(checkInUrl) && <HttpsNotice />}

      <div className={styles.layout}>
        <section className={`${styles.panel} ${styles.qrPanel}`} aria-labelledby="qr-heading">
          <h2 id="qr-heading" className={styles.panelTitle}>
            Scan to check in
          </h2>
          <div className={styles.qrWrap}>
            <CourseQrCode
              url={checkInUrl}
              label={`Check-in QR code for ${course.courseCode}`}
              inactive={course.status !== 'active'}
              live={live}
              details={{
                heading: course.courseCode,
                subheading: `${course.courseTitle} · ${course.lecturerName}`,
                sessionCode: course.routeToken,
                lockRadiusMeters: course.locationLock?.radiusMeters,
              }}
            />
          </div>

          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Session code</span>
            <span className={styles.code}>{course.routeToken}</span>
          </div>

          <div className={styles.urlRow}>
            <span className={styles.url} title={checkInUrl}>
              {checkInUrl}
            </span>
            <CopyButton text={checkInUrl} label="Copy" />
          </div>
          <a href={live?.url ?? checkInUrl} target="_blank" rel="noreferrer" className={styles.openLink}>
            Open student view ↗
          </a>

          <div className={styles.divider} />
          <LocationLockPanel course={course} onChange={setCourse} />
        </section>

        <section className={styles.panel} aria-labelledby="log-heading">
          <div className={styles.logHeader}>
            <h2 id="log-heading" className={styles.panelTitle}>
              Attendance <span className={styles.countPill}>{records.length}</span>
            </h2>
            <span className={styles.live}>
              <span className={`${styles.dot} ${connected ? styles.dotLive : ''}`} aria-hidden="true" />
              {connected ? 'Live' : 'Connecting…'}
            </span>
            <Button
              variant="secondary"
              onClick={handleDownloadCsv}
              loading={exporting}
              disabled={records.length === 0}
              className={styles.csvButton}
            >
              ⤓ Download CSV Report
            </Button>
          </div>

          {newestFirst.length === 0 ? (
            <p className={styles.emptyLog}>No check-ins yet. Students who scan the QR code will appear here instantly.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="visually-hidden">
                  Verified check-ins for {course.courseCode}, newest first
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Selfie</th>
                    <th scope="col">Index Number</th>
                    <th scope="col">Full Name</th>
                    <th scope="col">Program</th>
                    <th scope="col">Check-in Timestamp</th>
                    <th scope="col">Verification</th>
                  </tr>
                </thead>
                <tbody aria-live="polite">
                  {newestFirst.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Selfie" className={styles.selfieCell}>
                        <img
                          src={api.assetUrl(r.selfieImageUrl)}
                          alt={`Selfie of ${r.studentName}`}
                          className={styles.thumb}
                          loading="lazy"
                        />
                      </td>
                      <td data-label="Index Number" className={styles.mono}>
                        {r.indexNumber}
                      </td>
                      <td data-label="Full Name" className={styles.nameCell}>
                        <span className={styles.name}>{r.studentName}</span>
                        <span className={styles.sub}>Group {r.group}</span>
                      </td>
                      <td data-label="Program">{r.program}</td>
                      <td data-label="Check-in Timestamp">
                        <time dateTime={r.timestamp} title={formatExact(r.timestamp)}>
                          {formatTimeWithSeconds(r.timestamp)}
                        </time>
                        <span className={styles.sub}>{formatDate(r.timestamp)}</span>
                      </td>
                      <td data-label="Verification">
                        <span className={styles.verified}>✓ {r.verificationStatus}</span>
                        <span className={styles.sub}>
                          {formatPercent(r.confidence)} match
                          {r.location && <> · 📍 {formatDistance(r.location.distanceMeters)} away</>}
                          {r.captureMethod === 'demo-avatar' && <strong className={styles.demoTag}> · demo avatar</strong>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {blocked.length > 0 && (
            <section className={styles.blocked} aria-labelledby="blocked-heading">
              <h3 id="blocked-heading" className={styles.blockedTitle}>
                Blocked attempts <span className={styles.blockedPill}>{blocked.length}</span>
              </h3>
              <p className={styles.blockedDesc}>Tried to check in from outside the lecture area.</p>
              <ul className={styles.blockedList}>
                {blocked.map((b) => (
                  <li key={b.latest.indexNumber} className={styles.blockedItem}>
                    <span className={styles.blockedWho}>
                      <span className={styles.name}>{b.latest.studentName}</span>
                      <span className={styles.mono}>{b.latest.indexNumber}</span>
                    </span>
                    <span className={styles.blockedWhere}>
                      <strong>{formatDistance(b.latest.distanceMeters)} away</strong>
                      <span className={styles.sub}>
                        {formatTimeWithSeconds(b.latest.timestamp)}
                        {b.attempts > 1 && ` · ${b.attempts} attempts`}
                        {b.checkedInLater && ' · later checked in from the room'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </div>
    </>
  );
}
