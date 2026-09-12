/**
 * Village tier computation for Life RPG.
 *
 * Pure function — no DB calls. villageTier is NEVER stored; it is
 * computed from currentStreak on every read.
 *
 * Tier thresholds:
 *   Tier 1: currentStreak 0–2 days
 *   Tier 2: currentStreak 3–6 days
 *   Tier 3: currentStreak 7+ days
 */

/**
 * Compute the village tier from a current streak count.
 *
 * @param {number} currentStreak - consecutive days active
 * @returns {number} 1, 2, or 3
 */
export function getVillageTier(currentStreak) {
  if (currentStreak >= 7) return 3;
  if (currentStreak >= 3) return 2;
  return 1;
}
