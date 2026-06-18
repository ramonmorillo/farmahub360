import { prisma } from './prisma';
import type { CurrentUser } from './permissions';
import { leadershipRoles } from './permissions';

export function secureWhere(user: CurrentUser, hasAssignees = false, hasParticipants = false) {
  if (leadershipRoles.includes(user.role)) return { deletedAt: null };

  const OR: any[] = [
    { visibility: 'GLOBAL' },
    { createdById: user.id },
    { responsibleId: user.id },
    { customVisibility: { some: { userId: user.id } } },
    { visibility: 'AREA', areaId: { in: user.areaIds } },
  ];

  if (hasAssignees) OR.push({ assignees: { some: { userId: user.id } } });
  if (hasParticipants) OR.push({ participants: { some: { userId: user.id } } });

  return { deletedAt: null, OR };
}

export const includeCommon = { area: true, responsible: true, createdBy: true };

export async function audit(userId: string, action: string, entityType: any, entityId: string, summary: string) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId, summary } });
}
