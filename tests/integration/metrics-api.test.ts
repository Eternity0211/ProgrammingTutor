import { NextRequest } from "next/server";
import { GET } from "@/app/api/metrics/route";
import {
  incrementCounter,
  resetMetricsForTests,
} from "@/server/observability/metrics";

describe("metrics API", () => {
  const originalToken = process.env.METRICS_TOKEN;

  beforeEach(() => {
    process.env.METRICS_TOKEN = "monitoring-secret";
    resetMetricsForTests();
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.METRICS_TOKEN;
    else process.env.METRICS_TOKEN = originalToken;
  });

  it("rejects requests without the bearer token", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/metrics"),
    );
    expect(response.status).toBe(401);
  });

  it("returns Prometheus text for an authorized collector", async () => {
    incrementCounter("test_counter_total", "Test counter.");
    const response = await GET(
      new NextRequest("http://localhost/api/metrics", {
        headers: { authorization: "Bearer monitoring-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("test_counter_total 1");
  });
});
