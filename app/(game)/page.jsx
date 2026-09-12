import Link from "next/link";
import Image from "next/image";

// Retro pixel-art title screen — intentional style exception (dark bg, gold pixel
// frames) per the character-select direction; token colors only (xp-amber/coin-gold).
export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-black px-4 pb-4 pt-8 font-pixel text-parchment sm:pt-12">
      <h1 className="text-center text-2xl leading-tight text-xp-amber [text-shadow:3px_3px_0_#7a4a12] sm:text-2xl">
        LIFE&nbsp;RPG
      </h1>

      <div className="my-auto flex w-full flex-col items-center gap-4 sm:gap-6">
        {/* Framed village illustration */}
        <figure className="w-full max-w-140 rounded-card border-4 border-coin-gold bg-[#3a2313] p-1 shadow-[0_0_0_2px_black,0_0_24px_rgba(242,184,75,0.35)]">
          <div className="overflow-hidden rounded-card border-2 border-[#5a3a1e] bg-black">
            <Image
              src="/art/villagewelcomescreen.png"
              alt="Pixel art village at dusk — lamplit cottages around a cobblestone square"
              width={1200}
              height={896}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </figure>

        <p className="max-w-140 text-center text-xs leading-relaxed text-coin-gold sm:text-sm">
          Turn what you do into what you build.
        </p>

        <Link
          href="/select-character"
          className="w-full max-w-140 rounded-card border-2 border-black bg-gradient-to-b from-xp-amber to-coin-gold px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_0_2px_black] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp-amber active:scale-95"
        >
          START GAME
        </Link>
      </div>

      <footer aria-hidden="true" className="mt-auto pt-6 text-center text-xs text-white/40">
        © 199X RETRO QUEST CORP. · ALL RIGHTS RESERVED
      </footer>
    </main>
  );
}
