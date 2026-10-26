import type { Metadata } from "next";
import "@anatomy/iso-kit/iso.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rumah Tropis",
  description: "Rumah tropis modern dua lantai dengan kebun pangan dan homestead, digambar isometrik dan hidup.",
};

// Applies the saved theme before first paint, so a dark reader never sees a light flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("hs-theme");if(t==="dark"||t==="light")document.body.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="iso" data-theme="light" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
