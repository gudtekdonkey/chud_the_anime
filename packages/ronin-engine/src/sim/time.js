// ---- Game time: one clock for everything, running in real time even while the game is closed (owner, 2026-09-26) ----
// The ledger counts whole game hours (L.hour). These constants are the one place to tune how fast the world lives.
// Proposed (owner to confirm): a game day is 40 real minutes, so a season (28 days) is under 19 real hours and a year under 3.2 real days:
// a man lives about 60 years, about half a real year, and a dynasty spans a long campaign of play.
export const TIME = {
  REAL_MS_PER_HOUR: 100_000,    // 100 real seconds per game hour: a day is 40 real minutes
  HOURS_PER_DAY: 24, DAYS_PER_SEASON: 28, SEASONS: ['spring', 'summer', 'autumn', 'winter'],
  DAWN: 5, DUSK: 19,             // night is DUSK..DAWN
};
export const HOURS_PER_SEASON = TIME.HOURS_PER_DAY * TIME.DAYS_PER_SEASON, HOURS_PER_YEAR = HOURS_PER_SEASON * TIME.SEASONS.length;
// the calendar for an hour count: { hour (0..23), day (since the world began), dayOfSeason (1..28), season, seasonIndex, year (1..), night }
export function calendar(h) {
  const day = Math.floor(h / TIME.HOURS_PER_DAY), hour = h % TIME.HOURS_PER_DAY, si = Math.floor(h / HOURS_PER_SEASON) % 4;
  return { h, hour, day, dayOfSeason: day % TIME.DAYS_PER_SEASON + 1, seasonIndex: si, season: TIME.SEASONS[si], year: Math.floor(h / HOURS_PER_YEAR) + 1,
    night: hour >= TIME.DUSK || hour < TIME.DAWN };
}
export const years = h => h / HOURS_PER_YEAR;
export const hoursFromYears = y => Math.round(y * HOURS_PER_YEAR);
