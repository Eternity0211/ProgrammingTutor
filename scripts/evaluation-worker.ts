import "dotenv/config";
import { runEvaluationWorker } from "../src/server/model/pipeline/evaluation-job-service";

const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => controller.abort());
}

const pollMs = Number(process.env.EVALUATION_WORKER_POLL_MS ?? 1_000);
const leaseMs = Number(process.env.EVALUATION_WORKER_LEASE_MS ?? 120_000);

runEvaluationWorker({
  signal: controller.signal,
  pollMs: Number.isFinite(pollMs) && pollMs > 0 ? pollMs : 1_000,
  leaseMs: Number.isFinite(leaseMs) && leaseMs >= 15_000 ? leaseMs : 120_000,
}).catch((error) => {
  console.error("Evaluation worker stopped unexpectedly", error);
  process.exitCode = 1;
});
