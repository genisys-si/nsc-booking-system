import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb-client";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";

// Optional: Extend NextAuth's User type with your custom fields
interface CustomUser extends NextAuthUser {
  id: string;
  role: string;
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Update lastLogin
        await User.findByIdAndUpdate(user._id, {
          $set: { lastLogin: new Date() },
        });

        // Return user object for jwt callback
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        } as CustomUser;
      },
    }),
  ],

  session: {
    strategy: "jwt" as const,
  },

  callbacks: {
    // @ts-expect-error NextAuth callback signature is broader than needed
    async jwt({ token, user }: { token: JWT; user?: CustomUser }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }: { session: any; token: JWT }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      if (token?.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };