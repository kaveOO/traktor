import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import MapApp from "@/components/map/MapApp";

export const metadata: Metadata = {
  title: "Przykład: zastawki na rowach pod Bydgoszczą · TRAKTOR",
  description:
    "Przykład na danych BDOT10k i NMT 1 m: bezpieczne i odrzucone miejsca na zastawki w rowach na zachód od Bydgoszczy. TRZYMAJ albo OTWÓRZ.",
};

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-forest">
          <ProgressLine label="Ładuję mapę" />
          <p className="mt-3 text-[14px] text-forest-muted">Ładuję mapę. Mapa wymaga JavaScript.</p>
        </div>
      }
    >
      <MapApp />
    </Suspense>
  );
}
