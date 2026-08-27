import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth((req) => ({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // Phone OTP provider (MSG91) gets added here once DLT registration is approved.
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      } else if (token.id) {
        // Re-read the role on every subsequent request rather than trusting
        // the value baked in at sign-in — without this, a role change made
        // after login (e.g. claim approval promoting a customer to
        // BUSINESS_OWNER) wouldn't take effect until the user logged out
        // and back in, even though the DB was already correct.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    // Only fires when the Prisma adapter creates a brand-new user — i.e. a
    // first-time Google sign-in, never a returning-user login. The adapter
    // always applies the schema's default role (BUSINESS_OWNER) before this
    // event runs, so a query param from the client can't reach it; this
    // short-lived cookie (set by the signup screen right before the OAuth
    // redirect, see src/app/signup/page.tsx) is what carries the
    // questionnaire's choice across that redirect. Only downgrades to USER
    // — the "list my business" path needs no change since it already
    // matches the schema default.
    async createUser({ user }) {
      const intent = req?.cookies.get("jd-signup-intent")?.value;
      if (intent === "customer" && user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "USER" } });
      }
    },
  },
}));
