"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/lib/client/useRequireAuth";
import { apiFetch } from "@/lib/client/apiFetch";


// Retro pixel shop — same intentional style exception as the other game screens
// (dark bg, gold pixel borders). Mock data only; BUY is a visual no-op until
// POST /api/shop/purchase is wired in a later phase.

// Icon paths follow the convention /art/item-[slug].png; the team's art lives at
// public/art/ root (e.g. item-golden-cape.png).
const ICON_FILES = {
  "Golden Cape": "item-golden-cape.png",
  "Garden Fence": "item-garden-fence.png",
  // Placeholder mappings — real backend items don't have dedicated art yet.
  // Swap these for real files once the team has icons for each.
  "Wizard Hat": "item-straw-hat.png",
  "Cosmic Wings": "item-crystal-lantern.png",
  "Stone Path": "item-stone-well.png",
  "Flower Bed": "item-wind-chimes.png",
  // Older mock names, kept in case they're still seeded anywhere.
  "Straw Hat": "item-straw-hat.png",
  "Crystal Lantern": "item-crystal-lantern.png",
  "Scholar's Spectacles": "item-spectacles.png",
  "Wanderer's Boots": "item-boots.png",
  "Stone Well": "item-stone-well.png",
  "Wind Chimes": "item-wind-chimes.png",
};
const iconFor = (name) => `/art/${ICON_FILES[name] ?? "item-golden-cape.png"}`;

// One flavor line per item, written for the mock catalog; keyed by item id so a
// renamed item keeps its text. Tone matches the reference inspection modals.
const FLAVOR = {
  "item-1": "\u201CA royal weave that shimmers with every level gained.\u201D",
  "item-2": "\u201CA humble border that keeps the village dreams safe.\u201D",
  "item-3": "\u201CFieldsun-woven straw for honest work under bright skies.\u201D",
  "item-4": "\u201CA captive dawn that never burns out on late-night studies.\u201D",
};

function CostBadge({ item }) {
  const isGem = item.costGems > 0;
  return (
    <span
      className={`flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs tabular-nums ${
        isGem
          ? "border-gem-violet bg-gem-violet/20 text-gem-violet"
          : "border-coin-gold/70 bg-black text-coin-gold"
      }`}
    >
      <Image
        src={isGem ? "/art/icon-gem.png" : "/art/icon-coin.png"}
        alt=""
        width={14}
        height={14}
        className="h-3.5 w-3.5"
      />
      {isGem ? item.costGems : item.costCoins}
      <span className="sr-only">{isGem ? " gems" : " coins"}</span>
    </span>
  );
}

function StatusBadge({ owned, equipped }) {
  if (!owned) return null;
  return (
    <span
      className={`rounded-pill px-2 py-0.5 font-pixel text-xs ${
        equipped
          ? "bg-xp-amber font-bold text-black"
          : "bg-discipline-sage/30 text-discipline-sage"
      }`}
    >
      {equipped ? "EQUIPPED" : "OWNED"}
    </span>
  );
}

export default function Shop() {
  useRequireAuth();

  const [items, setItems] = useState([]);
const [coins, setCoins] = useState(0);
const [gems, setGems] = useState(0);
const [loading, setLoading] = useState(true);
const [actionLoading, setActionLoading] = useState(false);
const [error, setError] = useState("");
const [toast, setToast] = useState("");

const [selected, setSelected] = useState(null);

const modalRef = useRef(null);
const closeButtonRef = useRef(null);
const lastTriggerRef = useRef(null);
async function handlePurchase(item) {
  try {
    setActionLoading(true);
    setError("");

    const response = await apiFetch("/api/shop/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId: item.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || "Purchase failed");
      return;
    }

    setCoins(data.coins ?? coins);
    setGems(data.gems ?? gems);

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              owned: true,
              equipped: false,
            }
          : currentItem
      )
    );

    setSelected((currentSelected) =>
      currentSelected && currentSelected.id === item.id
        ? {
            ...currentSelected,
            owned: true,
            equipped: false,
          }
        : currentSelected
    );

    showToast(`${item.name} purchased!`);
  } catch (err) {
    console.error("Purchase failed:", err);
    showToast("Purchase failed. Please try again.");
  } finally {
    setActionLoading(false);
  }
}
async function handleEquip(item) {
  try {
    setActionLoading(true);

    const response = await apiFetch("/api/shop/equip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId: item.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || "Failed to update equipped status");
      return;
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              equipped: data.equipped,
            }
          : currentItem
      )
    );

    setSelected((currentSelected) =>
      currentSelected && currentSelected.id === item.id
        ? {
            ...currentSelected,
            equipped: data.equipped,
          }
        : currentSelected
    );

    showToast(
      data.equipped
        ? `${item.name} equipped!`
        : `${item.name} unequipped!`
    );
  } catch (err) {
    console.error("Equip failed:", err);
    showToast("Failed to update equipped status.");
  } finally {
    setActionLoading(false);
  }
}
  // Lock page scroll while the inspection modal is open.
  useEffect(() => {
  async function loadShop() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/api/shop/items", {
  method: "GET",
  cache: "no-store",
});

