"use client";

import { useEffect, useRef, useState } from "react";
import PartViewer from "./part-viewer";

/**
 * Mounts the 3D viewer only while the card is on (or near) screen, and unmounts
 * it when scrolled away — so a large grid never exceeds the browser's WebGL
 * context limit.
 */
export default function LazyPartViewer({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setShow(e.isIntersecting)),
      { rootMargin: "250px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {show ? (
        <PartViewer src={src} />
      ) : (
        <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-faint)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.5 }}>
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
