"use client";
import { useCallback, useEffect, useState } from "react";
import type { Position } from "@yield-copilot/shared";

const STORAGE_KEY = "yield-copilot:position";

export function useLocalPosition() {
  const [position, setPosition] = useState<Position | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPosition(JSON.parse(raw) as Position);
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore storage errors
    }
    setPosition(pos);
  }, []);

  const clearPosition = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPosition(null);
  }, []);

  return { position, hydrated, savePosition, clearPosition };
}
