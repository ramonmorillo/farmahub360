import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import type { CurrentUser } from './permissions';
export async function requireUser(): Promise<CurrentUser> {
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  if (!u?.id) redirect('/login');
  return { id: u.id, role: u.role, areaIds: u.areaIds ?? [] };
}
