import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "/#jak", label: "Jak to działa" },
  { href: "/mapa", label: "Miejsca" },
  { href: "/metoda", label: "Dane" },
  { href: "/slides", label: "Prezentacja" },
];

/** Sticky top bar: small cream logo top-left, plain links. Forest ground, translucent over the hero. */
export function SiteNav({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`no-print sticky top-0 z-40 text-cream ${
        solid ? "bg-forest" : "bg-forest/80 backdrop-blur-[6px]"
      }`}
    >
      <nav
        aria-label="Główna nawigacja"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8"
      >
        <Link href="/" aria-label="TRAKTOR, strona główna" className="shrink-0">
          <Logo color="cream" height={18} />
        </Link>
        <ul className="flex items-center gap-4 text-[14px] md:gap-7 md:text-[15px]">
          {LINKS.map((l, i) => (
            <li key={l.href} className={i === 1 ? "" : "hidden sm:block"}>
              <Link
                href={l.href}
                className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
