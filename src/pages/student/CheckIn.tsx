import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError, errorMessage } from '../../api/client';
import { CheckIcon } from '../../components/icons';
import { SelfieCapture } from '../../components/SelfieCapture/SelfieCapture';
import { StudentShell } from '../../components/StudentShell/StudentShell';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { clearTicket, isTicketError, loadTicket, saveTicket } from '../../lib/checkInTicket';
import { formatDay, formatExact, formatPercent, formatTime } from '../../lib/format';
import { formatDistance } from '../../lib/geolocation';
import type { AttendanceRecord, CaptureMethod, CheckInTicket, Course, Student } from '../../types';
import styles from './CheckIn.module.css';
import { LiveCodeStep } from './LiveCodeStep';
import { LocationStep, type ConfirmedLocation } from './LocationStep';

function CourseSummary({ course }: { course: Course }) {
  return (
    <div className={styles.summary}>
      <span className={styles.courseCode}>{course.courseCode}</span>
      <span className={styles.courseTitle}>{course.courseTitle}</span>
      <span className={styles.summaryMeta}>
        {course.lecturerName} · {formatDay(course.date)} · Closes {formatTime(course.expiresAt)}
      </span>
    </div>
  );
}

/**
 * Student check-in: [live code from the QR] → index number → "Is this you?" →
 * [location check] → selfie → verify. Bracketed steps only apply when the session uses them.
 */
