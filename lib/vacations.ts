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
 *
 * - requests: only APPROVED/PENDING requests for the CURRENT year (filtered by caller)
 * - vacationDaysPerYear: the annual allocation (e.g. 25)
 * - vacationDaysCarryOver: unused days accumulated from previous years
 *
 * Returns a breakdown separating current-year days from carry-over days.
 */
export function calcVacationStats(
  requests: { workingDaysRequested: number; status: string }[],
  vacationDaysPerYear: number,
  vacationDaysCarryOver: number
): {
  perYear: number;
  carryOver: number;
  usedThisYear: number;
  pendingThisYear: number;
  remainingThisYear: number;
  totalAvailable: number;
} {
  const usedThisYear = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.workingDaysRequested, 0);

  const pendingThisYear = requests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.workingDaysRequested, 0);

  const remainingThisYear = Math.max(0, vacationDaysPerYear - usedThisYear);
  const totalAvailable = remainingThisYear + vacationDaysCarryOver;

  return {
    perYear: vacationDaysPerYear,
    carryOver: vacationDaysCarryOver,
    usedThisYear,
    pendingThisYear,
    remainingThisYear,
    totalAvailable,
  };
}
