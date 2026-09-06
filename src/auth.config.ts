import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { ROUTES } from "@/config/route";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ auth }) => !!auth,
    async redirect({ url, baseUrl }) {
      if (!url) return `${baseUrl}${ROUTES.CLASSES}`;
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return target.toString();
        }
      } catch {
        // Ignore malformed redirect URLs
      }
      return `${baseUrl}${ROUTES.CLASSES}`;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role as string;
        token.onboarded = user.onboarded as boolean;
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
  providers: [],
} satisfies NextAuthConfig;
