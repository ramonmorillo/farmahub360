import { prisma } from './prisma';
import type { CurrentUser } from './permissions';
import { leadershipRoles } from './permissions';

export function secureWhere(user: CurrentUser, hasAssignees = false, hasParticipants = false) {
  const assignedConditions: any[] = [
    { createdById: user.id },
    { responsibleId: user.id },
    { customVisibility: { some: { userId: user.id } } },
  ];

  if (hasAssignees) assignedConditions.push({ assignees: { some: { userId: user.id } } });
  if (hasParticipants) assignedConditions.push({ participants: { some: { userId: user.id } } });

  if (leadershipRoles.includes(user.role)) {
    return { deletedAt: null, visibility: { not: 'CUSTOM' } };
  }

  return {
    deletedAt: null,
    visibility: { not: 'CUSTOM' },
    OR: [
      { visibility: 'GLOBAL' },
      { visibility: 'AREA', areaId: { in: user.areaIds } },
      { visibility: 'ASSIGNED', OR: assignedConditions },
    ],
  };
}

export const includeCommon = { area: true, responsible: true, createdBy: true };

export async function audit(userId: string, action: string, entityType: any, entityId: string, summary: string) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId, summary } });
}
