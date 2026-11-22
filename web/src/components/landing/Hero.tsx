import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/brand/ui";
import { GMINA, mapFeatures } from "@/lib/traktor";
import { HeroFields, stripStats, type PatternParcel } from "./HeroFields";

/** Real ULDK parcels of the demo area (map units = 10 m) -> metres. Runs on the server at build time. */
export const DEMO_PARCELS: PatternParcel[] = mapFeatures.parcels.map((p) => ({
  points: p.points.map(([x, y]) => [x * 10, y * 10] as [number, number]),
}));
const PARCELS = DEMO_PARCELS;
const STRIPS = stripStats(PARCELS).n;

/**
 * Website hero (brand §11, "Website hero 1440 x 810"): a forest block for words, the field pattern for image.
 * Desktop: words left, pattern right. Mobile: pattern band on top, words below.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative -mt-16 flex flex-col bg-forest text-cream md:grid md:min-h-[min(100svh,900px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="relative h-[40svh] min-h-[240px] md:order-2 md:h-auto">
        <HeroFields parcels={PARCELS} tone="forest" drift className="absolute inset-0" />
        {STRIPS > 0 && (
          <p className="eb num absolute right-3 bottom-3 max-w-[calc(100%-1.5rem)] rounded-[2px] bg-forest px-2 py-1 text-cream md:right-5 md:bottom-5">
            Wzór z {STRIPS} działek ULDK · {GMINA.short}
          </p>
        )}
      </div>

      <div className="flex flex-col justify-between gap-12 px-5 pt-10 pb-14 md:order-1 md:px-10 md:pt-28 md:pb-16 lg:px-14">
        <div className="rise">
          <Logo color="cream" height={28} />
        </div>
        <div>
          <h1 id="hero-title" className="hd rise text-[46px] [animation-delay:80ms] sm:text-[60px] lg:text-[76px] xl:text-[88px]">
            Przyszłość wody jest już w polu.
          </h1>
          <p className="rise mt-6 max-w-[34rem] text-[18px] leading-[1.5] [animation-delay:160ms] md:text-[20px]">
            Rowy już są. Wystarczy w nich zatrzymać wodę. Wpisz numer działki, uprawę i datę: dostaniesz raport o wodzie
            na tym polu.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Button tone="onForest" href="/analiza">
              Sprawdź działkę
            </Button>
            <Button variant="secondary" tone="onForest" href="#jak">
              Jak to działa
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
