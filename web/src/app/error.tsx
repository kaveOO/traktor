"use client"; // Error boundaries must be Client Components (Next 16: props `error` + `retry`)

import { useEffect } from "react";
import { Button } from "@/components/brand/ui";
import { Logo } from "@/components/brand/Logo";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <main id="main" className="flex flex-1 items-center bg-cream text-forest">
      <div className="mx-auto w-full max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <Logo height={20} />
        <p className="eb mt-10 text-terra-ink">Błąd strony</p>
        <h1 className="hd rise mt-3 text-[44px] leading-[0.94] md:text-[64px]">Coś poszło nie tak</h1>
        <p className="mt-6 max-w-xl text-[18px] leading-[1.5]">
          Strona nie wczytała się do końca. Spróbuj jeszcze raz. Jeśli to nie pomoże, zacznij od nowej analizy.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => retry()}>
            Spróbuj ponownie
          </Button>
          <Button href="/analiza" variant="secondary">
            Nowa analiza działki
          </Button>
        </div>
        {digest && (
          <p className="num mt-8 text-[12px] text-forest-muted">
            Kod błędu: {digest}
          </p>
        )}
      </div>
    </main>
  );
}
