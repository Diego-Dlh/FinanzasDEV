// Date conventions for the whole app (server and browser):
//
// - Transaction dates (incomes, expenses, purchases, payments, due dates) are
//   calendar dates. They are sent as 'YYYY-MM-DD' and stored as UTC midnight,
//   so they must be read and displayed in UTC — never in local time, which in
//   Colombia (UTC-5) shows the previous day.
// - "Today" and "this month" are the user's calendar, always computed in
//   APP_TIME_ZONE, independent of the server or container time zone.

export const APP_TIME_ZONE = 'America/Bogota';

const DAY_MS = 86_400_000;

const ymdInAppTz = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Today's calendar date in Colombia, as 'YYYY-MM-DD'. */
export function todayISO(now: Date = new Date()): string {
  return ymdInAppTz.format(now);
}

/** Current month in Colombia, as 'YYYY-MM'. */
export function currentMonthISO(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** 'YYYY-MM-DD' → stored representation (UTC midnight). */
export function dateOnlyToUTC(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Stored calendar date → 'YYYY-MM-DD' (for date inputs). */
export function toDateInput(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Adds days to a 'YYYY-MM-DD' date. */
export function addDaysISO(ymd: string, days: number): string {
  return new Date(dateOnlyToUTC(ymd).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Adds months to a 'YYYY-MM' month. */
export function addMonthsISO(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/** Stored range of a calendar month: [start, end) in UTC. */
export function monthRangeUTC(ym: string): { start: Date; end: Date } {
  return { start: dateOnlyToUTC(`${ym}-01`), end: dateOnlyToUTC(`${addMonthsISO(ym, 1)}-01`) };
}

/** Start of the current month in Colombia, as an instant (for real timestamps like createdAt). */
export function startOfCurrentMonthInstant(now: Date = new Date()): Date {
  // Colombia has no DST: local midnight is always 05:00 UTC
  return new Date(`${currentMonthISO(now)}-01T05:00:00.000Z`);
}

/** Formats a stored calendar date without shifting it to the browser's time zone. */
export function fmtDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  return new Date(value).toLocaleDateString('es-CO', { ...options, timeZone: 'UTC' });
}
