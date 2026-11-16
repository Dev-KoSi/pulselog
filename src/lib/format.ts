const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const exactFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const secondsFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
/** "Wed, 11 Nov 2026, 05:12:43" (exact check-in time, to the second). */
export const formatExact = (iso: string) => exactFormat.format(new Date(iso));
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
/** Local calendar date of an ISO timestamp, e.g. "11 Nov 2026". */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
/** "05:12:43" */
export const formatTimeWithSeconds = (iso: string) => secondsFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
/** "2026-11-11" → "Wed, Nov 11" (parsed as a local date, not UTC). */
export const formatDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;
