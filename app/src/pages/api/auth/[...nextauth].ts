import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubModule, { type GithubProfile } from "next-auth/providers/github";
import NextAuth, { type AuthOptions } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { decode, encode } from "next-auth/jwt";
import { prisma } from "~/server/db";
import { ensureDefaultExport } from "~/utils/utils";
import { env } from "~/env.mjs";
import { getCookie, setCookie } from "cookies-next";
import { randomUUID } from "crypto";
import { type Provider } from "next-auth/providers";

const GitHubProvider = ensureDefaultExport(GitHubModule);

export function authOptionsWrapper(req: NextApiRequest, res: NextApiResponse) {
  const isCredentialsCallback =
    req.query?.nextauth?.includes("callback") &&
    req.query.nextauth?.includes("credentials") &&
    req?.method === "POST";
  const providers: Provider[] = [
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
  ];

  // Conditionally add CredentialsProvider in development environment
  if (process.env.NODE_ENV === "development") {
    providers.push(
      CredentialsProvider({
        credentials: {
          email: { label: "email", type: "text" },
          password: { label: "Password", type: "password", required: false },
        },
        authorize: async (credentials) => {
          // Authorization logic remains the same
          const { email } = credentials || {};
          if (!email) {
            throw new Error("Email is required");
          }
          try {
            const { email } = credentials as { email: string; password?: string };

            let user = await prisma.user.findUnique({
              where: {
                email,
              },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                },
              });

              await prisma.account.create({
                data: {
                  userId: user.id,
                  provider: "credentials",
                  type: "credentials",
                  providerAccountId: user.id,
                },
              });
            }

            return {
              id: user.id,
              email: user.email,
              image: user.image,
              name: user.name,
            };
          } catch (error) {
            throw error;
          }
        },
      }),
    );
  }
  return [
    req,
    res,
    {
      adapter: PrismaAdapter(prisma),
      providers: providers,
      callbacks: {
        async signIn({ user }) {
          if (isCredentialsCallback) {
            if (user) {
              const sessionToken = randomUUID();
              const sessionExpiry = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);

              await prisma.session.create({
                data: {
                  sessionToken,
                  userId: user.id,
                  expires: sessionExpiry,
                },
              });

              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              setCookie("next-auth.session-token", sessionToken, {
                req,
                res,
                expires: sessionExpiry,
              });
            }
          }
          return true;
        },
        session: ({ session, user }) => ({
          ...session,
          user: {
            ...session.user,
            id: user.id,
          },
        }),
      },
      secret: process.env.NEXTAUTH_SECRET,
      jwt: {
        maxAge: 60 * 60 * 24 * 30,
        async encode(params) {
          if (isCredentialsCallback) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const cookie = getCookie("next-auth.session-token", { req, res });
            console.log(cookie);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            if (cookie) return cookie;
            return "";
          }

          return encode(params);
        },
        async decode(params) {
          if (isCredentialsCallback) {
            return null;
          }
          return decode(params);
        },
      },
      events: {
        async signOut({ session }) {
          const { sessionToken = "" } = session as unknown as {
            sessionToken?: string;
          };

          if (sessionToken) {
            await prisma.session.deleteMany({
              where: {
                sessionToken,
              },
            });
          }
        },
      },
    } as AuthOptions,
  ] as const;
}

// eslint-disable-next-line @typescript-eslint/require-await
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return NextAuth(...authOptionsWrapper(req, res));
}
