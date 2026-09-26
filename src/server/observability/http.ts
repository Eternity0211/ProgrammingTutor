import { observeHttpRequest } from "./metrics";
import { logger } from "./logger";

export async function observeRoute(
  route: string,
  method: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const startedAt = performance.now();
  let status = 500;
  try {
    const response = await handler();
    status = response.status;
    return response;
  } catch (error) {
    logger.error("http.request.unhandled", { route, method, error });
    throw error;
  } finally {
    const durationMs = performance.now() - startedAt;
    observeHttpRequest(route, method, status, durationMs);
    logger.info("http.request.completed", {
      route,
      method,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  }
}
