import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

const baseAdapter = PrismaAdapter(prisma);
const customAdapter = {
  ...baseAdapter,
  linkAccount: async (account: any) => {
    // 2. Intercept the account data and encrypt sensitive tokens before saving to DB
    if (account.access_token) {
      account.access_token = encrypt(account.access_token);
    }
    if (account.refresh_token) {
      account.refresh_token = encrypt(account.refresh_token);
    }
    return baseAdapter.linkAccount!(account);
  },
};

export const authOptions: AuthOptions = {

  adapter: customAdapter as any,
  session: {
    strategy: "jwt",
  },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      authorization: {
        params: {
          scope: "read:user user:email repo"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
