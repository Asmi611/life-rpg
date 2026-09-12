"use client";


import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { mockCharacter as c, mockQuests } from "@/lib/client/mockData";

// Retro pixel HUD — same intentional style exception as welcome/select-character
// (dark bar, gold pixel borders, pixel-font labels). Data is mock only.
const CHARACTERS = {
  "mage-scholar": {
    portrait: "/art/portrait-mage.png",
    className: "MAGE SCHOLAR",
    lore: "\u201CA skillful mage gaining ancient knowledge and mastery across the realms.\u201D",
  },
  wayfarer: {
    portrait: "/art/portrait-roamer.png",
    className: "SCHOLAR ROAMER",
    lore: "\u201CA wanderer venturing across different realms in search of destiny and glory.\u201D",
  },
};

// Character choice is written to sessionStorage by the select-character screen right
// before routing here. Read it as an external store (hydration-safe, no effect setState).
let cachedChoiceRaw;
let cachedChoice;
function readCharacterChoice() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("characterChoice");
    if (raw !== cachedChoiceRaw) {
      cachedChoiceRaw = raw;
      cachedChoice = raw ? JSON.parse(raw) : null;
    }
    return cachedChoice;
  } catch {
    return null;
  }
}
function subscribeToCharacterChoice() {
  // The choice doesn't change while this screen is open.
  return () => {};
}
const getServerCharacterChoice = () => null;

