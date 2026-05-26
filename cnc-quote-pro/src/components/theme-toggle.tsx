"use client";

import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Light / Dark">
      {theme === "dark" ? (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" strokeLinecap="round" />
        </svg>
      ) : (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8Z" />
        </svg>
      )}
    </button>
  );
}
