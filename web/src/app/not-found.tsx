import type { Metadata } from "next";
import { Button, SkipLink } from "@/components/brand/ui";
import { SiteNav } from "@/components/landing/SiteNav";

export const metadata: Metadata = {
  title: "Nie ma takiej strony · TRAKTOR",
  robots: { index: false },
};

/** Brand mark (Guidelines 1.0, 03 Logo system): square of soil, ditch cut in, board across the top. */
function Mark() {
  return (
    <svg viewBox="0 0 48 48" width={72} height={72} aria-hidden="true" className="block">
      <path d="M0 0H48V9H0Z M0 15H15.0L19.0 39H29.0L33.0 15H48V48H0Z" fill="currentColor" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <>
      <SkipLink href="#main">Przejdź do treści</SkipLink>
      <SiteNav solid />
      <main id="main" tabIndex={-1} className="flex flex-1 items-center bg-forest text-cream focus:outline-none">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 md:px-8 md:py-28">
          <Mark />
          <p className="eb num mt-10 text-cream-muted">Błąd 404</p>
          <h1 className="hd rise mt-3 text-[44px] leading-[0.94] md:text-[64px]">Tu nie ma rowu</h1>
          <p className="mt-6 max-w-xl text-[18px] leading-[1.5]">
            Nie znaleźliśmy tej strony. Adres mógł się zmienić. Zacznij od działki.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/analiza" tone="onForest">
              Sprawdź działkę
            </Button>
            <Button href="/" variant="secondary" tone="onForest">
              Strona główna
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
