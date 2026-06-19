import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { secureWhere } from '@/lib/data';
import { basicPdf } from '@/lib/pdf';
import { priorityLabels, statusLabels, visibilityLabels } from '@/components/AdminForms';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const task: any = await prisma.task.findFirst({ where: { AND: [{ id: params.id }, secureWhere(user, true, false) as any] }, include: { area: true, responsible: true, assignees: { include: { user: true } }, comments: { include: { author: true }, orderBy: { createdAt: 'desc' }, take: 10 } } });
  if (!task) return NextResponse.json({ error: 'No autorizado o no encontrado' }, { status: 404 });
  const audits = await prisma.auditLog.findMany({ where: { entityType: 'TASK', entityId: task.id }, include: { user: true }, orderBy: { createdAt: 'desc' }, take: 10 });
  const pdf = basicPdf(`Tarea: ${task.title}`, 'PDF individual de tarea', [
    { heading: 'Información', lines: [`Título: ${task.title}`, `Descripción: ${task.description ?? '—'}`, `Área: ${task.area?.name ?? '—'}`, `Responsable: ${task.responsible?.name ?? '—'}`, `Usuarios asignados: ${task.assignees.map((a: any) => a.user.name).join(', ') || '—'}`, `Estado: ${(statusLabels as Record<string, string>)[task.status]}`, `Prioridad: ${(priorityLabels as Record<string, string>)[task.priority]}`, `Fecha límite: ${task.dueDate?.toLocaleString('es-ES') ?? '—'}`, `Visibilidad: ${(visibilityLabels as Record<string, string>)[task.visibility]}`] },
    { heading: 'Comentarios', lines: task.comments.map((c: any) => `${c.createdAt.toLocaleString('es-ES')} · ${c.author.name}: ${c.text}`) },
    { heading: 'Historial', lines: audits.map((a: any) => `${a.createdAt.toLocaleString('es-ES')} · ${a.user?.name ?? 'Sistema'} · ${a.action} · ${a.summary}`) },
    { heading: 'Aviso', lines: ['Documento generado desde FarmaHub360. No debe contener datos clínicos identificables de pacientes.'] },
  ]);
  return new NextResponse(pdf, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="tarea-${task.id}.pdf"` } });
}
