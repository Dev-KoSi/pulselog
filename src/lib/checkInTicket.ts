import type { CheckInTicket } from '../types';

// Per-tab storage: a refresh mid check-in keeps the ticket, but it isn't shared with other tabs/devices.
const key = (courseId: string) => `pulselog:ticket:${courseId}`;

/** A still-valid ticket for this course, or null. */
export function loadTicket(courseId: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(courseId)) ?? 'null') as CheckInTicket | null;
    if (saved?.ticket && saved.expiresAt && Date.parse(saved.expiresAt) > Date.now() + 5_000) return saved.ticket;
  } catch {
    // storage blocked / corrupt: just ask for the code again
  }
  return null;
}

export function saveTicket(courseId: string, ticket: CheckInTicket) {
  try {
    sessionStorage.setItem(key(courseId), JSON.stringify(ticket));
  } catch {
    // fine: the ticket still lives in component state
  }
}

export function clearTicket(courseId: string) {
  try {
    sessionStorage.removeItem(key(courseId));
  } catch {
    // ignore
  }
}

export const isTicketError = (code: string | undefined) => code === 'TICKET_EXPIRED' || code === 'TICKET_INVALID';
