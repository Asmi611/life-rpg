/**
 * XP curve helpers for Life RPG.
 *
 * Pure functions — no DB calls. Used by the character and quest-completion
 * routes to compute level and XP-to-next-level from stored totalXP.
 *
 * Formula: XP required for level N = round(400 * N^1.5)
 * This makes each level meaningfully harder than the last.
 */

/**
 * Return the total XP required to reach `level` from level 1.
 * Level 1 costs 0 XP (you start there). Level 2 costs round(400 * 2^1.5), etc.
 */
export function getXpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(400 * Math.pow(level, 1.5));
}

/**
 * Given a totalXP value, return the current level and the XP remaining
 * to reach the next level.
 *
 * @param {number} totalXP
 * @returns {{ level: number, xpForNextLevel: number }}
 */
export function getLevelForTotalXp(totalXP) {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXP) {
    level++;
  }
  const xpForNextLevel = getXpForLevel(level + 1) - totalXP;
  return { level, xpForNextLevel };
}

/**
 * Return the XP required to reach the NEXT level from the current level.
 * This is the value the API contract calls "xpForNextLevel" — the XP still
 * needed, not the cumulative total for that level.
 *
 * @param {number} currentLevel
 * @param {number} totalXP
 * @returns {number}
 */
export function getXpForNextLevel(currentLevel, totalXP) {
  return getXpForLevel(currentLevel + 1) - totalXP;
}
