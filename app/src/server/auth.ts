import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
  type Profile,
} from "next-auth";
import * as Sentry from "@sentry/nextjs";
import GitHubModule, { type GithubProfile } from "next-auth/providers/github";

import { prisma } from "~/server/db";
import { env } from "~/env.mjs";
import { ensureDefaultExport } from "~/utils/utils";
import { captureSignup } from "~/utils/analytics/serverAnalytics";

const GitHubProvider = ensureDefaultExport(GitHubModule);

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  events: {
    signIn({ user, profile, isNewUser }) {
      Sentry.setUser({ id: user.id });
      if (isNewUser) {
        captureSignup(user, (profile as Profile & { gitHubUsername: string }).gitHubUsername);
      }
    },
    signOut() {
      Sentry.setUser(null);
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      profile(profile: GithubProfile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          gitHubUsername: profile.login,
        };
      },
    }),
  ],
  theme: {
    logo: "/logo.svg",
    brandColor: "#ff5733",
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = async (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user?.id) {
    Sentry.setUser({ id: session?.user?.id, email: session?.user?.email ?? undefined });
  }
  return session;
};
