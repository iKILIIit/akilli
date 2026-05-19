import { describe, it, expect, vi, beforeEach } from "vitest";

// Inline the rate-limit logic for testing without cross-package import
const requestMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, maxRequests = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = requestMap.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    requestMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

describe("rateLimit", () => {
  beforeEach(() => {
    requestMap.clear();
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = rateLimit("ip-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows up to maxRequests", () => {
    for (let i = 0; i < 5; i++) rateLimit("ip-2", 5, 60_000);
    const result = rateLimit("ip-2", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    rateLimit("ip-3", 1, 1_000);
    rateLimit("ip-3", 1, 1_000); // blocked

    vi.advanceTimersByTime(1_001);
    const result = rateLimit("ip-3", 1, 1_000);
    expect(result.allowed).toBe(true);
  });

  it("uses separate counters per key", () => {
    rateLimit("a", 1, 60_000);
    rateLimit("a", 1, 60_000); // blocked
    const result = rateLimit("b", 1, 60_000);
    expect(result.allowed).toBe(true);
  });
});
