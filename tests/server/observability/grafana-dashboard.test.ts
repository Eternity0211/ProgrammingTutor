import { readFileSync } from "node:fs";
import path from "node:path";

type DashboardPanel = {
  id: number;
  title: string;
  targets?: Array<{ expr?: string }>;
};

describe("provisioned Grafana dashboard", () => {
  const dashboard = JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        "ops/observability/grafana/dashboards/programming-tutor.json",
      ),
      "utf8",
    ),
  ) as { panels: DashboardPanel[] };

  it("uses unique panel ids", () => {
    const ids = dashboard.panels.map((panel) => panel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("visualizes recommendation engagement and click-through rate", () => {
    const panels = dashboard.panels.filter((panel) =>
      panel.targets?.some((target) =>
        target.expr?.includes(
          "programming_tutor_exercise_recommendation_events_total",
        ),
      ),
    );

    expect(panels.map((panel) => panel.title)).toEqual(
      expect.arrayContaining([
        "Exercise recommendation engagement",
        "Exercise recommendation click-through rate",
      ]),
    );
  });
});
