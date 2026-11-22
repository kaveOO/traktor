import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import RaportApp from "@/components/raport/RaportApp";

export const metadata: Metadata = {
  title: "Raport wodny działki · TRAKTOR",
  description:
    "Raport do druku lub PDF: ocena sytuacji wodnej, przyczyny, rekomendacje, ograniczenia i źródła danych. Wymaga wizji lokalnej.",
};

export default function Page() {
  return (
    <Suspense fallback={<ProgressLine />}>
      <RaportApp />
    </Suspense>
  );
}
