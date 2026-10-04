import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GloBox Seller — Кабинет поставщика",
  description: "Личный кабинет поставщика GloBox на рынке Садовод.",
  icons: { icon: "/favicon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GloBox Seller" },
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
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
