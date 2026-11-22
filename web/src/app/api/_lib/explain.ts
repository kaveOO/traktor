import { decideOrder, fmtRange, type Conditions, type CrestHeight, type Site } from "@/lib/traktor";

const ACTION_PL = { TRZYMAJ: "TRZYMAJ", OTWORZ: "OTWÓRZ", NIE_RUSZAJ: "NIE RUSZAJ" } as const;

/** Deterministic Polish explanation. Numbers come from code only. */
export function templateText(site: Site, crestCm: CrestHeight, c: Conditions): string {
  const crest = site.crests.find((k) => k.heightCm === crestCm);
  const s: string[] = [];
  s.push(`Zastawka ${site.id} stoi na rowie ${site.name}.`);
  if (!crest) {
    s.push(`Nie mamy obliczeń dla wysokości ${crestCm} cm.`);
  } else if (crest.status === "refused") {
    s.push(
      crest.refusal?.messagePl ?? `Przy ${crestCm} cm to miejsce jest zbyt ryzykowne.`,
      `Tej wysokości nie stosujemy${site.maxAcceptedCrestCm ? `, maksimum to ${site.maxAcceptedCrestCm} cm` : ""}.`,
    );
  } else {
    s.push(
      `Przy ${crestCm} cm rów zatrzyma ${fmtRange(crest.storageM3, "m³")} wody na odcinku ${crest.backwaterM} m.`,
      `Woda wraca pod ${fmtRange(crest.rehydratedHa, "ha")} pól.`,
    );
  }
  const okCrest = crest?.status === "accepted" ? crestCm : site.maxAcceptedCrestCm;
  const order = decideOrder(site, c, okCrest);
  s.push(`Teraz: ${ACTION_PL[order.action]}. ${order.reasons[0] ?? ""}`.trim());
  s.push("Wymaga wizji lokalnej.");
  return s.join(" ");
}

const NUM_RE = /[−-]?\d+(?:[.,\s]\d+)*/g;

/** Ask Claude to rewrite the template with placeholders only, then apply the number guard. */
export async function llmRewrite(template: string, apiKey: string): Promise<string | null> {
  const tokens: string[] = [];
  const masked = template.replace(NUM_RE, (m) => {
    tokens.push(m);
    return `{${tokens.length - 1}}`;
  });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 300,
        system:
          "Przepisujesz krótkie komunikaty dla rolnika na prosty polski. 3-4 krótkie zdania. Ton: krótko, prosto, pewnie. " +
          "Nie dodawaj żadnych liczb ani faktów. Liczby występują tylko jako znaczniki {0}, {1}... – zachowaj je bez zmian. " +
          "Słowa TRZYMAJ, OTWÓRZ, NIE RUSZAJ zostaw bez zmian. Ostatnie zdanie: \"Wymaga wizji lokalnej.\" Zwróć tylko tekst.",
        messages: [{ role: "user", content: masked }],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = j.content?.find((b) => b.type === "text")?.text?.trim();
    if (!raw || raw.length > 900) return null;
    let bad = false;
    const out = raw.replace(/\{(\d+)\}/g, (_, i: string) => {
      const t = tokens[Number(i)];
      if (t === undefined) bad = true;
      return t ?? "";
    });
    if (bad) return null;
    // NUMBER GUARD: every digit sequence in the output must exist in the template
    const allowed = new Set(template.match(/\d+/g) ?? []);
    for (const d of out.match(/\d+/g) ?? []) if (!allowed.has(d)) return null;
    if (!out.includes("wizji lokalnej")) return null;
    return out;
  } catch {
    return null;
  }
}
