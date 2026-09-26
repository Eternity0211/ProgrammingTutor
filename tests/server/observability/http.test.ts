import { observeRoute } from "@/server/observability/http";
import {
  renderPrometheusMetrics,
  resetMetricsForTests,
} from "@/server/observability/metrics";

describe("HTTP observability wrapper", () => {
  beforeEach(() => resetMetricsForTests());

  it("records the returned status code", async () => {
    const output = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await observeRoute("/api/test", "POST", async () =>
      Response.json({ ok: true }, { status: 202 }),
    );

    expect(response.status).toBe(202);
    expect(renderPrometheusMetrics()).toContain(
      'programming_tutor_http_requests_total{method="POST",route="/api/test",status="202"} 1',
    );
    output.mockRestore();
  });

  it("records an unhandled exception as HTTP 500", async () => {
    const info = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      observeRoute("/api/test", "GET", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(renderPrometheusMetrics()).toContain(
      'programming_tutor_http_requests_total{method="GET",route="/api/test",status="500"} 1',
    );
    info.mockRestore();
    error.mockRestore();
  });
});
