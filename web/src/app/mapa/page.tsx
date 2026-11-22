import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import MapApp from "@/components/map/MapApp";

export const metadata: Metadata = {
  title: "Mapa · TRAKTOR",
  description: "Miejsca bezpieczne i odrzucone na zastawki w rowach na zachód od Bydgoszczy. TRZYMAJ albo OTWÓRZ.",
};

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <ProgressLine label="Ładowanie mapy…" />
          <p className="mt-3 text-[14px] text-forest-muted">Ładowanie mapy… (wymaga JavaScript)</p>
        </div>
      }
    >
      <MapApp />
    </Suspense>
  );
}
