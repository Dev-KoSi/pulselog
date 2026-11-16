import { api } from '../api/client';
import type { AttendanceRecord, Course } from '../types';
import { toCsv } from './csv';
import { formatExact } from './format';

const CAPTURE_LABELS: Record<string, string> = {
  camera: 'Live camera',
  upload: 'Camera app / upload',
  'demo-avatar': 'Demo avatar (test only)',
};

/** Attendance report for one course session, oldest check-in first. */
export function buildAttendanceCsv(course: Course, records: AttendanceRecord[]) {
  const header = [
    'No.',
    'Index Number',
    'Full Name',
    'Program',
    'Group',
    'Course Code',
    'Course Title',
    'Lecturer',
    'Lecture Date',
    'Check-in Timestamp',
    'Check-in Timestamp (ISO 8601)',
    'Verification Status',
    'Face Match (%)',
    'Selfie Capture',
    'Distance from Lecturer (m)',
    'Location Accuracy (m)',
    'Selfie Image URL',
  ];

  const rows = [...records]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((r, i) => [
      i + 1,
      r.indexNumber,
      r.studentName,
      r.program,
      r.group,
      course.courseCode,
      course.courseTitle,
      course.lecturerName,
      course.date,
      formatExact(r.timestamp),
      r.timestamp,
      r.verificationStatus,
      Math.round(r.confidence * 100),
      CAPTURE_LABELS[r.captureMethod] ?? r.captureMethod,
      r.location ? r.location.distanceMeters : 'No location lock',
      r.location ? r.location.accuracyMeters : '',
      new URL(api.assetUrl(r.selfieImageUrl), window.location.origin).href,
    ]);

  const filename = `${course.courseCode.replace(/[^A-Za-z0-9]+/g, '')}_${course.date}_attendance.csv`;
  return { filename, csv: toCsv([header, ...rows]) };
}
