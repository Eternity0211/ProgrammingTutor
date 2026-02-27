import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    onboarded: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    onboarded: boolean;
  }
}
