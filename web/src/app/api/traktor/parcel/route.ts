import { mapFeatures, sites } from "@/lib/traktor";
import { json } from "../../_lib/util";

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("id") ?? sp.get("q") ?? "").trim().toLowerCase();
    if (!q) return json({ error: "Podaj ?id= lub ?q=" }, 400);
    const ps = mapFeatures.parcels;
    const parcel = ps.find((p) => p.id.toLowerCase() === q) ?? ps.find((p) => p.id.toLowerCase().includes(q));
    if (!parcel) return json({ error: "Nie znaleziono działki", q }, 404);
    const siteIds = sites
      .filter((s) => s.ownParcels.includes(parcel.id) || s.crests.some((k) => k.refusal?.objectRef === parcel.id))
      .map((s) => s.id);
    return json({ parcel, siteIds });
  } catch {
    return json({ error: "Błąd wyszukiwania" }, 500);
  }
}
