'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { prisma } from './prisma';
import { requireUser } from './session';
import { audit } from './data';
import { canManageUsers } from './permissions';
import { areaDescriptions, initialAreaNames } from './catalog';

type Entity = 'task'|'event'|'incident'|'project';
const entityType = { task: 'TASK', event: 'EVENT', incident: 'INCIDENT', project: 'PROJECT' } as const;
const paths = { task: '/tasks', event: '/events', incident: '/incidents', project: '/projects' } as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const opt = (fd: FormData, k: string) => str(fd,k) || undefined;
const date = (fd: FormData, k: string) => opt(fd,k) ? new Date(str(fd,k)) : undefined;
const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
async function current() { return requireUser(); }

export async function saveArea(fd: FormData) {
  const user = await current(); if (!canManageUsers(user)) throw new Error('No autorizado');
  const id = opt(fd,'id'); const name = str(fd,'name');
  const data = { name, description: opt(fd,'description'), active: fd.get('active') === 'on' };
  if (id) await prisma.area.update({ where:{id}, data }); else await prisma.area.create({ data });
  revalidatePath('/areas');
}

export async function ensureInitialAreasAction() {
  const user = await current(); if (!canManageUsers(user)) throw new Error('No autorizado');
  for (const name of initialAreaNames) await prisma.area.upsert({ where:{name}, update:{ description: areaDescriptions[name], active:true }, create:{ name, description: areaDescriptions[name], active:true }});
  revalidatePath('/areas');
}

export async function saveUser(fd: FormData) {
  const user = await current(); if (!canManageUsers(user)) throw new Error('No autorizado');
  const id = opt(fd,'id'); const areaIds = list(fd,'areaIds'); const password = opt(fd,'password');
  const base:any = { name: str(fd,'name'), email: str(fd,'email').toLowerCase(), role: str(fd,'role') as any, active: fd.get('active') === 'on', areas:{ set: areaIds.map(id=>({id})) } };
  if (password) base.passwordHash = await hash(password, 12);
  if (id) await prisma.user.update({ where:{id}, data: base }); else await prisma.user.create({ data:{...base, passwordHash: await hash(password || 'FarmaHub360!', 12)} });
  revalidatePath('/users');
}

export async function resetPassword(fd: FormData) {
  const user = await current(); if (!canManageUsers(user)) throw new Error('No autorizado');
  await prisma.user.update({ where:{id: str(fd,'id')}, data:{ passwordHash: await hash(str(fd,'password') || 'FarmaHub360!', 12) } });
  revalidatePath('/users');
}

async function syncComments(kind: Entity, id: string, text: string, userId: string) {
  if (!text) return;
  await prisma.comment.create({ data: { text, authorId: userId, entityType: entityType[kind], entityId: id, [`${kind}Id`]: id } as any });
}
async function syncLinks(kind: Entity, id: string, userIds: string[]) {
  const map:any = { task: prisma.taskAssignee, event: prisma.eventAssignee, incident: prisma.incidentAssignee, project: prisma.projectParticipant };
  const fk:any = { task:'taskId', event:'eventId', incident:'incidentId', project:'projectId' };
  await map[kind].deleteMany({ where:{ [fk[kind]]: id } });
  if (userIds.length) await map[kind].createMany({ data:userIds.map(userId=>({ [fk[kind]]:id, userId })), skipDuplicates:true });
}

export async function saveTask(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ title:str(fd,'title'), description:opt(fd,'description'), areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), dueDate:date(fd,'dueDate'), priority:str(fd,'priority')||'MEDIA', status:str(fd,'status')||'PENDIENTE', visibility:str(fd,'visibility')||'GLOBAL', projectId:opt(fd,'projectId') };
 const row=id?await prisma.task.update({where:{id},data}):await prisma.task.create({data:{...data,createdById:user.id}}); await syncLinks('task',row.id,list(fd,'assigneeIds')); await syncComments('task',row.id,str(fd,'comment'),user.id); await audit(user.id,id?'UPDATE':'CREATE','TASK',row.id,row.title); revalidatePath('/tasks'); redirect('/tasks'); }
export async function deleteTask(fd: FormData) { const user=await current(); await prisma.task.update({where:{id:str(fd,'id')},data:{deletedAt:new Date(),status:'CANCELADA'}}); revalidatePath('/tasks'); }
export async function saveEvent(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ title:str(fd,'title'), description:opt(fd,'description'), type:str(fd,'type')||'OTRO', startAt:new Date(str(fd,'startAt')), endAt:new Date(str(fd,'endAt')), areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), priority:str(fd,'priority')||'MEDIA', visibility:str(fd,'visibility')||'GLOBAL' };
 const row=id?await prisma.event.update({where:{id},data}):await prisma.event.create({data:{...data,createdById:user.id}}); await syncLinks('event',row.id,list(fd,'assigneeIds')); await syncComments('event',row.id,str(fd,'comment'),user.id); revalidatePath('/events'); redirect('/events'); }
export async function saveIncident(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ title:str(fd,'title'), description:opt(fd,'description'), category:str(fd,'category')||'OTRO', areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), priority:str(fd,'priority')||'MEDIA', status:str(fd,'status')||'PENDIENTE', actions:opt(fd,'actions'), detectedAt:date(fd,'detectedAt')||new Date(), resolvedAt:date(fd,'resolvedAt') };
 const row=id?await prisma.incident.update({where:{id},data}):await prisma.incident.create({data:{...data,createdById:user.id}}); await syncComments('incident',row.id,str(fd,'comment'),user.id); revalidatePath('/incidents'); redirect('/incidents'); }
export async function saveProject(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ name:str(fd,'name'), description:opt(fd,'description'), areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), startDate:date(fd,'startDate'), expectedEndDate:date(fd,'expectedEndDate'), status:str(fd,'status')||'EN_CURSO', priority:str(fd,'priority')||'MEDIA', visibility:str(fd,'visibility')||'GLOBAL' };
 const row=id?await prisma.project.update({where:{id},data}):await prisma.project.create({data:{...data,createdById:user.id}}); await syncLinks('project',row.id,list(fd,'participantIds')); await syncComments('project',row.id,str(fd,'comment'),user.id); revalidatePath('/projects'); redirect('/projects'); }
