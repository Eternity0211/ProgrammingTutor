import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const statusPath = path.join(process.cwd(), ".data", "e2e-status.json");

export default class E2eStatusReporter {
  async onEnd(result) {
    await mkdir(path.dirname(statusPath), { recursive: true });
    await writeFile(
      statusPath,
      JSON.stringify({
        status: result.status,
        finishedAt: new Date().toISOString(),
      }),
      "utf8",
    );
  }
}
