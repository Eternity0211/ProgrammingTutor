import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import crypto from "crypto";

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
