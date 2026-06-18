import { compare } from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [CredentialsProvider({ name: 'Credenciales', credentials: { email: {}, password: {} }, async authorize(credentials) {
    const email = credentials?.email?.toLowerCase().trim();
    if (!email || !credentials?.password) return null;
    const user = await prisma.user.findUnique({ where: { email }, include: { areas: true } });
    if (!user || !user.active) return null;
    const ok = await compare(credentials.password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, areaIds: user.areas.map(a => a.id) } as any;
  }})],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = (user as any).role; token.areaIds = (user as any).areaIds; } return token; },
    async session({ session, token }) { if (session.user) { (session.user as any).id = token.sub; (session.user as any).role = token.role; (session.user as any).areaIds = token.areaIds ?? []; } return session; }
  }
};
