import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: getEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.subscriptionStatus = user.subscriptionStatus;
        session.user.credits = user.credits;
        session.user.subscriptionExpiry = user.subscriptionExpiry
          ? user.subscriptionExpiry.toISOString()
          : null;
      }
      return session;
    },
  },
  secret: getEnv("NEXTAUTH_SECRET"),
};

export const getAuthSession = () => getServerSession(authOptions);
