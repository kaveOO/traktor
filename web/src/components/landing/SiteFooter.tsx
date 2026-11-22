import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { DEMO_NOTE, TAGLINE_EN, TAGLINE_PL } from "@/lib/traktor";

export function SiteFooter() {
  return (
    <footer className="border-t border-cream/15 bg-forest text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr] md:px-8">
        <div>
          <Logo color="cream" height={22} />
          <p className="sh mt-6 text-[22px]">{TAGLINE_PL}</p>
          <p className="mt-1 text-[14px] opacity-80">{TAGLINE_EN}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <ul className="space-y-2 text-[15px]">
            <li>
              <Link className="hover:underline" href="/analiza">
                Analiza działki
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/mapa">
                Miejsca
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/metoda">
                Dane i metoda
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/karta?site=S-007&crest=40&scenario=drought-aug">
                Karta miejsca
              </Link>
            </li>
          </ul>
          <div className="space-y-3 text-[12px] leading-snug opacity-80">
            <p>
              {DEMO_NOTE}. Źródła: BDOT10k, NMT LiDAR 1 m i ULDK (GUGiK), IMGW-PIB, Open-Meteo, ISOK, IUNG-PIB.
            </p>
            <p className="eb">HackNation 2026 · KOWR</p>
          </div>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <p className="mx-auto max-w-6xl px-5 py-5 text-[13px] md:px-8">
          Let the land hold its water. · Niech ziemia zatrzyma swoją wodę.
        </p>
      </div>
    </footer>
  );
}
