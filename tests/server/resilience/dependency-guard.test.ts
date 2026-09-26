import {
  DependencyUnavailableError,
  resetDependencyGuardsForTests,
  runWithDependencyGuard,
  type DependencyPolicy,
} from "@/server/resilience/dependency-guard";
import { resetMetricsForTests } from "@/server/observability/metrics";

const policy: DependencyPolicy<string> = {
  dependency: "test-service",
  timeoutMs: 20,
  failureThreshold: 2,
  resetAfterMs: 30,
  maxConcurrent: 1,
  maxQueue: 1,
};

describe("dependency guard", () => {
  beforeEach(() => {
    resetDependencyGuardsForTests();
    resetMetricsForTests();
  });

  it("aborts a dependency call after its deadline", async () => {
    await expect(
      runWithDependencyGuard(policy, (signal) =>
        new Promise<string>((resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
          setTimeout(() => resolve("late"), 100);
        }),
      ),
    ).rejects.toMatchObject({ code: "timeout", retryable: true });
  });

  it("opens the circuit after consecutive failures and later probes recovery", async () => {
    const failing = () =>
      runWithDependencyGuard(policy, async () => {
        throw new Error("offline");
      });
    await expect(failing()).rejects.toThrow("offline");
    await expect(failing()).rejects.toThrow("offline");
    await expect(failing()).rejects.toMatchObject({ code: "circuit_open" });

    await new Promise((resolve) => setTimeout(resolve, 35));
    await expect(
      runWithDependencyGuard(policy, async () => "recovered"),
    ).resolves.toBe("recovered");
  });

  it("rejects excess work when both concurrency and queue are full", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = runWithDependencyGuard(policy, async () => {
      await blocked;
      return "first";
    });
    const second = runWithDependencyGuard(policy, async () => "second");
    await expect(
      runWithDependencyGuard(policy, async () => "third"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DependencyUnavailableError>>({
        code: "bulkhead_full",
      }),
    );
    release();
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
  });
});
