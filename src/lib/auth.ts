import { Prisma } from '@prisma/client';
import { compare } from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

function isMissingUserTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021' && String(error.meta?.table ?? '').includes('User');
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [CredentialsProvider({ name: 'Credenciales', credentials: { email: {}, password: {} }, async authorize(credentials) {
    const email = credentials?.email?.toLowerCase().trim();
    if (!email || !credentials?.password) return null;
    try {
      const user = await prisma.user.findUnique({ where: { email }, include: { areas: true } });
      if (!user || !user.active) return null;
      const ok = await compare(credentials.password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role, areaIds: user.areas.map(a => a.id) } as any;
    } catch (error) {
      if (isMissingUserTableError(error)) {
        console.error('FarmaHub360 database is not initialized: public.User table does not exist. Run /api/admin/init with SEED_SECRET or prisma migrate deploy && prisma db seed.', error);
        throw new Error('DATABASE_NOT_INITIALIZED');
      }
      console.error('Unexpected login database error in FarmaHub360.', error);
      throw error;
    }
  }})],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = (user as any).role; token.areaIds = (user as any).areaIds; } return token; },
    async session({ session, token }) { if (session.user) { (session.user as any).id = token.sub; (session.user as any).role = token.role; (session.user as any).areaIds = token.areaIds ?? []; } return session; }
  }
};
