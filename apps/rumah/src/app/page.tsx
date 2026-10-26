import { Suspense } from "react";
import { connection } from "next/server";
import { HomesteadFigure } from "@/figures/homestead/HomesteadFigure";
import { ThemeToggle } from "@/components/ThemeToggle";

const EDITABLE = process.env.NODE_ENV !== "production" || Boolean(process.env.HS_EDIT_TOKEN);

// The scene is read per request, so changes made from the edit box show up without rebuilding the site.
async function Figure() {
  await connection();
  return <HomesteadFigure editable={EDITABLE} />;
}

export default function Home() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Rumah Tropis</h1>
          <p>Rumah tropis modern dua lantai dengan carport, kebun pangan, pohon buah dan zona homestead.</p>
        </div>
        <ThemeToggle />
      </header>
      <Suspense fallback={<div className="page-loading">Memuat rumah…</div>}>
        <Figure />
      </Suspense>
    </main>
  );
}
