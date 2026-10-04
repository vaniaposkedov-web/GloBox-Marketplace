import type { Metadata } from "next";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Globox — теплые находки каждый день",
  description:
    "Маркетплейс с быстрой доставкой, честными отзывами и кэшбэком. Женская одежда, красота, электроника и дом.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <ConfigProvider
          locale={ruRU}
          theme={{
            token: {
              colorPrimary: "#d97706",
              colorLink: "#b85f00",
              colorSuccess: "#16a34a",
              colorWarning: "#f59e0b",
              colorError: "#dc2626",
              borderRadius: 12,
              borderRadiusLG: 16,
              colorBgBase: "#fff8f0",
              colorTextBase: "#3b2415",
              colorBorder: "#f0dcc5",
              colorBorderSecondary: "#f6e6d2",
              fontFamily:
                "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            },
            components: {
              Button: {
                controlHeight: 40,
                controlHeightLG: 48,
                fontWeight: 500,
              },
              Input: {
                controlHeight: 40,
                controlHeightLG: 48,
                activeBorderColor: "#d97706",
                hoverBorderColor: "#f59e0b",
              },
              Card: {
                borderRadiusLG: 16,
              },
              Segmented: {
                itemSelectedBg: "#fff1dd",
                itemSelectedColor: "#b85f00",
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
