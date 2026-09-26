type Labels = Record<string, string | number | boolean | undefined>;

interface MetricPoint {
  name: string;
  help: string;
  labels: Record<string, string>;
  value: number;
}

interface ObservabilityRegistry {
  counters: Map<string, MetricPoint>;
  gauges: Map<string, MetricPoint>;
}

const globalRegistry = globalThis as typeof globalThis & {
  __programmingTutorMetrics?: ObservabilityRegistry;
};

const registry =
  globalRegistry.__programmingTutorMetrics ??
  (globalRegistry.__programmingTutorMetrics = {
    counters: new Map<string, MetricPoint>(),
    gauges: new Map<string, MetricPoint>(),
  });

function normalizeLabels(labels: Labels): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, String(value)]),
  );
}

function metricKey(name: string, labels: Record<string, string>): string {
  return `${name}:${JSON.stringify(labels)}`;
}

export function incrementCounter(
  name: string,
  help: string,
  labels: Labels = {},
  amount = 1,
): void {
  const normalized = normalizeLabels(labels);
  const key = metricKey(name, normalized);
  const point = registry.counters.get(key) ?? {
    name,
    help,
    labels: normalized,
    value: 0,
  };
  point.value += amount;
  registry.counters.set(key, point);
}

export function setGauge(
  name: string,
  help: string,
  labels: Labels,
  value: number,
): void {
  const normalized = normalizeLabels(labels);
  registry.gauges.set(metricKey(name, normalized), {
    name,
    help,
    labels: normalized,
    value,
  });
}

export function observeHttpRequest(
  route: string,
  method: string,
  status: number,
  durationMs: number,
): void {
  const labels = { route, method, status: String(status) };
  incrementCounter(
    "programming_tutor_http_requests_total",
    "Total HTTP requests handled by the application.",
    labels,
  );
  incrementCounter(
    "programming_tutor_http_request_duration_seconds_sum",
    "Accumulated HTTP request duration in seconds.",
    labels,
    durationMs / 1_000,
  );
  incrementCounter(
    "programming_tutor_http_request_duration_seconds_count",
    "Number of observed HTTP request durations.",
    labels,
  );
}

export function observeTraceSpan(
  name: string,
  status: "ok" | "error" | undefined,
  durationMs: number | undefined,
): void {
  const labels = { span: name, status: status ?? "unset" };
  incrementCounter(
    "programming_tutor_trace_spans_total",
    "Total completed trace spans.",
    labels,
  );
  if (durationMs !== undefined) {
    incrementCounter(
      "programming_tutor_trace_span_duration_seconds_sum",
      "Accumulated trace span duration in seconds.",
      labels,
      durationMs / 1_000,
    );
    incrementCounter(
      "programming_tutor_trace_span_duration_seconds_count",
      "Number of observed trace span durations.",
      labels,
    );
  }
}

export function recordLlmTokenMetrics(
  agent: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  estimatedCost: number,
): void {
  const labels = { agent, model };
  incrementCounter(
    "programming_tutor_llm_prompt_tokens_total",
    "Total prompt tokens reported by LLM providers.",
    labels,
    promptTokens,
  );
  incrementCounter(
    "programming_tutor_llm_completion_tokens_total",
    "Total completion tokens reported by LLM providers.",
    labels,
    completionTokens,
  );
  incrementCounter(
    "programming_tutor_llm_estimated_cost_total",
    "Estimated LLM cost using configured per-token pricing.",
    labels,
    estimatedCost,
  );
}

export function recordEvaluationOutcome(
  status: string,
  branch: string,
  failureKind?: string,
): void {
  incrementCounter(
    "programming_tutor_evaluation_runs_total",
    "Total evaluation runs by terminal status.",
    {
      status,
      branch,
      failure_kind: failureKind ?? "none",
    },
  );
}

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

function renderLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(",")}}`;
}

export function renderPrometheusMetrics(): string {
  const points = [...registry.counters.values(), ...registry.gauges.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      JSON.stringify(left.labels).localeCompare(JSON.stringify(right.labels)),
  );
  const metadata = new Map<string, { help: string; type: "counter" | "gauge" }>();
  for (const point of registry.counters.values()) {
    metadata.set(point.name, { help: point.help, type: "counter" });
  }
  for (const point of registry.gauges.values()) {
    metadata.set(point.name, { help: point.help, type: "gauge" });
  }

  const output: string[] = [];
  let previousName = "";
  for (const point of points) {
    if (point.name !== previousName) {
      const meta = metadata.get(point.name)!;
      output.push(`# HELP ${point.name} ${meta.help}`);
      output.push(`# TYPE ${point.name} ${meta.type}`);
      previousName = point.name;
    }
    output.push(`${point.name}${renderLabels(point.labels)} ${point.value}`);
  }
  return `${output.join("\n")}\n`;
}

export function resetMetricsForTests(): void {
  registry.counters.clear();
  registry.gauges.clear();
}
