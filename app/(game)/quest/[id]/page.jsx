"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { mockQuests } from "@/lib/client/mockData";

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
  const desc = quest.description.replace(/\.$/, "");
  if (!quest.npcName || desc.toLowerCase().includes(quest.npcName.toLowerCase())) {
    return `\u201C${desc}.\u201D`;
  }
  return `\u201C${quest.npcName} wants you to ${desc}.\u201D`;
}

export default function ActiveQuest() {
  const { id } = useParams();
  const quest = mockQuests.find((q) => q.id === id);
  const [state, setState] = useState("NOT_STARTED");

  if (!quest) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-4 font-pixel text-parchment">
        <div className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-6 text-center">
          <h1 className="text-lg text-xp-amber">QUEST NOT FOUND</h1>
          <p className="mt-2 text-xs text-parchment/70">
            No quest with id &quot;{id}&quot; exists in the quest log.
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
       <main className="relative flex min-h-dvh flex-col items-center gap-2 overflow-hidden bg-black px-4 py-6 font-pixel text-parchment">
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
                <button type="button" onClick={() => setState("STARTED")} className={PRIMARY}>
                  ▶ START
                </button>
                <button
                  type="button"
                  onClick={() => setState("COMPLETED")}
                  className={SECONDARY}
                >
                  ✓ MARK COMPLETE
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setState("NOT_STARTED")}
                  className={SECONDARY}
                >
                  ■ STOP QUEST
                </button>
                <button
                  type="button"
                  onClick={() => setState("COMPLETED")}
                  className={PRIMARY}
                >
                  ✓ MARK COMPLETE
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer
        aria-hidden="true"
        className="mt-auto pt-4 text-center text-xs leading-relaxed text-white/40"
      >
        <span className="whitespace-nowrap">© 199X RETRO QUEST CORP.</span>
        <span className="whitespace-nowrap"> · LIFE RPG</span>
      </footer>
    </main>
  );
}
