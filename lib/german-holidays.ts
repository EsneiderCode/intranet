export interface GermanHolidayDef {
  name: string;
  date: Date;
  /** Empty = national (all states). Non-empty = only these states. */
  states: string[];
}

function addDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)
  );
}

/**
 * Calculates Easter Sunday for a given year (Anonymous Gregorian algorithm).
 */
export function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calculates Buß- und Bettag: the Wednesday before November 23.
 * Only applies to Sachsen.
 */
function calculateBusstag(year: number): Date {
  const nov23 = new Date(Date.UTC(year, 10, 23));
  const dow = nov23.getUTCDay(); // 0=Sun … 6=Sat
  let daysBack = (dow - 3 + 7) % 7; // days back to reach Wednesday
  if (daysBack === 0) daysBack = 7;  // if Nov 23 is already Wed, go back a full week
  return new Date(Date.UTC(year, 10, 23 - daysBack));
}

/**
 * Returns all German public holidays for a given year.
 *
 * Each entry has a `states` array:
 *   - `[]`           → national holiday (applies to every state)
 *   - `["Bayern", …]` → only these states
 */
export function getGermanHolidays(year: number): GermanHolidayDef[] {
  const easter = calculateEaster(year);

  return [
    // ── National — fixed dates ─────────────────────────────────────────────
    { name: "Neujahr",                    date: new Date(Date.UTC(year, 0, 1)),  states: [] },
    { name: "Tag der Arbeit",             date: new Date(Date.UTC(year, 4, 1)),  states: [] },
    { name: "Tag der deutschen Einheit",  date: new Date(Date.UTC(year, 9, 3)),  states: [] },
    { name: "1. Weihnachtstag",           date: new Date(Date.UTC(year, 11, 25)), states: [] },
    { name: "2. Weihnachtstag",           date: new Date(Date.UTC(year, 11, 26)), states: [] },

    // ── National — Easter-based ────────────────────────────────────────────
    { name: "Karfreitag",         date: addDays(easter, -2), states: [] },
    { name: "Ostermontag",        date: addDays(easter,  1), states: [] },
    { name: "Christi Himmelfahrt",date: addDays(easter, 39), states: [] },
    { name: "Pfingstmontag",      date: addDays(easter, 50), states: [] },

    // ── State-specific ─────────────────────────────────────────────────────
    {
      name: "Heilige Drei Könige",
      date: new Date(Date.UTC(year, 0, 6)),
      states: ["Baden-Württemberg", "Bayern", "Sachsen-Anhalt"],
    },
    {
      name: "Internationaler Frauentag",
      date: new Date(Date.UTC(year, 2, 8)),
      states: ["Berlin", "Mecklenburg-Vorpommern"],
    },
    {
      name: "Ostersonntag",
      date: easter,
      states: ["Brandenburg", "Sachsen"],
    },
    {
      name: "Pfingstsonntag",
      date: addDays(easter, 49),
      states: ["Brandenburg"],
    },
    {
      name: "Fronleichnam",
      date: addDays(easter, 60),
      states: [
        "Baden-Württemberg",
        "Bayern",
        "Hessen",
        "Nordrhein-Westfalen",
        "Rheinland-Pfalz",
        "Saarland",
      ],
    },
    {
      name: "Mariä Himmelfahrt",
      date: new Date(Date.UTC(year, 7, 15)),
      states: ["Bayern", "Saarland"],
    },
    {
      name: "Weltkindertag",
      date: new Date(Date.UTC(year, 8, 20)),
      states: ["Thüringen"],
    },
    {
      name: "Reformationstag",
      date: new Date(Date.UTC(year, 9, 31)),
      states: [
        "Brandenburg",
        "Bremen",
        "Hamburg",
        "Mecklenburg-Vorpommern",
        "Niedersachsen",
        "Sachsen",
        "Sachsen-Anhalt",
        "Schleswig-Holstein",
        "Thüringen",
      ],
    },
    {
      name: "Allerheiligen",
      date: new Date(Date.UTC(year, 10, 1)),
      states: [
        "Baden-Württemberg",
        "Bayern",
        "Nordrhein-Westfalen",
        "Rheinland-Pfalz",
        "Saarland",
      ],
    },
    {
      name: "Buß- und Bettag",
      date: calculateBusstag(year),
      states: ["Sachsen"],
    },
  ];
}
