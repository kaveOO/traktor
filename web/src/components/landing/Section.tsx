import type { ReactNode } from "react";
import { Eyebrow } from "@/components/brand/ui";

const GROUND = {
  forest: "bg-forest text-cream",
  cream: "bg-cream text-forest",
  "cream-deep": "bg-cream-deep text-forest",
} as const;

/** One idea per surface: eyebrow, H1-ish headline, content. */
export function Section({
  id,
  ground,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  ground: keyof typeof GROUND;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className={`${GROUND[ground]} scroll-mt-16`}>
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <Eyebrow className="opacity-80">{eyebrow}</Eyebrow>
        <h2 className="hd mt-4 max-w-4xl text-[40px] md:text-[64px]">{title}</h2>
        {lead && <p className="mt-6 max-w-2xl text-[18px] leading-[1.5] md:text-[20px]">{lead}</p>}
        {children && <div className="mt-12 md:mt-16">{children}</div>}
      </div>
    </section>
  );
}
