'use server';

import { Prisma, Role, Status } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { prisma } from './prisma';
import { requireUser } from './session';
import { audit } from './data';
import { canManageUsers } from './permissions';
import { areaDescriptions, initialAreaNames } from './catalog';
import { containsPatientSpecificText, generatePacReference, patientWarningParams, sanitizePatientIdentifiers } from './patientProtection';

type Entity = 'task'|'event'|'incident'|'project';
const entityType = { task: 'TASK', event: 'EVENT', incident: 'INCIDENT', project: 'PROJECT' } as const;
const paths = { task: '/tasks', event: '/events', incident: '/incidents', project: '/projects' } as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const opt = (fd: FormData, k: string) => str(fd,k) || undefined;
const date = (fd: FormData, k: string) => opt(fd,k) ? new Date(str(fd,k)) : undefined;
const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
async function current() { return requireUser(); }

function usersRedirect(message: string, type: 'success'|'error' = 'error'): never {
  redirect(`/users?${new URLSearchParams({ [type]: message }).toString()}`);
}

function logCreateUserFailed(email: string, role: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error({ action: 'create_user_failed', email, role, message });
}

function isRedirectError(error: unknown) {
  return typeof error === 'object' && error !== null && 'digest' in error && String((error as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT');
}

function parseRole(role: string): Role | null {
  return Object.values(Role).includes(role as Role) ? role as Role : null;
}

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
  const id = opt(fd,'id');
  const name = str(fd,'name');
  const email = str(fd,'email').toLowerCase();
  const roleInput = str(fd,'role');
  const role = parseRole(roleInput);
  const active = fd.get('active') === 'on';
  const areaIds = list(fd,'areaIds');
  const password = opt(fd,'password');

  if (!role) {
    if (!id) logCreateUserFailed(email, roleInput, new Error('Invalid role'));
    usersRedirect('Rol no válido.');
  }

  try {
    if (areaIds.length) {
      const existingAreas = await prisma.area.count({ where: { id: { in: areaIds } } });
      if (existingAreas !== new Set(areaIds).size) usersRedirect('Error al asignar áreas.');
    }

    const duplicate = await prisma.user.findFirst({ where: { email, NOT: id ? { id } : undefined }, select: { id: true } });
    if (duplicate) usersRedirect('Ya existe un usuario con ese email.');

    const areaRelation = { set: areaIds.map(areaId => ({ id: areaId })) };

    if (id) {
      const data: Prisma.UserUpdateInput = {
        name,
        email,
        role,
        active,
        areas: areaRelation
      };
      if (password) data.passwordHash = await hash(password, 12);
      await prisma.user.update({ where: { id }, data });
    } else {
      const passwordHash = await hash(password || 'FarmaHub360!', 12);
      const data: Prisma.UserCreateInput = {
        name,
        email,
        passwordHash,
        role,
        active,
        areas: areaIds.length ? { connect: areaIds.map(areaId => ({ id: areaId })) } : undefined
      };
      await prisma.user.create({ data });
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (!id) logCreateUserFailed(email, roleInput, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') usersRedirect('Ya existe un usuario con ese email.');
    usersRedirect('No se pudo crear el usuario.');
  }

  revalidatePath('/users');
  usersRedirect(id ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.', 'success');
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
function taskRedirect(message: string): never {
  redirect(`/tasks?${new URLSearchParams({ error: message }).toString()}`);
}

export async function saveTask(fd: FormData) {
  const user = await current();
  const id = opt(fd, 'id');
  const titleInput = str(fd, 'title');
  const descriptionInput = opt(fd, 'description');
  const commentInput = str(fd, 'comment');
  const taskType = str(fd, 'taskType') || 'GESTION_INTERNA';
  const pacReference = opt(fd, 'pseudonymizedReference') || generatePacReference();
  const cleanTitle = sanitizePatientIdentifiers(titleInput, pacReference);
  const cleanDescription = sanitizePatientIdentifiers(descriptionInput, pacReference);
  const cleanComment = sanitizePatientIdentifiers(commentInput, pacReference);
  const title = cleanTitle.text;
  const wasSanitized = cleanTitle.replaced || cleanDescription.replaced || cleanComment.replaced;
  const wasPatientSpecific = taskType === 'PACIENTE_ESPECIFICA' || wasSanitized || containsPatientSpecificText(titleInput, descriptionInput, commentInput);
  const areaId = opt(fd, 'areaId');
  const priority = str(fd, 'priority');
  const status = str(fd, 'status');
  const visibility = str(fd, 'visibility');
  if (!title || !areaId || !priority || !status || !visibility || visibility === 'CUSTOM') taskRedirect('Completa los campos obligatorios: título, área, estado, prioridad y visibilidad.');
  if (wasPatientSpecific && (!areaId || !opt(fd, 'responsibleId') || !date(fd, 'dueDate'))) taskRedirect('En tareas paciente-específicas son obligatorios área, responsable y fecha límite.');
  const data: any = { title, description: cleanDescription.text || undefined, taskType: wasPatientSpecific ? 'PACIENTE_ESPECIFICA' : taskType, pseudonymizedReference: wasPatientSpecific ? pacReference : opt(fd, 'pseudonymizedReference'), referenceCircuit: opt(fd, 'referenceCircuit'), areaId, responsibleId: opt(fd, 'responsibleId'), dueDate: date(fd, 'dueDate'), priority, status, visibility: wasPatientSpecific && visibility === 'GLOBAL' ? 'AREA' : visibility, projectId: opt(fd, 'projectId') };
  const row = id ? await prisma.task.update({ where: { id }, data }) : await prisma.task.create({ data: { ...data, createdById: user.id } });
  await syncLinks('task', row.id, list(fd, 'assigneeIds'));
  await syncComments('task', row.id, cleanComment.text, user.id);
  await audit(user.id, id ? 'UPDATE' : 'CREATE', 'TASK', row.id, row.title);
  revalidatePath('/tasks');
  revalidatePath('/');
  redirect(`/tasks?${new URLSearchParams({ detail: row.id, ...patientWarningParams(wasPatientSpecific, wasSanitized) }).toString()}`);
}

export async function changeTaskStatus(fd: FormData) {
  const user = await current();
  const id = str(fd, 'id');
  const status = str(fd, 'status') as Status;
  const task = await prisma.task.update({ where: { id }, data: { status } });
  await audit(user.id, 'STATUS_CHANGE', 'TASK', task.id, `${task.title}: ${status}`);
  revalidatePath('/tasks');
  revalidatePath('/');
}

export async function addTaskComment(fd: FormData) {
  const user = await current();
  const id = str(fd, 'id');
  const rawText = str(fd, 'comment');
  const pacReference = generatePacReference();
  const clean = sanitizePatientIdentifiers(rawText, pacReference);
  const text = clean.text;
  if (!text) redirect(`/tasks?detail=${id}&error=No se permiten comentarios vacíos.`);
  await syncComments('task', id, text, user.id);
  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
  await audit(user.id, 'COMMENT', 'TASK', id, task?.title ?? 'Comentario en tarea');
  revalidatePath('/tasks');
  redirect(`/tasks?${new URLSearchParams({ detail: id, ...patientWarningParams(containsPatientSpecificText(rawText) || clean.replaced, clean.replaced) }).toString()}`);
}

export async function deleteTask(fd: FormData) { const user=await current(); const task=await prisma.task.update({where:{id:str(fd,'id')},data:{deletedAt:new Date(),status:'CANCELADA'}}); await audit(user.id,'DELETE','TASK',task.id,task.title); revalidatePath('/tasks'); revalidatePath('/'); }
export async function saveEvent(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ title:str(fd,'title'), description:opt(fd,'description'), type:str(fd,'type')||'OTRO', startAt:new Date(str(fd,'startAt')), endAt:new Date(str(fd,'endAt')), areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), priority:str(fd,'priority')||'MEDIA', visibility:str(fd,'visibility')||'GLOBAL' };
 const row=id?await prisma.event.update({where:{id},data}):await prisma.event.create({data:{...data,createdById:user.id}}); await syncLinks('event',row.id,list(fd,'assigneeIds')); await syncComments('event',row.id,str(fd,'comment'),user.id); revalidatePath('/events'); redirect('/events'); }
export async function saveIncident(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const pacReference=opt(fd,'pseudonymizedReference')||generatePacReference(); const cleanTitle=sanitizePatientIdentifiers(str(fd,'title'),pacReference); const cleanDescription=sanitizePatientIdentifiers(opt(fd,'description'),pacReference); const cleanActions=sanitizePatientIdentifiers(opt(fd,'actions'),pacReference); const cleanComment=sanitizePatientIdentifiers(str(fd,'comment'),pacReference); const wasSanitized=cleanTitle.replaced||cleanDescription.replaced||cleanActions.replaced||cleanComment.replaced; const wasPatientSpecific=wasSanitized||containsPatientSpecificText(str(fd,'title'),opt(fd,'description'),opt(fd,'actions'),str(fd,'comment')); const data:any={ title:cleanTitle.text, description:cleanDescription.text||undefined, category:str(fd,'category')||'OTRO', areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), priority:str(fd,'priority')||'MEDIA', status:str(fd,'status')||'PENDIENTE', actions:cleanActions.text||undefined, detectedAt:date(fd,'detectedAt')||new Date(), resolvedAt:date(fd,'resolvedAt'), taskType:wasPatientSpecific?'PACIENTE_ESPECIFICA':'INCIDENCIA_CIRCUITO', pseudonymizedReference:wasPatientSpecific?pacReference:opt(fd,'pseudonymizedReference'), referenceCircuit:opt(fd,'referenceCircuit') };
 const row=id?await prisma.incident.update({where:{id},data}):await prisma.incident.create({data:{...data,createdById:user.id}}); await syncComments('incident',row.id,cleanComment.text,user.id); await audit(user.id,id?'UPDATE':'CREATE','INCIDENT',row.id,row.title); revalidatePath('/incidents'); revalidatePath('/'); redirect(`/incidents?${new URLSearchParams({detail:row.id,...patientWarningParams(wasPatientSpecific,wasSanitized)}).toString()}`); }
export async function changeIncidentStatus(fd: FormData) { const user=await current(); const id=str(fd,'id'); const status=str(fd,'status') as Status; const incident=await prisma.incident.update({where:{id},data:{status}}); await audit(user.id,'STATUS_CHANGE','INCIDENT',incident.id,`${incident.title}: ${status}`); revalidatePath('/incidents'); revalidatePath('/'); }
export async function saveProject(fd: FormData) { const user=await current(); const id=opt(fd,'id'); const data:any={ name:str(fd,'name'), description:opt(fd,'description'), areaId:opt(fd,'areaId'), responsibleId:opt(fd,'responsibleId'), startDate:date(fd,'startDate'), expectedEndDate:date(fd,'expectedEndDate'), status:str(fd,'status')||'EN_CURSO', priority:str(fd,'priority')||'MEDIA', visibility:str(fd,'visibility')||'GLOBAL' };
 const row=id?await prisma.project.update({where:{id},data}):await prisma.project.create({data:{...data,createdById:user.id}}); await syncLinks('project',row.id,list(fd,'participantIds')); await syncComments('project',row.id,str(fd,'comment'),user.id); revalidatePath('/projects'); redirect('/projects'); }
