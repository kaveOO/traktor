import { Logo } from "@/components/brand/Logo";

/* Placeholder. Owned by the landing lane (feat/landing). */
export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-forest text-cream">
      <div className="text-center">
        <Logo color="cream" height={40} />
        <p className="hd mt-6 text-5xl">Let the land hold its water.</p>
      </div>
    </main>
  );
}
