import { recordDependencyCall } from "@/server/observability/metrics";

export type DependencyFailureCode =
  | "timeout"
  | "circuit_open"
  | "bulkhead_full";

export class DependencyUnavailableError extends Error {
  readonly retryable = true;

  constructor(
    readonly dependency: string,
    readonly code: DependencyFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DependencyUnavailableError";
  }
}

export interface DependencyPolicy<T = unknown> {
  dependency: string;
  timeoutMs: number;
  failureThreshold: number;
  resetAfterMs: number;
  maxConcurrent: number;
  maxQueue: number;
  isFailure?: (result: T) => boolean;
}

type PolicyLimits = Pick<
  DependencyPolicy<never>,
  | "dependency"
  | "failureThreshold"
  | "resetAfterMs"
  | "maxConcurrent"
  | "maxQueue"
>;

interface CircuitState {
  failures: number;
  openUntil: number;
  halfOpenProbe: boolean;
}

interface QueuedOperation<T> {
  operation: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

class Bulkhead {
  private active = 0;
  private readonly queue: QueuedOperation<unknown>[] = [];

  constructor(
    private readonly dependency: string,
    private readonly maxConcurrent: number,
    private readonly maxQueue: number,
  ) {}

  run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active < this.maxConcurrent) return this.start(operation);
    if (this.queue.length >= this.maxQueue) {
      return Promise.reject(
        new DependencyUnavailableError(
          this.dependency,
          "bulkhead_full",
          `${this.dependency} concurrency queue is full`,
        ),
      );
    }
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        operation,
        resolve: resolve as QueuedOperation<unknown>["resolve"],
        reject,
      });
    });
  }

  private async start<T>(operation: () => Promise<T>): Promise<T> {
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) {
        void this.start(next.operation).then(next.resolve, next.reject);
      }
    }
  }
}

interface ResilienceState {
  circuits: Map<string, CircuitState>;
  bulkheads: Map<string, Bulkhead>;
}

const globalState = globalThis as typeof globalThis & {
  __programmingTutorResilience?: ResilienceState;
};

const state =
  globalState.__programmingTutorResilience ??
  (globalState.__programmingTutorResilience = {
    circuits: new Map<string, CircuitState>(),
    bulkheads: new Map<string, Bulkhead>(),
  });

function circuitFor(dependency: string): CircuitState {
  const current = state.circuits.get(dependency) ?? {
    failures: 0,
    openUntil: 0,
    halfOpenProbe: false,
  };
  state.circuits.set(dependency, current);
  return current;
}

function bulkheadFor(policy: PolicyLimits): Bulkhead {
  const key = `${policy.dependency}:${policy.maxConcurrent}:${policy.maxQueue}`;
  const current =
    state.bulkheads.get(key) ??
    new Bulkhead(policy.dependency, policy.maxConcurrent, policy.maxQueue);
  state.bulkheads.set(key, current);
  return current;
}

function assertCircuitAvailable(policy: PolicyLimits): CircuitState {
  const circuit = circuitFor(policy.dependency);
  const now = Date.now();
  if (circuit.openUntil > now) {
    throw new DependencyUnavailableError(
      policy.dependency,
      "circuit_open",
      `${policy.dependency} circuit is open`,
    );
  }
  if (circuit.openUntil > 0) {
    if (circuit.halfOpenProbe) {
      throw new DependencyUnavailableError(
        policy.dependency,
        "circuit_open",
        `${policy.dependency} circuit is waiting for a recovery probe`,
      );
    }
    circuit.halfOpenProbe = true;
  }
  return circuit;
}

function markSuccess(circuit: CircuitState): void {
  circuit.failures = 0;
  circuit.openUntil = 0;
  circuit.halfOpenProbe = false;
}

function markFailure(
  circuit: CircuitState,
  policy: PolicyLimits,
): void {
  circuit.failures += 1;
  circuit.halfOpenProbe = false;
  if (circuit.failures >= policy.failureThreshold) {
    circuit.openUntil = Date.now() + policy.resetAfterMs;
  }
}

export async function runWithDependencyGuard<T>(
  policy: DependencyPolicy<T>,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  let outcome = "success";
  try {
    const circuit = assertCircuitAvailable(policy);
    return await bulkheadFor(policy).run(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
      try {
        const result = await Promise.race([
          operation(controller.signal),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener(
              "abort",
              () => reject(new Error("DependencyGuardTimeout")),
              { once: true },
            );
          }),
        ]);
        if (policy.isFailure?.(result)) {
          outcome = "upstream_error";
          markFailure(circuit, policy);
        } else {
          markSuccess(circuit);
        }
        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          outcome = "timeout";
          markFailure(circuit, policy);
          throw new DependencyUnavailableError(
            policy.dependency,
            "timeout",
            `${policy.dependency} timed out after ${policy.timeoutMs}ms`,
            { cause: error },
          );
        }
        outcome =
          error instanceof DependencyUnavailableError ? error.code : "error";
        markFailure(circuit, policy);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
  } catch (error) {
    if (error instanceof DependencyUnavailableError) outcome = error.code;
    throw error;
  } finally {
    recordDependencyCall(
      policy.dependency,
      outcome,
      performance.now() - startedAt,
    );
  }
}

export function dependencyPolicy(
  dependency: "deepseek" | "embedding" | "judge0" | "neo4j",
): Omit<DependencyPolicy<unknown>, "isFailure"> {
  const prefix = dependency.toUpperCase();
  const defaults = {
    deepseek: { timeout: 30_000, concurrent: 12, queue: 50 },
    embedding: { timeout: 15_000, concurrent: 6, queue: 30 },
    judge0: { timeout: 20_000, concurrent: 8, queue: 50 },
    neo4j: { timeout: 5_000, concurrent: 16, queue: 50 },
  }[dependency];
  return {
    dependency,
    timeoutMs: Number(process.env[`${prefix}_TIMEOUT_MS`] ?? defaults.timeout),
    failureThreshold: Number(
      process.env[`${prefix}_CIRCUIT_FAILURE_THRESHOLD`] ?? 5,
    ),
    resetAfterMs: Number(
      process.env[`${prefix}_CIRCUIT_RESET_MS`] ?? 30_000,
    ),
    maxConcurrent: Number(
      process.env[`${prefix}_MAX_CONCURRENCY`] ?? defaults.concurrent,
    ),
    maxQueue: Number(process.env[`${prefix}_MAX_QUEUE`] ?? defaults.queue),
  };
}

export function createResilientFetch(
  dependency: "deepseek" | "embedding" | "judge0",
): typeof fetch {
  const policy: DependencyPolicy<Response> = {
    ...dependencyPolicy(dependency),
    isFailure: (response) => response.status === 429 || response.status >= 500,
  };
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    runWithDependencyGuard(policy, async (guardSignal) => {
      const signal = init?.signal
        ? AbortSignal.any([init.signal, guardSignal])
        : guardSignal;
      return fetch(input, { ...init, signal });
    })) as typeof fetch;
}

export function resetDependencyGuardsForTests(): void {
  state.circuits.clear();
  state.bulkheads.clear();
}