function Pill({ icon, iconAlt, value, label }) {
  return (
    <span
      title={label}
      className="flex items-center gap-1 rounded-pill border border-coin-gold/60 bg-black px-1.5 py-0.5 text-[10px] text-xp-amber sm:px-2 sm:py-1 sm:text-xs"
    >
      <Image src={icon} alt={iconAlt} width={16} height={16} className="h-4 w-4" />
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

const TIER_STAGES = ["I", "II", "III", "IV", "V", "VI"];
const RANKS = ["C", "C", "C", "B", "B", "A", "A", "S"];

// Two-page "Adventurer Record" book overlay (docs/references/profile.PNG).
// Mock-data driven; decorative strings mirror the reference's retro CRT framing.
function ProfileOverlay({ characterId, charName, onClose }) {
  const meta = CHARACTERS[characterId] ?? CHARACTERS.wayfarer;
  const rank = RANKS[Math.min(c.level, RANKS.length - 1)];
  const stage = TIER_STAGES[Math.min(Math.max(c.villageTier, 1), TIER_STAGES.length) - 1];
  const memId = `#${(String(c.id).replace(/\D/g, "") || "1").padStart(7, "0")}`;
  const bp = (c.totalXP * 2).toLocaleString("en-US");
  const xpPct = Math.min(100, Math.round((c.totalXP / c.xpForNextLevel) * 100));

  const attributes = [
    { label: "INTELLIGENCE (INT)", value: c.intelligence, bar: "bg-xp-amber" },
    { label: "STRENGTH (STR)", value: c.strength, bar: "bg-rust" },
    { label: "DISCIPLINE (DIS)", value: c.discipline, bar: "bg-sage" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adventurer record"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/95 px-2 py-3 sm:px-4 sm:py-5"
    >
      {/* CRT scanlines — part of this screen's sanctioned pixel-art style exception */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 opacity-15 [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,0.9)_2px_4px)]"
      />

      {/* Red ✕ close — top-right, exactly as in the reference */}
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="fixed right-2 top-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-black bg-rust font-pixel text-sm text-parchment shadow-[0_0_0_2px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment active:scale-95"
      >
        ✕
      </button>

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        {/* Overlay title strip */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-pixel text-[10px] text-coin-gold">
          <p>▚ LIFE RPG :: ADVENTURER RECORD // WORLD 01</p>
          <p className="flex items-center gap-3">
            <span className="tabular-nums">◉ {c.coins.toLocaleString("en-US")}</span>
            <span className="tabular-nums text-sky-300">◈ {c.gems}</span>
            <span className="hidden text-coin-gold/70 sm:inline">MEM ID: {memId}</span>
          </p>
        </div>

        {/* The book */}
        <div className="overflow-hidden rounded-card border-4 border-coin-gold bg-black shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_24px_rgba(242,184,75,0.25)]">
          <div className="grid md:grid-cols-2">
            {/* ——— PAGE 01 : identity card ——— */}
            <div className="flex flex-col border-b-2 border-coin-gold/40 p-4 md:border-b-0 md:border-r-2">
              <div className="rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                <div className="flex items-start justify-between font-pixel text-[10px]">
                  <span className="bg-rust px-2 py-1 text-parchment">BP {bp}</span>
                  <span className="bg-xp-amber px-2 py-1 text-black">RANK {rank}</span>
                </div>
                <div className="mt-3 border border-coin-gold/40 bg-black p-2">
                  <Image
                    src={meta.portrait}
                    alt={`${charName || c.name}'s full adventurer portrait`}
                    width={186}
                    height={232}
                    unoptimized
                    style={{ imageRendering: "pixelated" }}
                    className="mx-auto h-44 w-auto object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between font-pixel text-[10px]">
                  <span className="rounded-pill bg-dusk px-2 py-1 text-xp-amber tabular-nums">
                    ◉ {c.coins}
                  </span>
                  <span className="rounded-pill bg-dusk px-2 py-1 text-parchment">Lv. {c.level}</span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className="font-pixel text-base text-xp-amber sm:text-lg">
                  {(charName || c.name).toUpperCase()}
                  <span aria-hidden="true" className="ml-2 text-coin-gold/70">✎</span>
                </p>
                <p className="mt-1 font-pixel text-[10px] text-coin-gold">CLASS: {meta.className}</p>
                <p className="mt-2 inline-block rounded-pill bg-rust px-2 py-1 font-pixel text-[10px] text-parchment">
                  ▣ ORIGIN: WORLD 01 GUILD
                </p>
              </div>
              <p className="mt-auto pt-4 text-center font-pixel text-[10px] text-coin-gold/50">
                - PAGE 01 -
              </p>
            </div>

            {/* ——— PAGE 02 : stats ——— */}
            <div className="flex flex-col p-4">
              <div className="rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-sm text-parchment">
                    Level: <span className="text-xp-amber">{c.level}</span>
                  </p>
                  <p className="font-pixel text-[10px] text-coin-gold/70 tabular-nums">ID: {memId}</p>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={xpPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`XP progress: ${c.totalXP} of ${c.xpForNextLevel}`}
                  className="mt-2 h-3 overflow-hidden rounded-avatar border border-coin-gold/60 bg-black"
                >
                  <div className="h-full bg-xp-amber" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="mt-1 text-right font-pixel text-[10px] text-coin-gold tabular-nums">
                  {c.totalXP.toLocaleString("en-US")} / {c.xpForNextLevel.toLocaleString("en-US")} (XP)
                </p>
                <div className="mt-2 flex justify-between font-pixel text-[9px] text-coin-gold/70">
                  <span>ARENA RANK: GOLD III</span>
                  <span>GUILD: VALOR ARCHIVE</span>
                </div>
              </div>

              <div className="mt-3 rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-[10px] text-coin-gold">◈ CORE ATTRIBUTES</p>
                  <span className="bg-xp-amber px-2 py-0.5 font-pixel text-[9px] text-black">
                    TIER {c.villageTier} READY
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {attributes.map((a) => (
                    <div key={a.label}>
                      <p className="font-pixel text-[9px] text-coin-gold">{a.label}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          role="progressbar"
                          aria-valuenow={a.value}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${a.label}: ${a.value} of 100`}
                          className="h-2.5 flex-1 overflow-hidden rounded-avatar border border-coin-gold/40 bg-black"
                        >
                          <div className={`h-full ${a.bar}`} style={{ width: `${a.value}%` }} />
                        </div>
                        <span className="w-20 shrink-0 whitespace-nowrap text-right font-pixel text-[9px] text-parchment tabular-nums">
                          {a.value} / 100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                  <p className="font-pixel text-[9px] text-coin-gold">🔥 STREAK</p>
                  <p className="mt-1 font-pixel text-sm text-xp-amber tabular-nums">
                    {c.currentStreak} DAYS
                  </p>
                </div>
                <div className="rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                  <p className="font-pixel text-[9px] text-coin-gold">★ VILLAGE TIER</p>
                  <p className="mt-1 font-pixel text-sm text-xp-amber">STAGE {stage}</p>
                </div>
              </div>

              <div className="mt-3 rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-[10px] text-coin-gold">✦ PERSONAL MANIFESTO</p>
                  <span aria-hidden="true" className="font-pixel text-[9px] text-coin-gold/70">✎ EDIT</span>
                </div>
                <p className="mt-2 border border-coin-gold/30 bg-black/40 px-3 py-2 text-sm italic leading-relaxed text-parchment">
                  {meta.lore}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 font-pixel text-[10px] text-coin-gold/50">
                <span>RECORD: BLR-4091-OK</span>
                <span>- PAGE 02 -</span>
              </div>
            </div>
          </div>

          {/* Book footer */}
          <div className="flex items-center justify-between border-t-2 border-coin-gold/60 bg-dusk/70 px-3 py-2 font-pixel text-[10px] text-coin-gold">
            <span>LIFE RPG :: ADVENTURER REGISTRY DOSSIER</span>
            <span>ARCHIVE SYSTEM v1.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Village() {
  const choice = useSyncExternalStore(
    subscribeToCharacterChoice,
    readCharacterChoice,
    getServerCharacterChoice
  );
  const meta = CHARACTERS[choice?.characterId] ?? CHARACTERS.wayfarer;
  const charName = choice?.name ?? "";
  const [muted, setMuted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pct = Math.min(100, Math.round((c.totalXP / c.xpForNextLevel) * 100));

  // ESC closes the profile overlay.
  useEffect(() => {
    if (!profileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  return (
    <main className="min-h-dvh bg-parchment">
      {/* Pixel HUD bar — fixed to the top; the portrait itself opens the profile */}
      <header className="fixed inset-x-0 top-0 z-10 border-b-2 border-coin-gold bg-black">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-2 py-2 pt-1 md:flex-row md:items-center md:gap-3 md:px-4">
          {/* Row-priority group: portrait + level + XP (always the first row) */}
          <div className="flex min-w-0 items-center gap-2 md:flex-1 md:gap-3">
            <button
              type="button"
              aria-label="Open profile"
              title="Open profile"
              onClick={() => setProfileOpen(true)}
              className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-card border-2 border-coin-gold bg-dusk transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
            >
              <Image
                src={meta.portrait}
                alt={charName ? `${charName}'s character portrait` : "Selected character portrait"}
                width={46}
                height={46}
                className="h-full w-full object-cover"
              />
            </button>
            <span className="shrink-0 font-pixel text-sm text-xp-amber">Lv. {c.level}</span>

            <div className="min-w-0 flex-1">
              <p className="font-pixel text-xs text-coin-gold">XP PROGRESS</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`XP progress: ${c.totalXP} of ${c.xpForNextLevel}`}
                  className="h-3 min-w-16 flex-1 overflow-hidden rounded-avatar border border-coin-gold/60 bg-dusk"
                >
                  <div className="h-full bg-xp-amber" style={{ width: `${pct}%` }} />
                </div>
                <span className="self-end whitespace-nowrap font-pixel text-xs text-parchment/80 tabular-nums sm:self-auto">
                  {c.totalXP} / {c.xpForNextLevel} XP
                </span>
              </div>
            </div>
          </div>

          {/* Badges: sit below the priority row on small screens, inline from md up */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap md:justify-end md:shrink-0 md:gap-3">
            <Pill icon="/art/icon-coin.png" iconAlt="Coins" value={c.coins} label={`Coins: ${c.coins}`} />
            <Pill icon="/art/icon-gem.png" iconAlt="Gems" value={c.gems} label={`Gems: ${c.gems}`} />
            <Pill
              icon="/art/icon-streak.png"
              iconAlt="Day streak"
              value={c.currentStreak}
              label={`Streak: ${c.currentStreak} days`}
            />
            <span
              title={`Village tier: ${c.villageTier}`}
              className="rounded-pill bg-xp-amber px-2 py-1 font-pixel text-xs text-black"
            >
              ★ Tier {c.villageTier}
            </span>
            <button
              type="button"
              aria-label="Toggle sound"
              aria-pressed={muted}
              onClick={() => setMuted((m) => !m)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card border-2 border-black bg-xp-amber shadow-[0_0_0_2px_rgba(217,164,65,0.6)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95 ${
                muted ? "opacity-40" : "hover:brightness-105"
              }`}
            >
              <Image
                src="/art/icon-speaker.png"
                alt=""
                width={18}
                height={18}
                unoptimized
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </header>

            {/* Spacer for the fixed HUD + village scene with hotspots */}
      <div className="relative w-full overflow-x-hidden pt-24 md:pt-20">
        <div className="relative mx-auto aspect-[1376/768] w-full max-w-none px-0 sm:px-2">
          <Image
            src="/art/village-tier-1.webp"
            alt="Village at dusk with five buildings: Academy, Library, Training Ground, Farm, and Workshop"
            fill
            className="object-cover"
            priority
          />
          {HOTSPOTS.map((spot) => (
            <Hotspot key={spot.name} spot={spot} />
          ))}
        </div>
      </div>

      {profileOpen && (
        <ProfileOverlay
          characterId={choice?.characterId}
          charName={charName}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </main>
  );
}
const HOTSPOTS = [
  { key: "library", name: "Academy", category: "Intelligence", top: 15, left: 10 },
  { key: "library", name: "Library", category: "Intelligence", top: 10, left: 55 },
  { key: "gym", name: "Training Ground", category: "Strength", top: 30, left: 75 },
  { key: "home", name: "Farm", category: "Discipline", top: 65, left: 15 },
  { key: "home", name: "Workshop", category: "Discipline", top: 65, left: 60 },
];

function Hotspot({ spot }) {
  const router = useRouter();
  const available = mockQuests.filter(
    (q) => q.hotspot === spot.key && q.status === "available"
  );
  const count = available.length;
  const targetId = available[0]?.id ?? mockQuests.find((q) => q.hotspot === spot.key)?.id;

  return (
    <motion.button
      type="button"
      aria-label={`${spot.name} — ${spot.category} quests, ${count} available`}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onClick={() => targetId && router.push(`/quest/${targetId}`)}
      style={{ top: `${spot.top}%`, left: `${spot.left}%` }}
      className="group absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-avatar border-2 border-xp-amber bg-dusk shadow-[0_0_0_2px_black,0_0_10px_rgba(242,184,75,0.7)] transition hover:shadow-[0_0_0_2px_black,0_0_18px_rgba(242,184,75,0.95)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber motion-reduce:transition-none animate-pulse hover:animate-none sm:h-10 sm:w-10 sm:border-[3px] md:h-12 md:w-12"
    >
      {count > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-avatar bg-xp-amber font-pixel text-[8px] text-black sm:h-5 sm:w-5 sm:text-[10px] md:h-6 md:w-6 md:text-[11px]">
          {count}
        </span>
      )}
      <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 font-pixel text-[9px] text-xp-amber opacity-0 transition group-hover:opacity-100">
        {spot.name}
      </span>
    </motion.button>
  );
}
