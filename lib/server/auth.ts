import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isNextAuthConfigured() {
  return Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    id: 'guest-placeholder',
    name: 'Guest Placeholder',
    credentials: {},
    async authorize() {
      return null;
    }
  })
];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth'
  }
};
