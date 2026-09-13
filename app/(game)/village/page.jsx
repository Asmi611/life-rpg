"use client";


import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { mockCharacter as c, mockQuests } from "@/lib/client/mockData";
import { useRequireAuth } from "@/lib/client/useRequireAuth";
import { apiFetch } from "@/lib/client/apiFetch";
import { supabase } from "@/lib/client/supabaseClient";

// Phase 5 feature flag — flip to false once GET /api/quests is confirmed live.
// While true, hotspots and the quest list read from mockQuests exactly as before.
const USE_MOCK_AUTH = false;

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
function ProfileOverlay({ characterId, charName, character = c, onClose }) {
  const router = useRouter();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error);
      return;
    }

    router.push("/select-character");
  }
  const meta = CHARACTERS[characterId] ?? CHARACTERS.wayfarer;
  const rank = RANKS[Math.min(character.level, RANKS.length - 1)];
  const stage = TIER_STAGES[Math.min(Math.max(character.villageTier, 1), TIER_STAGES.length) - 1];
  const memId = `#${(String(character.id ?? c.id).replace(/\D/g, "") || "1").padStart(7, "0")}`;
  const bp = (character.totalXP * 2).toLocaleString("en-US");
  const xpPct = Math.min(100, Math.round((character.totalXP / character.xpForNextLevel) * 100));

  const attributes = [
    { label: "INTELLIGENCE (INT)", value: character.intelligence, bar: "bg-xp-amber" },
    { label: "STRENGTH (STR)", value: character.strength, bar: "bg-rust" },
    { label: "DISCIPLINE (DIS)", value: character.discipline, bar: "bg-sage" },
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
            <span className="tabular-nums">◉ {character.coins.toLocaleString("en-US")}</span>
            <span className="tabular-nums text-sky-300">◈ {character.gems}</span>
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
                    alt={`${charName || character.name}'s full adventurer portrait`}
                    width={186}
                    height={232}
                    unoptimized
                    style={{ imageRendering: "pixelated" }}
                    className="mx-auto h-44 w-auto object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between font-pixel text-[10px]">
                  <span className="rounded-pill bg-dusk px-2 py-1 text-xp-amber tabular-nums">
                    ◉ {character.coins}
                  </span>
                  <span className="rounded-pill bg-dusk px-2 py-1 text-parchment">Lv. {character.level}</span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className="font-pixel text-base text-xp-amber sm:text-lg">
                  {(charName || character.name).toUpperCase()}
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
                    Level: <span className="text-xp-amber">{character.level}</span>
                  </p>
                  <p className="font-pixel text-[10px] text-coin-gold/70 tabular-nums">ID: {memId}</p>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={xpPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`XP progress: ${character.totalXP} of ${character.xpForNextLevel}`}
                  className="mt-2 h-3 overflow-hidden rounded-avatar border border-coin-gold/60 bg-black"
                >
                  <div className="h-full bg-xp-amber" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="mt-1 text-right font-pixel text-[10px] text-coin-gold tabular-nums">
                  {character.totalXP.toLocaleString("en-US")} / {character.xpForNextLevel.toLocaleString("en-US")} (XP)
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
                    TIER {character.villageTier} READY
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
                    {character.currentStreak} DAYS
                  </p>
                </div>
                <div className="rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
                  <p className="font-pixel text-[9px] text-coin-gold">★ VILLAGE TIER</p>
                  <p className="mt-1 font-pixel text-sm text-xp-amber">STAGE {stage}</p>
                </div>
              </div>

              <div className="mt-3 rounded-card border-2 border-coin-gold bg-dusk/50 p-3">
  <div className="flex items-center justify-between">
    <p className="font-pixel text-[10px] text-coin-gold">
      ✦ PERSONAL MANIFESTO
    </p>

    <span
      aria-hidden="true"
      className="font-pixel text-[9px] text-coin-gold/70"
    >
      ✎ EDIT
    </span>
  </div>

  <p className="mt-2 border border-coin-gold/30 bg-black/40 px-3 py-2 text-sm italic leading-relaxed text-parchment">
    {meta.lore}
  </p>

  <button
    type="button"
    onClick={handleLogout}
    className="mt-6 w-full border-2 border-red-700 bg-red-900/20 px-4 py-3 font-pixel text-sm text-red-400 transition hover:bg-red-900/40"
  >
    LOG OUT
  </button>
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
const CATEGORIES = ["Intelligence", "Strength", "Discipline"];
const EMPTY_FORM = { title: "", description: "", category: "Intelligence" };

// Custom quests aren't tied to a specific NPC building by the player, so we
// auto-assign a hotspot from the chosen category — same buildings the real
// NPC starter quests use, so a custom "Study" quest lands on the Academy
// exactly like a real Intelligence quest would.
const CATEGORY_TO_HOTSPOT = {
  Intelligence: "academy",
  Strength: "trainingGround",
  Discipline: "farm",
};

function AddQuestModal({ quests, setQuests, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // quest pending delete confirmation

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const customQuests = quests.filter((q) => q.source === "custom");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");

    if (USE_MOCK_AUTH) {
      if (editingId) {
        setQuests((prev) =>
          prev.map((q) => (q.id === editingId ? { ...q, ...form, title: form.title.trim() } : q))
        );
      } else {
        setQuests((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            hotspot: CATEGORY_TO_HOTSPOT[form.category],
            source: "custom",
            status: "available",
            rewardXP: 0,
            rewardCoins: 0,
            rewardGems: 0,
          },
        ]);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await apiFetch(`/api/quests/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update quest");
        setQuests((prev) =>
          prev.map((q) => (q.id === editingId ? { ...q, ...data } : q))
        );
      } else {
        const res = await apiFetch("/api/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create quest");
        const created = { ...data, hotspot: data.hotspot || CATEGORY_TO_HOTSPOT[form.category] };
        setQuests((prev) => [...prev, created]);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(q) {
    setForm({ title: q.title, description: q.description, category: q.category });
    setEditingId(q.id);
    setError("");
  }

  async function handleDelete(q) {
    setConfirmDelete(q);
  }

  async function confirmDeleteNow() {
    const q = confirmDelete;
    setConfirmDelete(null);
    if (!q) return;

    if (USE_MOCK_AUTH) {
      setQuests((prev) => prev.filter((x) => x.id !== q.id));
      return;
    }

    try {
      const res = await apiFetch(`/api/quests/${q.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete quest");
      }
      setQuests((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add custom quest"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/95 px-2 py-3 sm:px-4 sm:py-5"
    >
      <button
        type="button"
        aria-label="Close add quest"
        onClick={onClose}
        className="fixed right-2 top-2 z-20 flex h-11 w-11 items-center justify-center border-2 border-black bg-rust font-pixel text-sm text-parchment shadow-[0_0_0_2px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment active:scale-95"
      >
        ✕
      </button>

      <div className="relative z-10 mx-auto w-full max-w-2xl rounded-card border-4 border-coin-gold bg-black p-4 font-pixel text-parchment shadow-[0_0_24px_rgba(242,184,75,0.3)] sm:p-6">
        <h2 className="text-sm text-xp-amber">
          {editingId ? "EDIT QUEST" : "◈ CREATE QUEST ◈"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-coin-gold">
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="min-h-11 rounded-card border-2 border-coin-gold/60 bg-dusk px-3 py-2 text-sm text-parchment"
            />
            {error && <span className="text-[10px] text-rust">{error}</span>}
          </label>

          <label className="flex flex-col gap-1 text-xs text-coin-gold">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="rounded-card border-2 border-coin-gold/60 bg-dusk px-3 py-2 text-sm text-parchment"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-coin-gold">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="min-h-11 rounded-card border-2 border-coin-gold/60 bg-dusk px-3 py-2 text-sm text-parchment"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-card border-2 border-black bg-gradient-to-b from-xp-amber to-coin-gold px-4 py-3 text-xs uppercase text-black transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "SAVING…" : editingId ? "SAVE CHANGES" : "▶ ADD QUEST"}
          </button>
        </form>

        <hr className="my-4 border-coin-gold/40" />

        <h3 className="text-xs text-coin-gold">MY QUESTS</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {customQuests.length === 0 && (
            <li className="text-xs text-parchment/50">No custom quests yet.</li>
          )}
          {customQuests.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-2 rounded-card border border-coin-gold/40 bg-dusk/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-parchment">{q.title}</p>
                <span className="text-[9px] text-gem-violet">◆ {q.category}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`Edit quest: ${q.title}`}
                  onClick={() => handleEdit(q)}
                  className="flex h-9 w-9 items-center justify-center rounded-card border-2 border-coin-gold bg-black text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-xp-amber"
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label={`Delete quest: ${q.title}`}
                  onClick={() => handleDelete(q)}
                  className="flex h-9 w-9 items-center justify-center rounded-card border-2 border-rust bg-black text-xs text-rust focus-visible:outline focus-visible:outline-2 focus-visible:outline-rust"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {confirmDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
        >
          <div className="w-full max-w-80 rounded-card border-4 border-rust bg-black p-4 text-center font-pixel shadow-[0_0_24px_rgba(185,92,74,0.4)]">
            <p id="confirm-delete-title" className="text-sm text-parchment">
              Delete &quot;{confirmDelete.title}&quot;?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmDeleteNow}
                className="flex-1 rounded-card border-2 border-rust bg-rust/90 px-4 py-2 text-xs uppercase tracking-wider text-parchment transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment"
              >
                DELETE
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-card border-2 border-coin-gold bg-black px-4 py-2 text-xs uppercase tracking-wider text-xp-amber transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin-gold"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Village() {
  useRequireAuth();

  const choice = useSyncExternalStore(
    subscribeToCharacterChoice,
    readCharacterChoice,
    getServerCharacterChoice
  );
  const meta = CHARACTERS[choice?.characterId] ?? CHARACTERS.wayfarer;
  const charName = choice?.name ?? "";
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }
  const [profileOpen, setProfileOpen] = useState(false);
  const [addQuestOpen, setAddQuestOpen] = useState(false);
const [quests, setQuests] = useState(mockQuests);
  const [questsLoading, setQuestsLoading] = useState(!USE_MOCK_AUTH);
  const [questsError, setQuestsError] = useState("");
  const [character, setCharacter] = useState(c);
const [characterLoading, setCharacterLoading] = useState(!USE_MOCK_AUTH);
const prefersReducedMotion = useReducedMotion();

const pct = Math.min(100, Math.round((character.totalXP / character.xpForNextLevel) * 100));
const tier = Math.min(Math.max(character.villageTier, 1), 3);
const hotspots = HOTSPOTS_BY_TIER[tier];
const villageImage = VILLAGE_IMAGES[tier];

  useEffect(() => {
    if (USE_MOCK_AUTH) return;
    let cancelled = false;

    async function loadCharacter() {
      try {
        const res = await apiFetch("/api/character");
        const data = await res.json();
        if (res.ok && !cancelled) setCharacter(data);
      } catch {
        // network error — keep showing whatever we already had
      } finally {
        if (!cancelled) setCharacterLoading(false);
      }
    }

    loadCharacter();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (USE_MOCK_AUTH) return;
    let cancelled = false;

    async function loadQuests() {
      setQuestsLoading(true);
      setQuestsError("");
      try {
        const res = await apiFetch("/api/quests");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load quests");
        if (!cancelled) {
          const fixed = data.quests.map((q) =>
            q.hotspot ? q : { ...q, hotspot: CATEGORY_TO_HOTSPOT[q.category] }
          );
          setQuests(fixed);
        }
      } catch (err) {
        if (!cancelled) setQuestsError(err.message);
      } finally {
        if (!cancelled) setQuestsLoading(false);
      }
    }

    loadQuests();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <main id="main-content" className="min-h-dvh bg-parchment">
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
            <span className="shrink-0 font-pixel text-sm text-xp-amber">
              Lv. {characterLoading ? "—" : character.level}
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-pixel text-xs text-coin-gold">XP PROGRESS</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <div
                  role="progressbar"
                  aria-valuenow={characterLoading ? 0 : pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={
                    characterLoading
                      ? "XP progress loading"
                      : `XP progress: ${character.totalXP} of ${character.xpForNextLevel}`
                  }
                  className="h-3 min-w-16 flex-1 overflow-hidden rounded-avatar border border-coin-gold/60 bg-dusk"
                >
                  <div className="h-full bg-xp-amber" style={{ width: `${characterLoading ? 0 : pct}%` }} />
                </div>
                <span className="self-end whitespace-nowrap font-pixel text-xs text-parchment/80 tabular-nums sm:self-auto">
                  {characterLoading ? "— / —" : `${character.totalXP} / ${character.xpForNextLevel}`} XP
                </span>
              </div>
            </div>
          </div>

          {/* Badges: sit below the priority row on small screens, inline from md up */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap md:justify-end md:shrink-0 md:gap-3">
            <Pill icon="/art/icon-coin.png" iconAlt="Coins" value={characterLoading ? "—" : character.coins} label={`Coins: ${characterLoading ? "loading" : character.coins}`} />
            <Pill icon="/art/icon-gem.png" iconAlt="Gems" value={characterLoading ? "—" : character.gems} label={`Gems: ${characterLoading ? "loading" : character.gems}`} />
            <Pill
              icon="/art/icon-streak.png"
              iconAlt="Day streak"
              value={characterLoading ? "—" : character.currentStreak}
              label={`Streak: ${characterLoading ? "loading" : `${character.currentStreak} days`}`}
            />
            <span
              title={`Village tier: ${characterLoading ? "loading" : character.villageTier}`}
              className="rounded-pill bg-xp-amber px-2 py-1 font-pixel text-xs text-black"
            >
              ★ Tier {characterLoading ? "—" : character.villageTier}
            </span>
            <button
  type="button"
  aria-label="Add custom quest"
  onClick={() => setAddQuestOpen(true)}
  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-avatar border-2 border-coin-gold bg-black font-pixel text-sm text-xp-amber transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
>
  +
</button>
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
          {characterLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-dusk">
              <p className="font-pixel text-xs text-coin-gold">LOADING VILLAGE…</p>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
  <motion.div
    key={tier}
    initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{
      duration: prefersReducedMotion ? 0 : 0.45,
      ease: "easeInOut",
    }}
    className="absolute inset-0"
  >
    <Image
      src={villageImage.src}
      alt={villageImage.alt}
      fill
      className="object-cover"
      priority
    />
  </motion.div>
</AnimatePresence>
              {hotspots.map((spot) => (
                <Hotspot key={spot.name} spot={spot} quests={quests} showToast={showToast} />
              ))}
            </>
          )}
        </div>
      </div>

            {profileOpen && (
        <ProfileOverlay
          characterId={choice?.characterId}
          charName={charName}
          character={character}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {addQuestOpen && (
        <AddQuestModal
          quests={quests}
          setQuests={setQuests}
          onClose={() => setAddQuestOpen(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-card border-2 border-coin-gold bg-black px-4 py-3 font-pixel text-xs text-xp-amber shadow-[0_0_16px_rgba(242,184,75,0.35)]"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
const HOTSPOTS_BY_TIER = {
  1: [
    { key: "academy", name: "Academy", category: "Intelligence", top: 15, left: 10 },
    { key: "library", name: "Library", category: "Intelligence", top: 10, left: 55 },
    { key: "trainingGround", name: "Training Ground", category: "Strength", top: 30, left: 75 },
    { key: "farm", name: "Farm", category: "Discipline", top: 65, left: 15 },
    { key: "workshop", name: "Workshop", category: "Discipline", top: 65, left: 60 },
    { key: "shop", name: "Shop", category: null, top: 42, left: 62 },
  ],
  2: [
    { key: "academy", name: "Academy", category: "Intelligence", top: 15, left: 15 },
    { key: "library", name: "Library", category: "Intelligence", top: 12, left: 55 },
    { key: "trainingGround", name: "Training Ground", category: "Strength", top: 30, left: 78 },
    { key: "farm", name: "Farm", category: "Discipline", top: 65, left: 15 },
    { key: "workshop", name: "Workshop", category: "Discipline", top: 62, left: 58 },
    { key: "shop", name: "Shop", category: null, top: 40, left: 62 },
  ],
  3: [
    { key: "academy", name: "Academy", category: "Intelligence", top: 15, left: 22 },
    { key: "library", name: "Library", category: "Intelligence", top: 40, left: 78 },
    { key: "trainingGround", name: "Training Ground", category: "Strength", top: 12, left: 78 },
    { key: "farm", name: "Farm", category: "Discipline", top: 60, left: 12 },
    { key: "workshop", name: "Workshop", category: "Discipline", top: 68, left: 82 },
    { key: "shop", name: "Shop", category: null, top: 42, left: 62 },
  ],
};
const VILLAGE_IMAGES = {
  1: { src: "/art/village-tier-1.webp", alt: "Hamlet village with six buildings at dusk" },
  2: { src: "/art/village-tier-2.webp", alt: "Upgraded village with decorated buildings at dusk" },
  3: { src: "/art/village-tier-3.webp", alt: "Walled town with expanded buildings and marketplace" },
};

function Hotspot({ spot, quests, showToast }) {
  const router = useRouter();
  const isShop = spot.key === "shop";
  const available = isShop
    ? []
    : quests.filter((q) => q.hotspot === spot.key && q.status === "available");
  const count = available.length;
  const targetId = isShop
    ? null
    : available[0]?.id ?? quests.find((q) => q.hotspot === spot.key)?.id;

  return (
    <motion.button
      type="button"
      aria-label={isShop ? "Shop — buy items" : `${spot.name} — ${spot.category} quests, ${count} available`}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onClick={() => {
  if (isShop) {
    router.push("/shop");
  } else if (targetId) {
    router.push(`/quest/${targetId}`);
  } else {
    showToast(`No quests here right now at ${spot.name}.`);
  }
}}
      style={{ top: `${spot.top}%`, left: `${spot.left}%` }}
      className="group absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-avatar border-2 border-xp-amber bg-dusk shadow-[0_0_0_2px_black,0_0_10px_rgba(242,184,75,0.7)] transition hover:shadow-[0_0_0_2px_black,0_0_18px_rgba(242,184,75,0.95)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber motion-reduce:transition-none animate-pulse hover:animate-none sm:h-10 sm:w-10 sm:border-[3px] md:h-12 md:w-12"
    >
      {isShop ? (
        <span className="text-xs sm:text-sm">🛒</span>
      ) : (
        count > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-avatar bg-xp-amber font-pixel text-[8px] text-black sm:h-5 sm:w-5 sm:text-[10px] md:h-6 md:w-6 md:text-[11px]">
            {count}
          </span>
        )
      )}
      <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 font-pixel text-[9px] text-xp-amber opacity-0 transition group-hover:opacity-100">
        {spot.name}
      </span>
    </motion.button>
  );
}
