import { WorkingCalendar } from '../types';

/**
 * Format ISO date string (YYYY-MM-DD) to Indian date format (DD-MM-YYYY)
 */
export function formatIndianDate(dateStr?: string | null): string {
  if (!dateStr) return '--';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
}

/**
 * Parse Indian date (DD-MM-YYYY) or standard date to ISO string (YYYY-MM-DD)
 */
export function parseToIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    // Check if DD-MM-YYYY
    if (parts[0].length <= 2 && parts[2]?.length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return trimmed.split('T')[0];
}

/**
 * Check if a given Date is a working day based on project calendar
 */
export function isWorkingDay(date: Date, calendar: WorkingCalendar): boolean {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  
  if (day === 0 && !calendar.workSunday) return false;
  if (day === 6 && !calendar.workSaturday && calendar.workingDaysPerWeek === 5) return false;
  
  const iso = date.toISOString().split('T')[0];
  if (calendar.holidays && calendar.holidays.includes(iso)) {
    return false;
  }
  return true;
}

/**
 * Move date forward to the next working day if it falls on a non-working day
 */
export function ensureWorkingDay(dateStr: string, calendar: WorkingCalendar): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  while (!isWorkingDay(d, calendar)) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Add working days to a start date.
 * If workingDays is 1, return the same day (if working day).
 * If workingDays > 1, add (workingDays - 1) additional working days.
 */
export function addWorkingDays(startDateStr: string, workingDays: number, calendar: WorkingCalendar): string {
  if (!startDateStr || workingDays <= 0) return startDateStr;
  const d = new Date(startDateStr + 'T00:00:00');
  
  // ensure start is a working day
  while (!isWorkingDay(d, calendar)) {
    d.setDate(d.getDate() + 1);
  }

  let daysRemaining = Math.max(0, workingDays - 1);
  while (daysRemaining > 0) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d, calendar)) {
      daysRemaining--;
    }
  }
  return d.toISOString().split('T')[0];
}

/**
 * Subtract working days from a finish date to get start date.
 */
export function subtractWorkingDays(finishDateStr: string, workingDays: number, calendar: WorkingCalendar): string {
  if (!finishDateStr || workingDays <= 0) return finishDateStr;
  const d = new Date(finishDateStr + 'T00:00:00');
  
  while (!isWorkingDay(d, calendar)) {
    d.setDate(d.getDate() - 1);
  }

  let daysRemaining = Math.max(0, workingDays - 1);
  while (daysRemaining > 0) {
    d.setDate(d.getDate() - 1);
    if (isWorkingDay(d, calendar)) {
      daysRemaining--;
    }
  }
  return d.toISOString().split('T')[0];
}

/**
 * Next working day after given date
 */
export function getNextWorkingDay(dateStr: string, calendar: WorkingCalendar): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (!isWorkingDay(d, calendar)) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Previous working day before given date
 */
export function getPreviousWorkingDay(dateStr: string, calendar: WorkingCalendar): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  while (!isWorkingDay(d, calendar)) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Calculate count of working days between two dates inclusive
 */
export function countWorkingDaysBetween(startDateStr: string, finishDateStr: string, calendar: WorkingCalendar): number {
  if (!startDateStr || !finishDateStr) return 0;
  let start = new Date(startDateStr + 'T00:00:00');
  let finish = new Date(finishDateStr + 'T00:00:00');
  
  if (start > finish) {
    // negative
    return -countWorkingDaysBetween(finishDateStr, startDateStr, calendar);
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= finish) {
    if (isWorkingDay(cur, calendar)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Calculate difference in calendar days
 */
export function calendarDaysBetween(dateStrA: string, dateStrB: string): number {
  const a = new Date(dateStrA + 'T00:00:00');
  const b = new Date(dateStrB + 'T00:00:00');
  const diffTime = b.getTime() - a.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
