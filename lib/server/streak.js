/**
 * Streak computation helpers for Life RPG quest completions.
 *
 * Pure functions — no DB calls. Used by the quest-completion route to
 * decide how the user's currentStreak / longestStreak / lastActiveDate
 * should change after a completion, using only the server's clock.
 */

/**
 * Compute the new streak values after a quest completion.
 *
 * Rules (all compared as calendar dates, server time, UTC):
 *  - lastActiveDate is null          → currentStreak = 1
 *  - lastActiveDate is today         → currentStreak unchanged (don't double-count)
 *  - lastActiveDate is yesterday     → currentStreak += 1
 *  - lastActiveDate is 2+ days ago  → currentStreak = 1 (streak broken, restart)
 *
 * longestStreak = max(longestStreak, newCurrentStreak).
 * lastActiveDate is always set to today (server date) on a completion.
 *
 * Everything is computed in UTC so the result is identical regardless of the
 * Node process's local timezone (local dev machine or Vercel).
 *
 * @param {Date|string|null} lastActiveDate - stored date (or null) from the Character row
 * @param {number} currentStreak
 * @param {number} longestStreak
 * @param {Date} serverNow - the server's current instant (new Date() inside the route)
 * @returns {{ currentStreak: number, longestStreak: number, lastActiveDate: string }}
 *   lastActiveDate is returned as an ISO date string (YYYY-MM-DD) suitable for a Postgres `date` column.
 */
export function computeStreakUpdate(lastActiveDate, currentStreak, longestStreak, serverNow) {
  // Build "today at midnight" in UTC.
  const todayUTC = Date.UTC(
    serverNow.getUTCFullYear(),
    serverNow.getUTCMonth(),
    serverNow.getUTCDate()
  );

  // Format the returned ISO date string (YYYY-MM-DD) manually from UTC values
  // so we never round-trip through toISOString() on a locally-constructed Date
  // (which would shift by one day in timezones ahead of UTC).
  const yy = serverNow.getUTCFullYear();
  const mm = String(serverNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(serverNow.getUTCDate()).padStart(2, "0");
  const todayStr = `${yy}-${mm}-${dd}`;

  // Parse lastActiveDate into a UTC midnight instant for comparison.
  let lastUTC = null;
  if (lastActiveDate != null) {
    // Accept JS Date objects or ISO date strings like "2026-09-11".
    const d = new Date(lastActiveDate);
    if (!isNaN(d.getTime())) {
      lastUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  const MS_PER_DAY = 86_400_000;
  let newStreak;

  if (lastUTC === null) {
    // First ever completion.
    newStreak = 1;
  } else {
    const diffDays = Math.round((todayUTC - lastUTC) / MS_PER_DAY);
    if (diffDays === 0) {
      // Already active today — don't double-count the streak.
      newStreak = currentStreak;
    } else if (diffDays === 1) {
      // Yesterday — streak continues.
      newStreak = currentStreak + 1;
    } else {
      // 2+ days gap — streak broken, restart at 1.
      newStreak = 1;
    }
  }

  const newLongestStreak = Math.max(longestStreak, newStreak);

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    lastActiveDate: todayStr,
  };
}
