import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "ForkRight — Continuity before crisis", description: "GenLayer continuity covenants for open-source projects." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fonts = {
    "--font-display": '"Bodoni 72", "Bodoni MT", Didot, Georgia, serif',
    "--font-body": 'Aptos, "Segoe UI", sans-serif',
    "--font-mono": '"Cascadia Mono", Consolas, monospace',
  } as CSSProperties;
  return <html lang="en"><body style={fonts}>{children}</body></html>;
}
