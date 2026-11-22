import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { ProgressLine } from "@/components/brand/ui";
import AnalizaApp from "@/components/analiza/AnalizaApp";

export const metadata: Metadata = {
  title: "Analiza działki · TRAKTOR",
  description: "Sprawdź ryzyko suszy na działce: numer działki, uprawa, data. Ocena, przyczyny, retencja, agrotechnika, nawadnianie.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 grid place-items-center bg-cream-deep p-6 text-forest">
          <div className="w-72">
            <Logo height={20} />
            <p className="eb mt-8 text-forest-muted">01 — Analiza działki</p>
            <p className="sh mt-1 text-[22px]">Ładuję mapę</p>
            <ProgressLine className="mt-4" label="Ładuję mapę" />
          </div>
        </div>
      }
    >
      <AnalizaApp />
    </Suspense>
  );
}
