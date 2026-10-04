import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "GloBox Посредник",
  description: "Кабинет посредника GloBox — выкупайте товары на рынке и передавайте покупателям.",
  manifest: `${base}/manifest.json`,
  icons: { icon: `${base}/favicon.svg` },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GloBox" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
