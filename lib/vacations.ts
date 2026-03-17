/**
 * Converts a Date to "YYYY-MM-DD" string using UTC values.
 */
function toUTCDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates the number of working days between two dates (inclusive),
 * excluding weekends (Sat/Sun) and the provided holiday dates.
 * The holidays array should contain dates assigned specifically to the user.
 */
export function calculateWorkingDays(
  start: Date,
  end: Date,
  holidays: Date[]
): number {
  const holidaySet = new Set(holidays.map((h) => toUTCDateStr(new Date(h))));

  let count = 0;
  const current = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const endUTC = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  );

  while (current <= endUTC) {
    const day = current.getUTCDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6 && !holidaySet.has(toUTCDateStr(current))) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

/**
 * Returns holidays that fall within [startStr, endStr] inclusive.
 * Date comparison is done as "YYYY-MM-DD" strings (lexicographic).
 */
export function getHolidaysInRange<T extends { date: string }>(
  startStr: string,
  endStr: string,
  holidays: T[]
): T[] {
  return holidays.filter((h) => {
    const d = h.date.slice(0, 10);
    return d >= startStr && d <= endStr;
  });
}

/**
 * Calculates vacation day statistics for a user.
 */
export function calcVacationStats(
  requests: { workingDaysRequested: number; status: string }[],
  totalDays: number
): { total: number; used: number; pending: number; remaining: number } {
  const used = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.workingDaysRequested, 0);
  const pending = requests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.workingDaysRequested, 0);
  const remaining = totalDays - used;
  return { total: totalDays, used, pending, remaining };
}
