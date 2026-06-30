"use client";

import { useEffect } from "react";

// Registers /sw.js once when the app mounts — keeps layout.tsx a Server Component.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // SW registration failure is non-fatal; app works without push.
        });
    }
  }, []);

  return null;
}
