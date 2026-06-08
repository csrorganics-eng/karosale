import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq, sql } from "drizzle-orm";
import { db, getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { getResendFromHeader, sendEmail } from "@/lib/resend";
import { BRAND_NAME } from "@/lib/brand";
import {
  buildMagicLinkEmailHtml,
  buildMagicLinkEmailText,
} from "@/lib/magic-link-email";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

/** Auth.js v5 also reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env; we support legacy GOOGLE_* names. */
const googleId =
  process.env.AUTH_GOOGLE_ID?.trim() ||
  process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() ||
  process.env.GOOGLE_CLIENT_SECRET?.trim();

const googleConfigured = Boolean(googleId && googleSecret);

const emailMagicConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
/** Magic link requires Resend + DB adapter (verification tokens). */
const magicLinkEnabled = emailMagicConfigured && databaseConfigured;

/**
 * HTTP email provider (Resend) — avoids deprecated `Email()` / Nodemailer which
 * requires a dummy SMTP `server` even when using custom send.
 * @see https://authjs.dev/guides/configuring-http-email
 */
function resendMagicLinkProvider(): NextAuthConfig["providers"][number] {
  const from = getResendFromHeader();

  return {
    id: "email",
    type: "email",
    name: "Email",
    from,
    maxAge: 60 * 60 * 24,
    sendVerificationRequest: async ({ identifier, url }) => {
      const host = new URL(url).host;
      const to = identifier.trim().toLowerCase();
      await sendEmail({
        to: [to],
        subject: `Your ${BRAND_NAME} sign-in link`,
        html: buildMagicLinkEmailHtml({ url, host }),
        text: buildMagicLinkEmailText({ url, host }),
      });
    },
  };
}

const providers: NextAuthConfig["providers"] = [
  ...(googleConfigured
    ? [
        Google({
          clientId: googleId!,
          clientSecret: googleSecret!,
          allowDangerousEmailAccountLinking: true,
          authorization: {
            params: {
              prompt: "select_account",
              access_type: "offline",
              response_type: "code",
            },
          },
        }),
      ]
    : []),
  ...(magicLinkEnabled ? [resendMagicLinkProvider()] : []),
  Credentials({
    id: "credentials",
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const raw = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      const email = raw?.trim().toLowerCase();
      if (!email || !password) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);

      if (!user?.passwordHash || !user.isActive) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        role: user.role,
      };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  trustHost: true,
  adapter: process.env.DATABASE_URL?.trim()
    ? DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const uid = (user as { id?: string }).id ?? token.sub;
        if (uid) {
          token.id = uid;
          token.sub = uid;
        }
        token.role = (user as { role?: string }).role ?? "customer";
        const nm = (user as { name?: string | null }).name;
        if (nm) token.name = nm;
      }

      const userId = (token.id ?? token.sub) as string | undefined;
      if (userId) {
        const [dbUser] = await db
          .select({ role: users.role, name: users.name })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (dbUser) {
          token.role = dbUser.role;
          if (dbUser.name) token.name = dbUser.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.role = (token.role as string) ?? "customer";
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
});

export type UserRole = "customer" | "admin" | "vendor" | "packer";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireAuth();
  const role = session.user.role as UserRole;
  if (!roles.includes(role)) {
    throw new Error("Forbidden");
  }
  return session;
}
