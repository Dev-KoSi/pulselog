import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AttendanceRecord, Rejection } from '../types';

const addUnique = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list : [...list, item]);

/**
 * Live activity for a course session via Server-Sent Events (auto-reconnects):
 * verified check-ins, and attempts blocked by the location lock.
 */
export function useAttendanceStream(courseId: string | undefined) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    // Switching courses: drop the previous course's rows until the new snapshot arrives.
    setRecords([]);
    setRejections([]);
    setConnected(false);
    const source = new EventSource(api.attendanceStreamUrl(courseId));

    source.addEventListener('open', () => setConnected(true));
    source.addEventListener('error', () => setConnected(false));
    // Snapshots are sent on every (re)connect, so they replace local state.
    source.addEventListener('snapshot', (event) => setRecords(JSON.parse(event.data)));
    source.addEventListener('rejections', (event) => setRejections(JSON.parse(event.data)));
    source.addEventListener('checkin', (event) => setRecords((prev) => addUnique(prev, JSON.parse(event.data))));
    source.addEventListener('rejection', (event) => setRejections((prev) => addUnique(prev, JSON.parse(event.data))));

    return () => source.close();
  }, [courseId]);

  return { records, rejections, connected };
}
