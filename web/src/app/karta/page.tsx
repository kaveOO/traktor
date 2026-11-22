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
    <Suspense fallback={<ProgressLine />}>
      <SiteCard />
    </Suspense>
  );
}
