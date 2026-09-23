import { assertProductionConfig } from "@/server/config";

/** Fail fast before serving traffic when production dependencies are missing. */
export function register(): void {
  assertProductionConfig();
}