const data = await response.json();

console.log("SHOP ITEMS FROM API:", data.items);

if (!response.ok) {
  throw new Error(data.error || "Failed to load shop");
}

      setItems(data.items || []);
    } catch (err) {
      console.error("Shop load failed:", err);
      setError(err.message || "Failed to load shop");
    } finally {
      setLoading(false);
    }
  }

  loadShop();
}, []);
useEffect(() => {
  async function loadCharacter() {
    try {
      const response = await apiFetch("/api/character", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load character");
      }

      const character = data.character || data;

      setCoins(character.coins ?? 0);
      setGems(character.gems ?? 0);
    } catch (err) {
      console.error("Character load failed:", err);
    }
  }

  loadCharacter();
}, []);

  useEffect(() => {
    if (!selected) return undefined;

    // Move focus into the modal as soon as it opens.
    closeButtonRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setSelected(null);
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;

      // Trap Tab/Shift+Tab within the modal's focusable elements.
      const focusables = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Return focus to whichever card opened the modal.
      lastTriggerRef.current?.focus();
    };
  }, [selected]);
  function showToast(message) {
  setToast(message);

  window.setTimeout(() => {
    setToast("");
  }, 3000);
}

  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center gap-3 overflow-hidden bg-black px-4 py-6 font-pixel text-parchment">
      {/* Header row */}
      <div className="z-10 flex w-full max-w-140 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight text-xp-amber [text-shadow:3px_3px_0_#7a4a12]">
            SHOP
          </h1>
          <p className="mt-1 text-xs text-coin-gold">[ VILLAGE MARKET &amp; WARES ]</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            title={`Coins: ${coins}`}
            className="flex items-center gap-1 rounded-pill border border-coin-gold/70 bg-black px-2 py-1 text-xs text-coin-gold tabular-nums"
          >
            <Image src="/art/icon-coin.png" alt="" width={16} height={16} className="h-4 w-4" />
            {coins}
            <span className="sr-only">coins</span>
          </span>
          <span
            title={`Gems: ${gems}`}
            className="flex items-center gap-1 rounded-pill border border-gem-violet bg-black px-2 py-1 text-xs text-gem-violet tabular-nums"
          >
            <Image src="/art/icon-gem.png" alt="" width={16} height={16} className="h-4 w-4" />
            {gems}
            <span className="sr-only">gems</span>
          </span>
        </div>
      </div>

      {/* Item grid */}
      {loading ? (
        <p className="z-10 py-8 text-xs text-coin-gold">LOADING SHOP…</p>
      ) : (
        <ul
          aria-label="Shop items"
          className="z-10 grid w-full max-w-140 grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.id}>
            <button
              type="button"
              onClick={(e) => {
                lastTriggerRef.current = e.currentTarget;
                setSelected(item);
              }}
              aria-label={`View ${item.name} — ${
                item.costGems > 0 ? `${item.costGems} gems` : `${item.costCoins} coins`
              }, ${item.equipped ? "equipped" : item.owned ? "owned" : "not owned"}`}
              className={`flex h-full min-h-44 w-full flex-col items-center gap-2 rounded-card border-2 border-coin-gold/70 bg-dusk/60 p-3 text-center transition hover:border-coin-gold hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95 ${
                item.owned ? "opacity-50 saturate-50" : ""
              }`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-card border border-coin-gold/50 bg-black/40">
                <Image
                  src={iconFor(item.name)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                />
              </span>
              <span className="text-xs leading-snug text-parchment">{item.name}</span>
              <CostBadge item={item} />
              <StatusBadge owned={item.owned} equipped={item.equipped} />
            </button>
          </li>
        ))}
        </ul>
      )}

      {/* Footer row */}
      <div className="z-10 flex w-full max-w-140 flex-col items-center justify-between gap-3 pb-2 sm:flex-row">
        <Link
          href="/village"
          className="w-full rounded-card border-2 border-streak-rust bg-streak-rust/90 px-8 py-3 text-center text-xs font-bold uppercase tracking-wider text-parchment transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-streak-rust active:scale-95 sm:w-auto"
        >
          × CLOSE
        </Link>
        <p
          aria-hidden="true"
          className="text-xs text-coin-gold"
        >
          INVENTORY: {loading ? "—" : items.length} ITEMS ON DISPLAY
        </p>
      </div>

      {/* Item inspection modal */}
      {selected && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-inspection-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="w-full max-w-96 rounded-card border-4 border-coin-gold bg-black p-2 shadow-[0_0_24px_rgba(242,184,75,0.4)]">
            <div className="flex flex-col items-center gap-3 rounded-card border-2 border-coin-gold/60 bg-dusk p-4 text-center">
              <p className="rounded-pill border-2 border-coin-gold bg-black px-4 py-1 text-xs text-coin-gold">
                ◈ ITEM INSPECTION ◈
              </p>
              <h2
                id="item-inspection-title"
                className="text-lg text-xp-amber [text-shadow:2px_2px_0_#7a4a12]"
              >
                {selected.name.toUpperCase()}
              </h2>
              <p
                className={`rounded-pill px-3 py-1 text-xs ${
                  selected.equipped
                    ? "bg-xp-amber font-bold text-black"
                    : selected.owned
                      ? "bg-discipline-sage/30 text-discipline-sage"
                      : "border border-gem-violet bg-gem-violet/20 text-gem-violet"
                }`}
              >
                {selected.equipped
                  ? "EQUIPPED"
                  : selected.owned
                    ? "OWNED"
                    : "AVAILABLE FOR PURCHASE"}
              </p>
              <span className="flex h-24 w-24 items-center justify-center rounded-card border-2 border-coin-gold bg-black/60">
                <Image
                  src={iconFor(selected.name)}
                  alt={`${selected.name} pixel icon`}
                  width={88}
                  height={88}
                  className="h-22 w-22 object-contain"
                />
              </span>

              {!selected.owned && (
                <p className="flex items-center gap-2 text-sm text-coin-gold">
                  PRICE:
                  <span className="flex items-center gap-1 rounded-pill border border-coin-gold/70 bg-black px-2 py-1 text-xs tabular-nums">
                    <Image
                      src={selected.costGems > 0 ? "/art/icon-gem.png" : "/art/icon-coin.png"}
                      alt=""
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5"
                    />
                    {selected.costGems > 0 ? selected.costGems : selected.costCoins}
                    <span className="sr-only">{selected.costGems > 0 ? " gems" : " coins"}</span>
                  </span>
                </p>
              )}

              <blockquote className="w-full rounded-card border border-gem-violet/50 bg-black/50 p-3 text-sm italic leading-relaxed text-parchment">
                {FLAVOR[selected.id] ?? "\u201CA wondrous curiosity of the realm.\u201D"}
              </blockquote>
              <p className="text-xs uppercase tracking-wider text-coin-gold">
                TYPE: {selected.type}
              </p>

              <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row">
                {!selected.owned && (
                  <button
                    type="button"
                   onClick={() => handlePurchase(selected)}
                   disabled={actionLoading}
                    className="min-h-11 flex-1 rounded-card border-2 border-black bg-gradient-to-b from-xp-amber to-coin-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_0_2px_rgba(217,164,65,0.6)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
                  >
                    ▶ BUY
                  </button>
                )}
                {selected.owned && selected.type === "cosmetic" && (
  <button
    type="button"
    onClick={() => handleEquip(selected)}
    disabled={actionLoading}
    className="min-h-11 flex-1 rounded-card border-2 border-coin-gold bg-black px-6 py-3 text-xs font-bold uppercase tracking-wider text-xp-amber transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin-gold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {actionLoading
      ? "PROCESSING..."
      : selected.equipped
        ? "UNEQUIP"
        : "EQUIP"}
  </button>
)}
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setSelected(null)}
                  className="min-h-11 flex-1 rounded-card border-2 border-coin-gold bg-black px-6 py-3 text-xs uppercase tracking-wider text-xp-amber transition hover:bg-dusk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coin-gold active:scale-95"
                >
                  « BACK TO SHOP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
  <div
    role="status"
    className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-card border-2 border-coin-gold bg-black px-4 py-3 text-xs text-xp-amber shadow-[0_0_16px_rgba(242,184,75,0.35)]"
  >
    {toast}
  </div>
)}
    </main>
  );
}
