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
    <Suspense fallback={<ProgressLine />}>
      <MapApp />
    </Suspense>
  );
}
