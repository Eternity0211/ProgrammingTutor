import OpenAI from "openai";
import { createResilientFetch } from "@/server/resilience/dependency-guard";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash";

function clean(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/** Shared chat/reasoning client for all non-embedding LLM features. */
export function createLlmClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your-deepseek-api-key") {
    throw new Error("Missing DEEPSEEK_API_KEY. Please set the environment variable.");
  }

  return new OpenAI({
    apiKey: clean(apiKey),
    baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_DEEPSEEK_BASE_URL,
    timeout: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 30_000),
    maxRetries: Number(process.env.DEEPSEEK_MAX_RETRIES ?? 2),
    fetch: createResilientFetch("deepseek"),
  });
}

export function getLlmModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
}

/**
 * Embeddings remain a separate provider because DeepSeek's chat API is not an
 * embeddings endpoint. Configure EMBEDDING_* explicitly when RAG is enabled.
 */
export function createEmbeddingClient(): OpenAI {
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EMBEDDING_API_KEY (or DASHSCOPE_API_KEY) for RAG embeddings.",
    );
  }

  return new OpenAI({
    apiKey: clean(apiKey),
    baseURL:
      process.env.EMBEDDING_BASE_URL?.trim() ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    timeout: Number(process.env.EMBEDDING_TIMEOUT_MS ?? 15_000),
    maxRetries: Number(process.env.EMBEDDING_MAX_RETRIES ?? 1),
    fetch: createResilientFetch("embedding"),
  });
}

export function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL?.trim() || "text-embedding-v3";
}
