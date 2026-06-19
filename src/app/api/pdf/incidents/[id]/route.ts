import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { secureWhere } from '@/lib/data';
import { basicPdf } from '@/lib/pdf';
import { priorityLabels, statusLabels } from '@/components/AdminForms';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const incident: any = await prisma.incident.findFirst({ where: { AND: [{ id: params.id }, secureWhere(user, false, false) as any] }, include: { area: true, responsible: true, comments: { include: { author: true }, orderBy: { createdAt: 'desc' }, take: 10 } } });
  if (!incident) return NextResponse.json({ error: 'No autorizado o no encontrado' }, { status: 404 });
  const audits = await prisma.auditLog.findMany({ where: { entityType: 'INCIDENT', entityId: incident.id }, include: { user: true }, orderBy: { createdAt: 'desc' }, take: 10 });
  const pdf = basicPdf(`Incidencia: ${incident.title}`, 'PDF individual de incidencia', [
    { heading: 'Información', lines: [`Título: ${incident.title}`, `Descripción: ${incident.description ?? '—'}`, `Categoría: ${incident.category}`, `Área afectada: ${incident.area?.name ?? '—'}`, `Responsable: ${incident.responsible?.name ?? '—'}`, `Estado: ${(statusLabels as Record<string, string>)[incident.status]}`, `Prioridad: ${(priorityLabels as Record<string, string>)[incident.priority]}`, `Fecha detección: ${incident.detectedAt.toLocaleString('es-ES')}`, `Fecha resolución: ${incident.resolvedAt?.toLocaleString('es-ES') ?? '—'}`, `Acciones realizadas: ${incident.actions ?? '—'}`] },
    { heading: 'Comentarios', lines: incident.comments.map((c: any) => `${c.createdAt.toLocaleString('es-ES')} · ${c.author.name}: ${c.text}`) },
    { heading: 'Historial', lines: audits.map((a: any) => `${a.createdAt.toLocaleString('es-ES')} · ${a.user?.name ?? 'Sistema'} · ${a.action} · ${a.summary}`) },
    { heading: 'Aviso legal', lines: ['Documento de gestión interna. La identificación del paciente, si procede, debe realizarse en el sistema corporativo autorizado.'] },
  ]);
  return new NextResponse(pdf, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="incidencia-${incident.id}.pdf"` } });
}
