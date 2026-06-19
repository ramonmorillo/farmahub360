import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { secureWhere } from '@/lib/data';
import { basicPdf } from '@/lib/pdf';
import { priorityLabels, statusLabels } from '@/components/AdminForms';

function filters(url: URL) { const where: any = {}; const q = url.searchParams.get('q'); if (url.searchParams.get('status')) where.status = url.searchParams.get('status'); if (url.searchParams.get('priority')) where.priority = url.searchParams.get('priority'); if (url.searchParams.get('area')) where.areaId = url.searchParams.get('area'); if (url.searchParams.get('responsible')) where.responsibleId = url.searchParams.get('responsible'); if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]; return where; }

export async function GET(request: Request) {
  const user = await requireUser();
  const rows = await prisma.incident.findMany({ where: { AND: [secureWhere(user, false, false), filters(new URL(request.url))] }, include: { area: true, responsible: true }, orderBy: { updatedAt: 'desc' }, take: 200 });
  const pdf = basicPdf('Listado filtrado de incidencias', `${rows.length} incidencias visibles según filtros activos`, [{ heading: 'Incidencias', lines: rows.length ? rows.map((r) => `${r.title} | ${r.category} | ${r.area?.name ?? 'Sin área'} | ${r.responsible?.name ?? 'Sin responsable'} | ${statusLabels[r.status]} | ${priorityLabels[r.priority]} | ${r.detectedAt.toLocaleDateString('es-ES')}`) : ['No existen registros para los filtros seleccionados.'] }]);
  return new NextResponse(pdf, { headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="incidencias.pdf"' } });
}
