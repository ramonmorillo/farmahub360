import { Role, Visibility } from '@prisma/client';
export type CurrentUser = { id: string; role: Role; areaIds: string[] };
export type SecureRecord = { visibility: Visibility; areaId?: string | null; createdById: string; responsibleId?: string | null; assignees?: {id:string}[]; participants?: {id:string}[]; customViewers?: {id:string}[] };
export const leadershipRoles: Role[] = ['ADMIN','JEFATURA'];
export function canManageUsers(user: Pick<CurrentUser,'role'>) { return leadershipRoles.includes(user.role); }
export function canViewRecord(user: CurrentUser, record: SecureRecord) {
  if (leadershipRoles.includes(user.role)) return true;
  if (record.createdById === user.id || record.responsibleId === user.id) return true;
  const listed = [...(record.assignees ?? []), ...(record.participants ?? []), ...(record.customViewers ?? [])].some(u => u.id === user.id);
  if (listed) return true;
  if (record.visibility === 'GLOBAL') return true;
  if (record.visibility === 'AREA') return !!record.areaId && user.areaIds.includes(record.areaId);
  return false;
}
export function visibilityWhere(user: CurrentUser) {
  if (leadershipRoles.includes(user.role)) return { deletedAt: null };
  return { deletedAt: null, OR: [
    { visibility: 'GLOBAL' as Visibility },
    { createdById: user.id },
    { responsibleId: user.id },
    { assignees: { some: { id: user.id } } },
    { participants: { some: { id: user.id } } },
    { customViewers: { some: { id: user.id } } },
    { visibility: 'AREA' as Visibility, areaId: { in: user.areaIds } },
  ] };
}
