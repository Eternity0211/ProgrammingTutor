import { NextRequest, NextResponse } from "next/server";
import { incrementCounter } from "@/server/observability/metrics";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface RateLimitState {
  buckets: Map<string, RateLimitBucket>;
  operations: number;
}

const globalState = globalThis as typeof globalThis & {
  __programmingTutorRateLimits?: RateLimitState;
};

const state =
  globalState.__programmingTutorRateLimits ??
  (globalState.__programmingTutorRateLimits = {
    buckets: new Map<string, RateLimitBucket>(),
    operations: 0,
  });

function cleanupExpiredBuckets(now: number): void {
  state.operations += 1;
  if (state.operations % 100 !== 0) return;
  for (const [key, bucket] of state.buckets) {
    if (bucket.resetAt <= now) state.buckets.delete(key);
  }
}

export function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitDecision {
  cleanupExpiredBuckets(now);
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const key = `${scope}:${identifier}`;
  const current = state.buckets.get(key);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
  bucket.count += 1;
  state.buckets.set(key, bucket);

  const allowed = bucket.count <= normalizedLimit;
  const remaining = Math.max(0, normalizedLimit - bucket.count);
  incrementCounter(
    "programming_tutor_rate_limit_decisions_total",
    "Total API rate limit decisions.",
    { scope, outcome: allowed ? "allowed" : "rejected" },
  );
  return {
    allowed,
    limit: normalizedLimit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

export function rateLimitForUser(
  scope: "dialogue" | "submission" | "mcp",
  userId: string,
): RateLimitDecision {
  const fallback = Number(process.env.RATE_LIMIT_MAX ?? 25);
  const configured = Number(
    process.env[`${scope.toUpperCase()}_RATE_LIMIT_MAX`] ?? fallback,
  );
  const configuredWindow = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  return consumeRateLimit(
    scope,
    userId,
    Number.isFinite(configured) ? configured : fallback,
    Number.isFinite(configuredWindow) && configuredWindow > 0
      ? configuredWindow
      : 60_000,
  );
}

export function rateLimitRejected(
  decision: RateLimitDecision,
): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryable: true,
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "retry-after": String(decision.retryAfterSeconds),
        "x-ratelimit-limit": String(decision.limit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.ceil(decision.resetAt / 1_000)),
      },
    },
  );
}

export function rejectOversizedRequest(
  request: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength <= maxBytes) return null;
  return NextResponse.json(
    { error: "Request payload is too large", maxBytes },
    { status: 413 },
  );
}

export function resetRateLimitsForTests(): void {
  state.buckets.clear();
  state.operations = 0;
}
