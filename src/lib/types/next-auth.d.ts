import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    onboarded: boolean;
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {}
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    onboarded: boolean;
  }
}
