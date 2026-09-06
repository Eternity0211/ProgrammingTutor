import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "@/auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "./password";

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

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          onboarded: user.onboarded,
        };
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
});

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  return user;
}
