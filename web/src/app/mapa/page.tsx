import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import MapApp from "@/components/map/MapApp";

export const metadata: Metadata = {
  title: "Mapa gminy · TRAKTOR",
  description: "Bezpieczne i odrzucone miejsca na zastawki w rowach melioracyjnych. TRZYMAJ albo OTWÓRZ.",
};

export default function MapaPage() {
  return (
    <Suspense fallback={<ProgressLine />}>
      <MapApp />
    </Suspense>
  );
}
