import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Creator Camp",
  description: "ツールの購入から、90日のスクール、修了後の専門コースまで。課題の提出も相談も、公式LINEでできます。",
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
