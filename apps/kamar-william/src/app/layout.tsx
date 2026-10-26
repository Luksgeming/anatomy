import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kamar William",
  description: "Kamar William 3 × 3 × 3 m dalam 3D: masuk, lihat sekeliling, dan atur lampu oranye yang remang.",
};

export const viewport: Viewport = { themeColor: "#0d0b0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
