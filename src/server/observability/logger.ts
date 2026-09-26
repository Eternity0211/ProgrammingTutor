type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY =
  /(^|[_-])(authorization|cookie|password|secret|token|api[-_]?key|source[-_]?code|code)($|[_-])/i;

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 5) return "[TRUNCATED]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, "", depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitize(nestedValue, nestedKey, depth + 1),
      ]),
    );
  }
  if (typeof value === "string" && value.length > 2_000) {
    return `${value.slice(0, 2_000)}…[TRUNCATED]`;
  }
  return value;
}

export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const configured = (process.env.LOG_LEVEL?.toLowerCase() ?? "info") as LogLevel;
  const minimum = LEVEL_PRIORITY[configured] ?? LEVEL_PRIORITY.info;
  if (LEVEL_PRIORITY[level] < minimum) return;
  const sanitizedFields = sanitize(fields);
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: process.env.OTEL_SERVICE_NAME ?? "programming-tutor",
    message,
    ...(sanitizedFields && typeof sanitizedFields === "object"
      ? sanitizedFields
      : {}),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => log("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields),
};
