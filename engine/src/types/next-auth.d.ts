import { DefaultSession } from "next-auth";

// Extend the Session type (what you get from useSession / getServerSession)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;           // your custom id field
      role?: string;        // "admin" | "manager" | "user"
    } & DefaultSession["user"];
  }
}

// Extend the User type (what authorize() returns)
declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    // name?: string | null;   // already in DefaultUser, but you can override
    // email?: string | null;
  }
}

// Extend JWT (what gets stored in the token cookie / passed between callbacks)
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}