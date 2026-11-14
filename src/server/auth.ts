import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { loginSchema } from "@/lib/validation/auth";
import { db } from "@/server/db";

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

// Compared against when the email is unknown, so a missing account takes as
// long as a wrong password and the response time does not reveal which.
// It is the hash of a throwaway string, not a credential.
const DUMMY_HASH = "$2b$12$3ThT6sDTRBDIJiCH9PbLeOjRyfHCs2NhknqQAs/pxafB3ZZ8JAw2e";

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, name: true, email: true, image: true, passwordHash: true },
      });

      const valid = await bcrypt.compare(
        parsed.data.password,
        user?.passwordHash ?? DUMMY_HASH,
      );
      if (!user?.passwordHash || !valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (googleEnabled) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // The Credentials provider only works with JWT sessions.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
