"use client";
import * as React from "react";

type Theme = "light" | "dark";

// The theme lives on <body data-theme>, set before paint by the layout's script; this reads it as an external store.
const subscribe = (notify: () => void) => {
  const watch = new MutationObserver(notify);
  watch.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
  return () => watch.disconnect();
};
const current = (): Theme => (document.body.dataset.theme === "dark" ? "dark" : "light");
const onServer = (): Theme => "light";

export function ThemeToggle() {
  const theme = React.useSyncExternalStore(subscribe, current, onServer);
  const flip = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.body.dataset.theme = next;
    try {
      localStorage.setItem("hs-theme", next);
    } catch {}
  };
  return (
    <button type="button" className="hs-button" onClick={flip} aria-label={`Ganti ke tema ${theme === "light" ? "gelap" : "terang"}`}>
      {theme === "light" ? "Tema gelap" : "Tema terang"}
    </button>
  );
}
