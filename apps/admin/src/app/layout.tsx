import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GloBox Admin — Панель управления",
  description: "Управление поставщиками, покупателями и модерация",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
