import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      if (token.login) (session.user as { login?: string }).login = token.login as string;
      return session;
    },
  },
});
