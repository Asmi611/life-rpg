"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

// Real reward overlay per Phase 8 — driven entirely by the response shape of
// POST /api/quests/:id/complete (docs/02_API_CONTRACT.md): rewards.xp/coins/gems,
// character.level, character.leveledUp, character.currentStreak,
// character.villageTierChanged. Nothing here is computed client-side.
export default function RewardOverlay({ rewards, character, onDismiss }) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" || e.key === "Enter") onDismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const popIn = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, scale: 0.7 },
        animate: { opacity: 1, scale: 1 },
        transition: { type: "spring", stiffness: 300, damping: 15 },
      };

  const barTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 1, delay: 0.4, ease: "easeOut" };

  const announcement = [
    `Quest complete. Gained ${rewards.xp} XP, ${rewards.coins} coins${
      rewards.gems ? `, ${rewards.gems} gems` : ""
    }.`,
    character.leveledUp ? `Leveled up to level ${character.level}!` : "",
    character.villageTierChanged
      ? `Village tier changed to ${character.villageTier}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quest rewards"
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <motion.div
        {...popIn}
        className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-4 text-center shadow-[0_0_32px_rgba(242,184,75,0.5)]"
      >
        <p className="rounded-pill border-2 border-coin-gold bg-black px-4 py-1 text-xs text-coin-gold">
          ◈ QUEST COMPLETE ◈
        </p>

        {/* Reward pop-in row */}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-parchment">
          <span className="rounded-pill border border-xp-amber bg-xp-amber/20 px-3 py-1 text-xp-amber">
            +{rewards.xp} XP
          </span>
          <span className="rounded-pill border border-coin-gold bg-coin-gold/20 px-3 py-1 text-coin-gold">
            +{rewards.coins} ◉
          </span>
          {rewards.gems > 0 && (
            <span className="rounded-pill border border-gem-violet bg-gem-violet/20 text-gem-violet px-3 py-1">
              +{rewards.gems} ◈
            </span>
          )}
        </div>

        {/* Level-up celebration */}
        {character.leveledUp && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0.2 : 0.6 }}
            className="mt-4 rounded-card border-2 border-xp-amber bg-xp-amber/10 p-3"
          >
            <p className="text-base text-xp-amber [text-shadow:2px_2px_0_#7a4a12]">
              ★ LEVEL UP! ★
            </p>
            <p className="mt-1 text-xs text-parchment">Now level {character.level}</p>
          </motion.div>
        )}

        {/* Village tier change celebration */}
        {character.villageTierChanged && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: prefersReducedMotion ? 0 : character.leveledUp ? 1.1 : 0.5,
              duration: prefersReducedMotion ? 0.2 : 0.6,
            }}
            className="mt-3 rounded-card border-2 border-gem-violet bg-gem-violet/10 p-3"
          >
            <p className="text-sm text-gem-violet">
              ▲ VILLAGE TIER {character.villageTier}
            </p>
          </motion.div>
        )}

        {/* Streak */}
        <p className="mt-4 text-xs text-coin-gold">
          🔥 STREAK: {character.currentStreak} DAYS
        </p>

        <motion.div
          className="mt-3 h-2 overflow-hidden rounded-avatar border border-coin-gold/50 bg-dusk"
          aria-hidden="true"
        >
          <motion.div
            className="h-full bg-xp-amber"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(100, Math.round((character.totalXP / character.xpForNextLevel) * 100))}%` }}
            transition={barTransition}
          />
        </motion.div>

        <button
          type="button"
          autoFocus
          onClick={onDismiss}
          className="mt-5 min-h-11 w-full rounded-card border-2 border-black bg-gradient-to-b from-xp-amber to-coin-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment active:scale-95"
        >
          ▶ CONTINUE
        </button>
      </motion.div>
    </div>
  );
}
