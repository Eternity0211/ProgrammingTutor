import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const statusPath = path.join(process.cwd(), ".data", "e2e-status.json");

function escapeWorkflowCommand(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export default class E2eStatusReporter {
  failures = [];

  onTestEnd(test, result) {
    if (result.status === test.expectedStatus) return;

    const title = test.titlePath().join(" > ");
    const messages = result.errors
      .map((error) => error.message || error.value || String(error))
      .filter(Boolean);
    const message =
      messages.join("\n\n") || `Unexpected status: ${result.status}`;
    const failure = {
      title,
      status: result.status,
      retry: result.retry,
      message,
    };

    this.failures.push(failure);
    if (process.env.GITHUB_ACTIONS === "true") {
      console.log(
        `::error title=${escapeWorkflowCommand(title)}::${escapeWorkflowCommand(message)}`,
      );
    }
  }

  async onEnd(result) {
    await mkdir(path.dirname(statusPath), { recursive: true });
    await writeFile(
      statusPath,
      JSON.stringify({
        status: result.status,
        finishedAt: new Date().toISOString(),
        failures: this.failures,
      }),
      "utf8",
    );
  }
}
