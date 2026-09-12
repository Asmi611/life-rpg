"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Style exception: this screen intentionally uses the retro pixel-art look from
// docs/references/ (dark background, amber/gold frame, bright panel blue) — an
// intentional one-off, not a departure from the design tokens elsewhere.
const CHARACTERS = [
  {
    id: "wayfarer",
    portrait: "/art/portrait-roamer.png",
    className: "Roamer",
    lore: "\u201CA wanderer venturing across different realms in search of destiny and glory.\u201D",
  },
  {
    id: "mage-scholar",
    portrait: "/art/portrait-mage.png",
    className: "Mage Scholar",
    lore: "\u201CA skillful mage gaining ancient knowledge and mastery across the realms.\u201D",
  },
];

export default function SelectCharacter() {
  const router = useRouter();
  const [characterIndex, setCharacterIndex] = useState(0);
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(null); // { name, className } on PROCEED
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef(null);
  const proceedButtonRef = useRef(null);
  const startJourneyButtonRef = useRef(null);

  const character = CHARACTERS[characterIndex];
  const otherCharacter = CHARACTERS[(characterIndex + 1) % CHARACTERS.length];
  const trimmedName = name.trim();
  const hasName = trimmedName.length > 0;
  const cardTitle = hasName ? trimmedName.toUpperCase() : "NO NAME";

  function toggleCharacter() {
    setCharacterIndex((i) => (i + 1) % CHARACTERS.length);
  }

  function openModal() {
    if (!hasName || showModal) return;
    setShowModal(true);
  }

  function handleProceed() {
    // Phase 2 mock: keep the choice in local state only. Later phase maps this to
    // POST /api/character's { name, gender } body — no API call invented here.
    setConfirmed({ name: trimmedName, className: character.className });
    // Persist the choice for the next screen (village HUD reads the portrait from here).
    try {
      window.sessionStorage.setItem(
        "characterChoice",
        JSON.stringify({ characterId: character.id, name: trimmedName })
      );
    } catch {
      // storage unavailable — village falls back to the roamer portrait
    }
    setShowModal(false);
    router.push("/village");
  }

  useEffect(() => {
    if (!showModal) return undefined;

    // Move focus into the modal as soon as it opens.
    proceedButtonRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setShowModal(false);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;

      // Trap Tab/Shift+Tab within the modal's focusable elements.
      const focusables = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Return focus to the trigger button once the modal closes.
      startJourneyButtonRef.current?.focus();
    };
  }, [showModal]);

  return (
    <main id="main-content" className="relative flex min-h-dvh flex-col items-center gap-3 overflow-hidden bg-black px-4 pt-6 text-white font-pixel">
      {/* Faded neighbor portraits in the background, like the reference art */}
      <Image
        src={otherCharacter.portrait}
        alt=""
        aria-hidden="true"
        width={186}
        height={232}
        className="pointer-events-none absolute left-0 top-1/3 hidden opacity-40 sm:block"
      />
      <Image
        src={character.portrait}
        alt=""
        aria-hidden="true"
        width={186}
        height={232}
        className="pointer-events-none absolute right-0 top-1/3 hidden opacity-40 sm:block"
      />

      <header className="z-10 flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl leading-tight text-xp-amber [text-shadow:3px_3px_0_#7a4a12] sm:text-2xl">
          CHARACTER SELECT
        </h1>
        <p aria-hidden="true" className="text-xs text-coin-gold">
          ~ 1P PRESS START ~
        </p>
      </header>

      <div className="z-10 my-auto flex w-full flex-col items-center gap-3 sm:gap-4">
      {/* Character card */}
      <section
        aria-label="Character preview"
        className="z-10 relative w-full max-w-72 rounded-card border-4 border-coin-gold bg-dusk p-2 shadow-[0_0_0_2px_black,0_0_24px_rgba(242,184,75,0.35)] sm:max-w-96 md:max-w-112"
      >
        <div className="rounded-card border-2 border-coin-gold/60 bg-[#4a6fd4] p-2">
          <h2 className="text-center text-lg text-parchment [text-shadow:2px_2px_0_#2B2440] md:text-xl">
            {cardTitle}
          </h2>
          <div className="mx-auto mt-2 w-full max-w-52 overflow-hidden rounded-card border-2 border-coin-gold/60 bg-dusk/40 sm:max-w-64 md:max-w-72">
            <Image
              src={character.portrait}
              alt={`${character.className} character portrait`}
              width={185}
              height={231}
              priority
              className="h-auto w-full"
            />
          </div>
          <p className="mx-auto mt-2 w-fit whitespace-nowrap rounded-pill border border-coin-gold/60 bg-dusk/80 px-3 py-1 text-xs text-xp-amber">
            CLASS: {character.className.toUpperCase()}
          </p>
        </div>

        {/* Toggle arrows */}
        <button
          type="button"
          onClick={toggleCharacter}
          aria-label={`Switch to ${otherCharacter.className}`}
          className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-avatar border-2 border-coin-gold bg-black px-3 py-3 text-xl text-coin-gold transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={toggleCharacter}
          aria-label={`Switch to ${otherCharacter.className}`}
          className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-avatar border-2 border-coin-gold bg-black px-3 py-3 text-xl text-coin-gold transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
        >
          ▶
        </button>
      </section>

      {/* Name entry */}
      <div className="z-10 flex w-full max-w-72 flex-col gap-1 sm:max-w-96 md:max-w-112">
        <label
          htmlFor="character-name"
          className="text-center text-xs text-coin-gold"
        >
          [ INSCRIBE NAME ]
        </label>
        <div className="flex items-stretch gap-1 rounded-card border-2 border-coin-gold bg-black p-1">
          <input
            id="character-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            placeholder="NAME . . ."
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-2 py-2 text-sm uppercase tracking-widest text-parchment placeholder:text-dusk/70 focus-visible:outline-none"
          />
          <span
            aria-hidden="true"
            className="self-center px-1 text-xs text-coin-gold/70"
          >
            {name.length}/16
          </span>
          <span
            aria-hidden="true"
            className="flex items-center border border-coin-gold bg-black px-2 text-coin-gold"
          >
            ✦
          </span>
        </div>
      </div>

      <button
        ref={startJourneyButtonRef}
        type="button"
        onClick={openModal}
        disabled={!hasName}
        aria-disabled={!hasName}
        className={`z-10 mt-1 w-full max-w-72 whitespace-nowrap rounded-pill border-2 px-4 py-3 text-xs tracking-wider transition sm:max-w-96 md:max-w-112 ${
          hasName
            ? "border-coin-gold bg-dusk text-xp-amber hover:bg-dusk/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin-gold active:scale-95"
            : "cursor-not-allowed border-coin-gold/30 bg-dusk/40 text-coin-gold/30"
        }`}
      >
        START YOUR JOURNEY
      </button>
      </div>

      <footer
        aria-hidden="true"
        className="z-10 pb-3 text-center text-xs text-white/40"
      >
        © 199X RETRO QUEST CORP. · ALL RIGHTS RESERVED
      </footer>

      {showModal && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quest-log-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-2 shadow-[0_0_24px_rgba(242,184,75,0.4)] md:max-w-112">
            <div className="rounded-card border-2 border-coin-gold/60 bg-dusk p-4">
              <p className="mx-auto w-fit rounded-pill border border-coin-gold/60 px-3 py-1 text-xs text-coin-gold">
                QUEST LOG #01
              </p>
              <h2
                id="quest-log-title"
                className="mt-2 text-center text-base text-xp-amber [text-shadow:2px_2px_0_#7a4a12] sm:text-lg"
              >
                A NEW DAWN BEGINS
              </h2>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-card border border-coin-gold/40 bg-black/40 px-3 py-2 text-sm">
                <p>
                  <span className="text-coin-gold">NAME:</span>{" "}
                  <span className="text-parchment">{trimmedName.toUpperCase()}</span>
                </p>
                <p>
                  <span className="text-coin-gold">CLASS:</span>{" "}
                  <span className="text-parchment">
                    {character.className.toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="mt-2 rounded-card border border-coin-gold/40 bg-black/40 px-3 py-2">
                <p className="text-xs text-coin-gold">LORE</p>
                <p className="mt-1 text-sm italic leading-relaxed text-parchment">
                  {character.lore}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-coin-gold">READY!</span>
                <span className="text-parchment">100%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={100}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Readiness"
                className="mt-1 h-3 w-full rounded-avatar border border-coin-gold/60 bg-black"
              >
                <div className="h-full w-full rounded-avatar bg-xp-amber" />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  ref={proceedButtonRef}
                  type="button"
                  onClick={handleProceed}
                  className="flex-1 rounded-pill border-2 border-coin-gold bg-xp-amber px-6 py-3 text-sm text-dusk transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment active:scale-95"
                >
                  PROCEED ▶
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-pill border-2 border-coin-gold/60 bg-black px-6 py-3 text-sm text-coin-gold transition hover:bg-dusk/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin-gold active:scale-95"
                >
                  [ ESC ] CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen-reader-only confirmation of the local-state choice */}
      <p aria-live="polite" className="sr-only">
        {confirmed
          ? `Journey started as ${confirmed.name}, class ${confirmed.className}.`
          : ""}
      </p>
    </main>
  );
}
