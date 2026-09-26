import { NextRequest } from "next/server";
import {
  consumeRateLimit,
  rejectOversizedRequest,
  resetRateLimitsForTests,
} from "@/server/resilience/rate-limiter";
import { resetMetricsForTests } from "@/server/observability/metrics";

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
    resetMetricsForTests();
  });

  it("isolates counters by scope and user", () => {
    expect(consumeRateLimit("dialogue", "user-1", 2, 1_000, 0).allowed).toBe(true);
    expect(consumeRateLimit("dialogue", "user-1", 2, 1_000, 1).allowed).toBe(true);
    expect(consumeRateLimit("dialogue", "user-1", 2, 1_000, 2)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(consumeRateLimit("dialogue", "user-2", 2, 1_000, 2).allowed).toBe(true);
    expect(consumeRateLimit("mcp", "user-1", 2, 1_000, 2).allowed).toBe(true);
  });

  it("resets a bucket after its window", () => {
    expect(consumeRateLimit("dialogue", "user-1", 1, 1_000, 0).allowed).toBe(true);
    expect(consumeRateLimit("dialogue", "user-1", 1, 1_000, 500).allowed).toBe(false);
    expect(consumeRateLimit("dialogue", "user-1", 1, 1_000, 1_001).allowed).toBe(true);
  });

  it("rejects a request whose declared body is too large", async () => {
    const request = new NextRequest("http://localhost/api/dialogue", {
      method: "POST",
      headers: { "content-length": "1025" },
    });
    const response = rejectOversizedRequest(request, 1024);
    expect(response?.status).toBe(413);
    expect(await response?.json()).toMatchObject({ maxBytes: 1024 });
  });
});