export default function CheckIn() {
  const { code: routeToken = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Rotating code from the scanned QR. Read once, then dropped from the address bar so the
  // URL a student might forward doesn't carry it (it expires within 90 s anyway).
  const [scannedCode, setScannedCode] = useState<string | null>(() => searchParams.get('t'));
  const [ticket, setTicket] = useState<string | null>(null);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);
  const [location, setLocation] = useState<ConfirmedLocation | null>(null);

  const [indexNumber, setIndexNumber] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [selfie, setSelfie] = useState<string | null>(null);
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('camera');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (searchParams.has('t')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    api
      .getCourse(routeToken)
      .then((c) => {
        if (cancelled) return;
        setTicket(c.liveCode ? loadTicket(c.id) : null); // survives a refresh mid check-in
        setCourse(c);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [routeToken]);

  function handleTicket(next: CheckInTicket) {
    if (!course) return;
    saveTicket(course.id, next);
    setTicket(next.ticket);
    setTicketNotice(null);
    setError(null);
  }

  /** Ticket ran out (10 min) or was rejected: ask for a fresh code but keep the student's progress. */
  function handleTicketExpired(message: string) {
    if (course) clearTicket(course.id);
    setTicket(null);
    setScannedCode(null);
    setTicketNotice(message);
  }

  async function handleLookup() {
    setLookingUp(true);
    setError(null);
    try {
      setStudent(await api.lookupStudent(indexNumber.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLookingUp(false);
    }
  }

  function resetStudent() {
    setStudent(null);
    setSelfie(null);
    setLocation(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    if (!student) {
      await handleLookup();
      return;
    }
    if (course.locationLock && !location) {
      setError('Share your location first so we can confirm you’re in the lecture hall.');
      return;
    }
    if (!selfie) {
      setError('Please take a selfie so we can verify it is you.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setRecord(
        await api.verifyAttendance({
          indexNumber: student.indexNumber,
          courseId: course.id,
          selfieImage: selfie,
          captureMethod,
          ticket,
          location: location?.point ?? null,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && isTicketError(err.code)) {
        handleTicketExpired(err.message);
      } else {
        // Moved out of range since the location check: make them re-check from where they are.
        if (err instanceof ApiError && (err.code === 'OUTSIDE_AREA' || err.code?.startsWith('LOCATION_'))) {
          setLocation(null);
        }
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <StudentShell>
        <div className={styles.card}>
          <Alert tone="danger">{loadError}</Alert>
          <Link to="/checkin" className={styles.textLink}>
            Enter a session code instead
          </Link>
        </div>
      </StudentShell>
    );
  }

  if (!course) {
    return (
      <StudentShell>
        <div className={styles.card}>
          <p className={styles.muted}>Loading lecture…</p>
        </div>
      </StudentShell>
    );
  }

  if (record) {
    return (
      <StudentShell>
        <div className={`${styles.card} ${styles.success}`} role="status">
          <div className={styles.photoBadge}>
            <img src={selfie ?? api.assetUrl(record.selfieImageUrl)} alt={`Verification selfie of ${record.studentName}`} />
            <span className={styles.badgeCheck} aria-hidden="true">
              <CheckIcon width={18} height={18} />
            </span>
          </div>
          <div>
            <h1 className={styles.successTitle}>Attendance Recorded! ✅</h1>
            <p className={styles.muted}>Your face was verified and your attendance is saved.</p>
          </div>
          <dl className={styles.receipt}>
            <div>
              <dt>Student name</dt>
              <dd>{record.studentName}</dd>
            </div>
            <div>
              <dt>Index number</dt>
              <dd className={styles.mono}>{record.indexNumber}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{record.program}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>
                {course.courseCode} · {course.courseTitle}
              </dd>
            </div>
            <div>
              <dt>Lecturer</dt>
              <dd>{course.lecturerName}</dd>
            </div>
            <div>
              <dt>Checked in</dt>
              <dd>
                <time dateTime={record.timestamp}>{formatExact(record.timestamp)}</time>
              </dd>
            </div>
            {record.location && (
              <div>
                <dt>Location</dt>
                <dd className={styles.verified}>In the lecture area · {formatDistance(record.location.distanceMeters)} away</dd>
              </div>
            )}
            <div>
              <dt>Verification</dt>
              <dd className={styles.verified}>
                {record.verificationStatus} · {formatPercent(record.confidence)} match
              </dd>
            </div>
          </dl>
          {record.captureMethod === 'demo-avatar' && (
            <Alert tone="warning">Demo avatar used. This check-in is marked as a test in the lecturer’s report.</Alert>
          )}
          <p className={styles.footnote}>Show this screen to your lecturer if asked. You can close this page now.</p>
        </div>
      </StudentShell>
    );
  }

  if (course.status !== 'active') {
    return (
      <StudentShell>
        <div className={styles.card}>
          <CourseSummary course={course} />
          <Alert tone="warning">
            Check-in for this lecture is {course.status === 'closed' ? 'closed' : 'no longer open'}. Please speak to your
            lecturer.
          </Alert>
        </div>
      </StudentShell>
    );
  }

  if (course.liveCode && !ticket) {
    return (
      <StudentShell>
        <div className={styles.card}>
          <CourseSummary course={course} />
          <LiveCodeStep course={course} scannedCode={scannedCode} notice={ticketNotice} onTicket={handleTicket} />
        </div>
      </StudentShell>
    );
  }

  const locationDone = !course.locationLock || Boolean(location);

  return (
    <StudentShell>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <CourseSummary course={course} />

        {/* Step A + B: identify against the class roster */}
        {student ? (
          <div className={styles.studentCard} aria-live="polite">
            <div className={styles.studentText}>
              <span className={styles.stepLabel}>Is this you?</span>
              <span className={styles.studentName}>{student.name}</span>
              <span className={styles.studentIndex}>{student.indexNumber}</span>
              <span className={styles.studentMeta}>
                {student.program} · Group {student.group}
              </span>
            </div>
            <Button variant="ghost" onClick={resetStudent} disabled={submitting} className={styles.changeButton}>
              Change
            </Button>
          </div>
        ) : (
          <Field
            label="Student index number"
            name="indexNumber"
            placeholder="e.g. EF/BPS/24/0023"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="search"
            required
            hint="Slashes are optional. EFBPS240023 works too."
          />
        )}

        {/* Location lock: prove the phone is in the lecture area before the selfie */}
        {student && course.locationLock && (
          <LocationStep
            course={course}
            ticket={ticket}
            indexNumber={student.indexNumber}
            value={location}
            onConfirmed={(loc) => {
              setLocation(loc);
              setError(null);
            }}
            onTicketExpired={handleTicketExpired}
            disabled={submitting}
          />
        )}

        {/* Step C: face verification selfie, only once the student is confirmed (and in the room) */}
        {student && locationDone && (
          <SelfieCapture
            value={selfie}
            onCapture={(dataUrl, method) => {
              setSelfie(dataUrl);
              setCaptureMethod(method);
            }}
            onError={setError}
            avatarName={student.name}
            disabled={submitting}
          />
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        {student ? (
          <Button type="submit" block loading={submitting} disabled={!selfie || !locationDone} className={styles.submit}>
            {submitting ? 'Verifying…' : 'Verify & check in'}
          </Button>
        ) : (
          <Button type="submit" block loading={lookingUp} disabled={!indexNumber.trim()} className={styles.submit}>
            Find my record
          </Button>
        )}
      </form>
    </StudentShell>
  );
}
