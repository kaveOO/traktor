import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import Deck from "@/components/slides/Deck";

export const metadata: Metadata = {
  title: "TRAKTOR · Pitch · Niech ziemia zatrzyma swoją wodę",
};

export default function SlidesPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 grid place-items-center bg-forest">
          <ProgressLine className="w-64 bg-cream/15" />
        </div>
      }
    >
      <Deck />
    </Suspense>
  );
}
