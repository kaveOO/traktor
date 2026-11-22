import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import SiteCard from "@/components/card/SiteCard";

export const metadata: Metadata = {
  title: "Karta miejsca · TRAKTOR",
  description: "Karta miejsca do druku: parametry, polecenie na dziś, ścieżka prawna. Wymaga wizji lokalnej.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <ProgressLine label="Ładowanie karty…" />
          <p className="mt-3 text-[14px] text-forest-muted">Ładowanie karty miejsca… (wymaga JavaScript)</p>
        </div>
      }
    >
      <SiteCard />
    </Suspense>
  );
}
