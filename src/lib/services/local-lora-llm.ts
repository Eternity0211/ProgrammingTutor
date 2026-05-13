import OpenAI from "openai";

const DEFAULT_LOCAL_BASE_URL = "http://localhost:8000/v1";
const DEFAULT_LOCAL_MODEL = "qwen2.5-7b-instruct-lora";
const DEFAULT_LOCAL_API_KEY = "local-dev-key";

function readRequiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  const normalized = value?.trim().replace(/^['\"]|['\"]$/g, "");

  if (!normalized) {
    throw new Error(`Missing ${name}. Please set the environment variable.`);
  }

  return normalized;
}

export function getLocalLoraModelName(): string {
  return readRequiredEnv("LOCAL_LLM_MODEL", DEFAULT_LOCAL_MODEL);
}

export function getLocalLoraClient(): OpenAI {
  const baseURL = readRequiredEnv("LOCAL_LLM_BASE_URL", DEFAULT_LOCAL_BASE_URL);
  const apiKey = readRequiredEnv("LOCAL_LLM_API_KEY", DEFAULT_LOCAL_API_KEY);

  return new OpenAI({
    apiKey,
    baseURL,
  });
}
