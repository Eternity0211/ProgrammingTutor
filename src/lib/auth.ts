import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { ROUTES } from "@/config/route";

let fetchRetryPatched = false;

const FETCH_RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);
const FETCH_RETRY_MAX_ATTEMPTS = 4;
const FETCH_BACKOFF_BASE_MS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryFetchError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const errnoError = error as NodeJS.ErrnoException;
  if (errnoError.code && FETCH_RETRYABLE_ERROR_CODES.has(errnoError.code)) {
    return true;
  }

  const lowerMessage = error.message?.toLowerCase() ?? "";
  return (
    lowerMessage.includes("connection reset") ||
    lowerMessage.includes("timed out")
  );
};

const patchGlobalFetchWithRetry = () => {
  if (fetchRetryPatched) {
    return;
  }

  const baseFetch = globalThis.fetch?.bind(globalThis);
  if (!baseFetch) {
    return;
  }

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= FETCH_RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        return await baseFetch(input, init);
      } catch (error) {
        lastError = error;

        if (
          attempt === FETCH_RETRY_MAX_ATTEMPTS ||
          !shouldRetryFetchError(error)
        ) {
          throw error;
        }

        await wait(FETCH_BACKOFF_BASE_MS * Math.pow(2, attempt));
      }
    }

    throw lastError;
  };

  fetchRetryPatched = true;
};

patchGlobalFetchWithRetry();

const isPlaceholderValue = (value?: string) => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("your-") ||
    normalized.includes("oauth-client-id") ||
    normalized.includes("oauth-client-secret")
  );
};

const googleClientId =
  process.env.AUTH_GOOGLE_ID?.trim() ||
  process.env.GOOGLE_CLIENT_ID?.trim() ||
  "";

const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() ||
  process.env.GOOGLE_CLIENT_SECRET?.trim() ||
  "";

if (
  isPlaceholderValue(googleClientId) ||
  isPlaceholderValue(googleClientSecret)
) {
  throw new Error(
    "Google OAuth is not configured correctly. Set AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET) with real values from Google Cloud Console.",
  );
}

// Use APP_URL as a fallback so Auth.js can build callback URLs consistently.
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && process.env.APP_URL) {
  process.env.AUTH_URL = process.env.APP_URL;
}

// 解释：从环境变量读取认证 secret。如果没有设置且在开发环境中，动态生成一个临时 secret，避免在本地开发时报 MissingSecret 错误。
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "development"
    ? crypto.randomBytes(32).toString("hex")
    : undefined);

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
  },
  // 把 secret 传入 NextAuth 配置中
  secret: AUTH_SECRET,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const classesUrl = `${baseUrl}${ROUTES.CLASSES}`;

      if (!url) {
        return classesUrl;
      }

      if (url.startsWith("/")) {
        const normalizedPath = url.startsWith(ROUTES.CLASSES)
          ? url
          : ROUTES.CLASSES;
        return `${baseUrl}${normalizedPath}`;
      }

      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return target.pathname.startsWith(ROUTES.CLASSES)
            ? target.toString()
            : classesUrl;
        }
      } catch {
        // Ignore malformed redirect URLs and fall back to classes.
      }

      return classesUrl;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        //@ts-ignore
        token.role = user.role;
        //@ts-ignore
        token.onboarded = user.onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role as Role;
        session.onboarded = token.onboarded;
      }
      return session;
    },
  },
});
