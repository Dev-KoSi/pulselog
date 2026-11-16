export type CourseStatus = 'active' | 'expired' | 'closed';

/** A lecture session students check in to. */
export interface Course {
  id: string;
  courseCode: string;
  courseTitle: string;
  lecturerName: string;
  /** YYYY-MM-DD */
  date: string;
  /** Unique, human-friendly token in the check-in URL, e.g. "PSY241-7KQ2X". */
  routeToken: string;
  checkInPath: string;
  checkInUrl: string;
  durationMinutes: number;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  status: CourseStatus;
  attendanceCount: number;
  /** QR code rotates every 30 s; students need a fresh code (or ticket) to check in. */
  liveCode: boolean;
  /** Check-in only works near the lecturer's pinned location. Coordinates stay on the server. */
  locationLock: LocationLock | null;
}

export interface LocationLock {
  radiusMeters: number;
  /** How precise the lecturer's own fix was when the lock was set. */
  accuracyMeters: number;
  setAt: string;
}

/** A device position from the browser Geolocation API. */
export interface GeoPoint {
  lat: number;
  lng: number;
  /** metres (68% confidence radius) */
  accuracy: number;
}

export const RADIUS_OPTIONS = [50, 100, 200] as const;
export type RadiusMeters = (typeof RADIUS_OPTIONS)[number];

export interface NewCourseInput {
  courseCode: string;
  courseTitle: string;
  lecturerName: string;
  date?: string;
  durationMinutes?: number;
  /** Lecturer's position; turns on the location lock. */
  location?: GeoPoint;
  radiusMeters?: RadiusMeters;
}

export interface Student {
  indexNumber: string;
  name: string;
  program: string;
  group: number;
}

/** How the selfie was taken: live in-page camera, phone camera app / upload, or the demo avatar. */
export type CaptureMethod = 'camera' | 'upload' | 'demo-avatar';

export interface AttendanceRecord {
  id: string;
  courseId: string;
  courseCode: string;
  indexNumber: string;
  studentName: string;
  program: string;
  group: number;
  timestamp: string;
  selfieImageUrl: string;
  verificationStatus: 'VERIFIED';
  confidence: number;
  captureMethod: CaptureMethod | 'unknown';
  /** Distance from the lecturer's pinned location; null/absent without a location lock. */
  location?: { distanceMeters: number; accuracyMeters: number } | null;
}

/** A check-in blocked because the phone was outside the lecture area. */
export interface Rejection {
  id: string;
  courseId: string;
  indexNumber: string;
  studentName: string;
  group: number;
  timestamp: string;
  reason: 'OUTSIDE_AREA';
  distanceMeters: number;
  accuracyMeters: number;
  allowedMeters: number;
}

export interface LiveCode {
  /** null once the session is closed (or for sessions without rotating codes) */
  code: string | null;
  /** QR target, including ?t=<code> while the session is open */
  checkInUrl: string;
  expiresAt: string | null;
  windowSeconds: number | null;
  serverTime: string;
}

export interface CheckInTicket {
  ticket: string | null;
  expiresAt: string | null;
}

export interface QrPayload {
  checkInUrl: string;
  qrDataUrl: string;
}

export interface VerifyAttendanceInput {
  indexNumber: string;
  /** Course id or route token. */
  courseId: string;
  selfieImage: string;
  captureMethod?: CaptureMethod;
  ticket?: string | null;
  location?: GeoPoint | null;
}
