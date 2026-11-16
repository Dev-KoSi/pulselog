import type {
  AttendanceRecord,
  CheckInTicket,
  Course,
  GeoPoint,
  LiveCode,
  NewCourseInput,
  QrPayload,
  RadiusMeters,
  Rejection,
  Student,
  VerifyAttendanceInput,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable reason from the API, e.g. "OUTSIDE_AREA" or "TICKET_EXPIRED". */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: hasBody ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (data && typeof data.error === 'string') throw new ApiError(data.error, res.status, data.code);
    // Our API always explains its errors in JSON. A bare 5xx comes from a proxy in front of it
    // (Vite in dev, nginx in prod) that couldn't reach the backend.
    if (res.status >= 500) throw new ApiError(SERVER_UNREACHABLE, res.status);
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const SERVER_UNREACHABLE = API_BASE
  ? // Hosted (e.g. Render free plan): the usual cause is the server waking up after being idle.
    "Can't reach the Pulselog server right now. It may be waking up, which can take up to a minute. Please try again shortly."
  : "Can't reach the attendance server. Make sure the app is running (npm run dev) and this device is on the same Wi-Fi as the lecturer's laptop.";

const enc = encodeURIComponent;
const currentOrigin = () => window.location.origin;

export const api = {
  // Public
  // Sending our origin makes the server rebuild each check-in link for the address we're on now.
  listCourses: () => request<{ courses: Course[] }>(`/api/courses?origin=${enc(currentOrigin())}`).then((r) => r.courses),
  getCourse: (idOrToken: string) =>
    request<{ course: Course }>(`/api/courses/${enc(idOrToken)}?origin=${enc(currentOrigin())}`).then((r) => r.course),

  // Admin / lecturer
  createCourse: (input: NewCourseInput) =>
    request<{ course: Course; qrDataUrl: string }>('/api/admin/courses', { method: 'POST', body: input }),
  closeCourse: (courseId: string) =>
    request<{ course: Course }>(`/api/admin/courses/${enc(courseId)}/close`, { method: 'PATCH' }).then((r) => r.course),
  getLiveCode: (courseId: string) =>
    request<LiveCode>(`/api/admin/courses/${enc(courseId)}/live-code?origin=${enc(currentOrigin())}`),
  /** Re-pin the location lock where this device is now, or pass null to turn it off. */
  setCourseLocation: (courseId: string, location: GeoPoint | null, radiusMeters?: RadiusMeters) =>
    request<{ course: Course }>(`/api/admin/courses/${enc(courseId)}/location`, {
      method: 'PATCH',
      body: { location, radiusMeters },
    }).then((r) => r.course),
  getQr: (courseId: string, origin: string) =>
    request<QrPayload>(`/api/admin/courses/${enc(courseId)}/qr?origin=${enc(origin)}`),
  getAttendance: (courseId: string) =>
    request<{ course: Course; count: number; records: AttendanceRecord[]; rejections: Rejection[] }>(
      `/api/admin/attendance/${enc(courseId)}`,
    ),
  attendanceStreamUrl: (courseId: string) => `${API_BASE}/api/admin/attendance/${enc(courseId)}/stream`,

  // Student
  lookupStudent: (indexNumber: string) =>
    request<{ student: Student }>('/api/student/lookup', { method: 'POST', body: { indexNumber } }).then((r) => r.student),
  /** Trade the rotating code from the projector for a check-in ticket. */
  startCheckIn: (courseId: string, code: string) =>
    request<CheckInTicket>('/api/attendance/start', { method: 'POST', body: { courseId, code } }),
  checkLocation: (input: { courseId: string; ticket: string | null; indexNumber: string; location: GeoPoint }) =>
    request<{ location: { distanceMeters: number; accuracyMeters: number } | null }>('/api/attendance/location-check', {
      method: 'POST',
      body: input,
    }).then((r) => r.location),
  verifyAttendance: (input: VerifyAttendanceInput) =>
    request<{ record: AttendanceRecord }>('/api/attendance/verify', { method: 'POST', body: input }).then((r) => r.record),

  /** Server-relative asset paths (e.g. selfieImageUrl) → absolute when the API is on another origin. */
  assetUrl: (path: string) => (path.startsWith('/') ? `${API_BASE}${path}` : path),
};

export function errorMessage(err: unknown): string {
  // fetch() rejects with a TypeError when the API can't be reached at all. On a LAN demo that
  // almost always means the backend isn't running or the phone is on another network, not "no internet".
  if (err instanceof TypeError) return SERVER_UNREACHABLE;
  return err instanceof Error ? err.message : 'Something went wrong.';
}
