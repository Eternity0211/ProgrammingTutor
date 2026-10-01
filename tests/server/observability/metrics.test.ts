import {
  incrementCounter,
  observeHttpRequest,
  recordEvaluationJobTransition,
  recordExerciseRecommendationEvent,
  recordLlmTokenMetrics,
  renderPrometheusMetrics,
  resetMetricsForTests,
} from "@/server/observability/metrics";

describe("observability metrics", () => {
  beforeEach(() => resetMetricsForTests());

  it("renders counters with stable escaped labels", () => {
    incrementCounter("example_total", "Example counter.", { route: '/a"b' });
    incrementCounter("example_total", "Example counter.", { route: '/a"b' }, 2);

    const output = renderPrometheusMetrics();
    expect(output).toContain("# TYPE example_total counter");
    expect(output).toContain('example_total{route="/a\\"b"} 3');
  });

  it("records HTTP latency and LLM usage", () => {
    observeHttpRequest("/api/dialogue", "POST", 200, 250);
    recordLlmTokenMetrics("dialogue", "deepseek-chat", 100, 20, 0.001);

    const output = renderPrometheusMetrics();
    expect(output).toContain(
      'programming_tutor_http_requests_total{method="POST",route="/api/dialogue",status="200"} 1',
    );
    expect(output).toContain(
      'programming_tutor_http_request_duration_seconds_sum{method="POST",route="/api/dialogue",status="200"} 0.25',
    );
    expect(output).toContain(
      'programming_tutor_llm_prompt_tokens_total{agent="dialogue",model="deepseek-chat"} 100',
    );
  });

  it("records durable evaluation queue transitions", () => {
    recordEvaluationJobTransition("queued");
    recordEvaluationJobTransition("completed");

    const output = renderPrometheusMetrics();
    expect(output).toContain(
      'programming_tutor_evaluation_jobs_total{status="queued"} 1',
    );
    expect(output).toContain(
      'programming_tutor_evaluation_jobs_total{status="completed"} 1',
    );
  });

  it("records low-cardinality recommendation funnel events", () => {
    recordExerciseRecommendationEvent("impression", "classroom", "profile");
    recordExerciseRecommendationEvent("click", "classroom", "profile");

    const output = renderPrometheusMetrics();
    expect(output).toContain(
      'programming_tutor_exercise_recommendation_events_total{action="impression",source="classroom",surface="profile"} 1',
    );
    expect(output).toContain(
      'programming_tutor_exercise_recommendation_events_total{action="click",source="classroom",surface="profile"} 1',
    );
  });
});
