import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgressLine } from "@/components/brand/ui";
import SiteCard from "@/components/card/SiteCard";

export const metadata: Metadata = {
  title: "Karta miejsca · TRAKTOR",
  description: "Karta miejsca zastawki do druku: parametry, polecenie, ścieżka prawna. Wymaga wizji lokalnej.",
};

export default function Page() {
  return (
    <Suspense fallback={<ProgressLine />}>
      <SiteCard />
    </Suspense>
  );
}
