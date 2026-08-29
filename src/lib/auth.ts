import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { ROUTES } from "@/config/route";
import CredentialsProvider from "next-auth/providers/credentials";

let fetchRetryPatched = false;

declare global {
  // Keep the original fetch across hot reloads to avoid wrapper stacking in dev.
  // eslint-disable-next-line no-var
  var __gradeitOriginalFetch: typeof globalThis.fetch | undefined;
}

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

  const causeError =
    (errnoError.cause as NodeJS.ErrnoException | undefined) ?? undefined;
  if (causeError?.code && FETCH_RETRYABLE_ERROR_CODES.has(causeError.code)) {
    return true;
  }

  const lowerMessage = error.message?.toLowerCase() ?? "";
  return (
    lowerMessage.includes("connection reset") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("fetch failed")
  );
};

const patchGlobalFetchWithRetry = () => {
  if (fetchRetryPatched) {
    return;
  }

  if (!globalThis.__gradeitOriginalFetch && globalThis.fetch) {
    globalThis.__gradeitOriginalFetch = globalThis.fetch.bind(globalThis);
  }

  const baseFetch = globalThis.__gradeitOriginalFetch;
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
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "Google OAuth is not configured correctly. Set AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET) with real values from Google Cloud Console.",
    );
  }
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

const TEST_USER = {
  // id: "test-user-1",
  // email: "test@test.com",
  // name: "Test Teacher",
  // role: "FACULTY" as Role, // 👈 切换 STUDENT / FACULTY
  id: "test-student-1",
  email: "student@test.com",
  name: "Test Student",
  role: "STUDENT" as Role,
  onboarded: true,
};

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google({
    //   clientId: googleClientId,
    //   clientSecret: googleClientSecret,
    //   authorization: {
    //     params: {
    //       prompt: "select_account",
    //     },
    //   },
    // }),

    CredentialsProvider({
      name: "Test Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        return TEST_USER;
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
      if (process.env.NODE_ENV === "development") {
        token.id = TEST_USER.id;
        token.role = TEST_USER.role;
        token.onboarded = TEST_USER.onboarded;
      }
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
