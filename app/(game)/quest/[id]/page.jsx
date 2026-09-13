"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mockQuests } from "@/lib/client/mockData";
import RewardOverlay from "@/components/ui/RewardOverlay";
import { useRequireAuth } from "@/lib/client/useRequireAuth";
import { apiFetch } from "@/lib/client/apiFetch";

// Phase 5 feature flag — flip to false once GET /api/quests, PATCH /api/quests/:id,
// and POST /api/quests/:id/complete are confirmed live. While true, this screen
// behaves exactly like the Phase 2 mock (local state only, no network calls).
const USE_MOCK_AUTH = false;


// Retro pixel quest screen — same intentional style exception (dark bg, gold pixel
// frame, violet inner accents per the reference art). Mock data only, no API yet.
const SHARED_BUTTON =
  "min-h-11 flex-1 rounded-card border-2 px-4 py-3 font-pixel text-xs uppercase tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95";
const PRIMARY = `${SHARED_BUTTON} border-black bg-gradient-to-b from-xp-amber to-coin-gold text-black shadow-[0_0_0_2px_rgba(217,164,65,0.6)] hover:brightness-105`;
const SECONDARY = `${SHARED_BUTTON} border-coin-gold bg-black text-xp-amber hover:bg-dusk`;
const LOCKED = (bright) =>
  `${SHARED_BUTTON} cursor-not-allowed ${
    bright
      ? "border-discipline-sage bg-discipline-sage/30 text-discipline-sage"
      : "border-discipline-sage/50 bg-discipline-sage/10 text-discipline-sage/80"
  }`;

// The contract's description for NPC quests is already a full sentence ("The Librarian
// wants you to read."), so only add the "[npc] wants you to" prefix when it's missing.
function buildQuote(quest) {
  if (!quest.description) {
    return `\u201C${quest.title}\u201D`;
  }
  const desc = quest.description.replace(/\.$/, "");
  if (!quest.npcName || desc.toLowerCase().includes(quest.npcName.toLowerCase())) {
    return `\u201C${desc}.\u201D`;
  }
  return `\u201C${quest.npcName} wants you to ${desc}.\u201D`;
}

