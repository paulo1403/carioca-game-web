import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasPassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasPassword?: boolean;
  }
}
