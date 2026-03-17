import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      avatarUrl?: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    avatarUrl?: string | null;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    avatarUrl?: string | null;
    mustChangePassword: boolean;
  }
}