export default function ActiveQuest() {
  useRequireAuth();

  const { id } = useParams();
  const router = useRouter();
  const [reward, setReward] = useState(null); // { rewards, character } from complete response
  const [quest, setQuest] = useState(() =>
    USE_MOCK_AUTH ? mockQuests.find((q) => q.id === id) ?? null : null
  );
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map the contract's persisted status to this screen's three UI states.
  const state =
    quest?.status === "completed"
      ? "COMPLETED"
      : quest?.status === "accepted"
        ? "STARTED"
        : "NOT_STARTED";

  useEffect(() => {
    if (USE_MOCK_AUTH) return;
    let cancelled = false;

    async function loadQuest() {
      setLoading(true);
      setLoadError("");
      try {
        // No GET /api/quests/:id in the contract — fetch the list and find it.
        const res = await apiFetch("/api/quests");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load quest");
        const found = data.quests.find((q) => q.id === id);
        if (!cancelled) setQuest(found ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuest();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleStart() {
    if (USE_MOCK_AUTH) {
      setQuest((q) => ({ ...q, status: "accepted" }));
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await apiFetch(`/api/quests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start quest");
      setQuest((q) => ({ ...q, status: "accepted" }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStop() {
    // No "revert to available" endpoint in the contract — local-only, matches
    // the Phase 2 mock's stop behavior.
    setQuest((q) => ({ ...q, status: "available" }));
  }

  async function handleComplete() {
    if (USE_MOCK_AUTH) {
      setQuest((q) => ({ ...q, status: "completed" }));
      // Mock reward preview so the overlay is testable before the backend flag flips.
      setReward({
        rewards: { xp: quest.rewardXP, coins: quest.rewardCoins, gems: quest.rewardGems },
        character: {
          level: 4,
          totalXP: 1280 + quest.rewardXP,
          xpForNextLevel: 1600,
          leveledUp: false,
          currentStreak: 3,
          villageTier: 2,
          villageTierChanged: false,
        },
      });
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      const res = await apiFetch(`/api/quests/${id}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to complete quest");
      setQuest((q) => ({ ...q, status: "completed" }));
      setReward({ rewards: data.rewards, character: data.character });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-4 font-pixel text-parchment">
        <p className="text-xs text-coin-gold">LOADING QUEST…</p>
      </main>
    );
  }

  if (loadError || !quest) {
    return (
      <main  id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-4 font-pixel text-parchment">
        <div className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-6 text-center">
          <h1 className="text-lg text-xp-amber">QUEST NOT FOUND</h1>
          <p className="mt-2 text-xs text-parchment/70">
            {loadError || `No quest with id "${id}" exists in the quest log.`}
          </p>
          <Link
            href="/village"
            className="mt-4 inline-block rounded-card border-2 border-coin-gold bg-black px-6 py-3 text-xs text-xp-amber transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber"
          >
            ← BACK TO VILLAGE
          </Link>
        </div>
      </main>
    );
  }

  const completed = state === "COMPLETED";

  return (
       <main id="main-content" className="relative flex min-h-dvh flex-col items-center gap-2 overflow-hidden bg-black px-4 py-6 font-pixel text-parchment">
      <Link
        href="/village"
        aria-label="Back to village"
        className="fixed left-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-card border-2 border-coin-gold bg-black text-lg text-xp-amber shadow-[0_0_0_2px_rgba(0,0,0,0.6)] transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
      >
        ←
      </Link>
      <p className="rounded-pill border-2 border-coin-gold bg-black px-4 py-1 text-xs text-coin-gold">
        ◈ QUEST LOG #01 ◈
      </p>
      <p aria-live="polite" className="text-xs text-coin-gold">
        {completed ? "- QUEST COMPLETE -" : "- ACTIVE OBJECTIVE -"}
      </p>

      <section
        aria-label={`Quest: ${quest.title}`}
        className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-2 shadow-[0_0_24px_rgba(242,184,75,0.35)] md:max-w-112"
      >
        <div className="flex flex-col gap-4 rounded-card border-2 border-coin-gold/60 bg-dusk p-3 sm:p-4">
          <div className="flex flex-col gap-3 rounded-card border border-gem-violet/50 bg-dusk/60 p-3 text-center">
            <h1 className="text-lg leading-tight text-xp-amber [text-shadow:2px_2px_0_#7a4a12] md:text-xl">
              {quest.title.toUpperCase()}
            </h1>
            <p className="mx-auto w-fit rounded-pill border border-gem-violet bg-gem-violet/25 px-3 py-1 text-xs text-parchment">
              ◆ {quest.category.toUpperCase()}
            </p>
            <blockquote className="rounded-card border border-gem-violet/50 bg-black/50 p-3 text-sm leading-relaxed text-parchment">
              {buildQuote(quest)}
            </blockquote>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {completed ? (
              <>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label="Quest started"
                  className={LOCKED(false)}
                >
                  ✓ STARTED
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label="Quest completed"
                  className={LOCKED(true)}
                >
                  ✓ COMPLETED
                </button>
              </>
            ) : state === "NOT_STARTED" ? (
              <>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className={`${PRIMARY} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmitting ? "STARTING…" : "▶ START"}
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className={`${SECONDARY} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  ✓ MARK COMPLETE
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={isSubmitting}
                  className={`${SECONDARY} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  ■ STOP QUEST
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className={`${PRIMARY} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmitting ? "COMPLETING…" : "✓ MARK COMPLETE"}
                </button>
              </>
            )}
          </div>
          {actionError && (
            <p role="alert" className="text-center text-xs text-rust">
              {actionError}
            </p>
          )}
        </div>
      </section>

      <footer
        aria-hidden="true"
        className="mt-auto pt-4 text-center text-xs leading-relaxed text-white/40"
      >
        <span className="whitespace-nowrap">© 199X RETRO QUEST CORP.</span>
        <span className="whitespace-nowrap"> · LIFE RPG</span>
      </footer>

      {reward && (
        <RewardOverlay
          rewards={reward.rewards}
          character={reward.character}
          onDismiss={() => router.push("/village")}
        />
      )}
    </main>
  );
}
