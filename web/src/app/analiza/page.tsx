import type { Metadata } from "next";
import { Suspense } from "react";
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
        <div className="fixed inset-0 grid place-items-center bg-cream-deep p-6">
          <div className="w-64">
            <p className="text-center text-[15px]">Ładuję mapę…</p>
            <ProgressLine className="mt-3" />
          </div>
        </div>
      }
    >
      <AnalizaApp />
    </Suspense>
  );
}
