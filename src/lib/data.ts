import { prisma } from './prisma';
import type { CurrentUser } from './permissions';
import { leadershipRoles } from './permissions';
export function secureWhere(user: CurrentUser, hasAssignees=false, hasParticipants=false) {
 if (leadershipRoles.includes(user.role)) return { deletedAt: null };
 const OR: any[] = [{visibility:'GLOBAL'},{createdById:user.id},{responsibleId:user.id},{customViewers:{some:{id:user.id}}},{visibility:'AREA',areaId:{in:user.areaIds}}];
 if (hasAssignees) OR.push({assignees:{some:{id:user.id}}});
 if (hasParticipants) OR.push({participants:{some:{id:user.id}}});
 return { deletedAt: null, OR };
}
export const includeCommon = { area:true, responsible:true, createdBy:true };
export async function audit(userId:string, action:string, entityType:any, entityId:string, summary:string){ await prisma.auditLog.create({data:{userId,action,entityType,entityId,summary}}); }
