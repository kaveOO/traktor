import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "TRAKTOR · Niech ziemia zatrzyma swoją wodę",
  description:
    "TRAKTOR zamienia istniejące rowy melioracyjne w odwracalny magazyn wody. Jedna zastawka. Dwa tryby: TRZYMAJ i OTWÓRZ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${archivo.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-forest">{children}</body>
    </html>
  );
}
