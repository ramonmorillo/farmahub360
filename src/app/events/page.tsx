import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { secureWhere } from '@/lib/data';
import { saveEvent } from '@/lib/actions';
import {
  Filters,
  MultiUsers,
  Select,
  Text,
  TextArea,
  VisibilitySelect,
  areaOptions,
  eventTypes,
  priorities,
  priorityLabels,
  statusLabels,
  userOptions,
  visibilityLabels,
} from '@/components/AdminForms';

export default async function Page({ searchParams }: { searchParams: Record<string, string> }) {
  const user = await requireUser();
  const [areas, users] = await Promise.all([
    prisma.area.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  const where: any = { ...secureWhere(user, true, false) };

  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.priority) where.priority = searchParams.priority;
  if (searchParams.area) where.areaId = searchParams.area;
  if (searchParams.responsible) where.responsibleId = searchParams.responsible;
  if (searchParams.q) where.title = { contains: searchParams.q, mode: 'insensitive' };

  const rows = await prisma.event.findMany({
    where,
    include: { area: true, responsible: true, assignees: { include: { user: true } } },
    orderBy: { startAt: 'asc' },
    take: 100,
  });
  const upcoming = rows.filter((row) => row.startAt >= new Date()).slice(0, 10);
  const month = rows.filter((row) => row.startAt.getMonth() === new Date().getMonth());

  const form = (row?: any) => (
    <form action={saveEvent} className="card grid gap-3 md:grid-cols-2">
      {row && <input type="hidden" name="id" value={row.id} />}
      <Text name="title" label="Título" value={row?.title} required />
      <Select name="type" label="Tipo" options={eventTypes} value={row?.type} />
      <TextArea name="description" label="Descripción" value={row?.description} />
      <Text name="startAt" label="Inicio" type="datetime-local" required />
      <Text name="endAt" label="Fin" type="datetime-local" required />
      <Select name="areaId" label="Área" options={areaOptions(areas)} value={row?.areaId} />
      <Select name="responsibleId" label="Responsable" options={userOptions(users)} value={row?.responsibleId} />
      <MultiUsers users={users} name="assigneeIds" selected={row?.assignees?.map((assignee: any) => assignee.userId)} />
      <Select name="priority" label="Prioridad" options={priorities} value={row?.priority} />
      <VisibilitySelect value={row?.visibility} />
      <TextArea name="comment" label="Comentario" />
      <button className="btn md:col-span-2">Guardar evento</button>
    </form>
  );

  return (
    <Shell>
      <div className="flex justify-between">
        <h2 className="text-3xl font-bold">Calendario</h2>
        <Link className="btn" href="#new">Nuevo evento</Link>
      </div>
      <Filters areas={areas} users={users} values={searchParams} />
      <div id="new">{form()}</div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Próximos eventos</h3>
          {upcoming.map((event) => <p key={event.id} className="mt-2 text-sm">{event.startAt.toLocaleString('es-ES')} · {event.title}</p>)}
        </div>
        <div className="card">
          <h3 className="font-semibold">Vista mensual sencilla</h3>
          {month.map((event) => <p key={event.id} className="mt-2 text-sm">Día {event.startAt.getDate()} · {event.title}</p>)}
        </div>
      </section>
      <div className="grid gap-3">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <h3 className="font-semibold">{row.title}</h3>
            <p>{row.description}</p>
            <p className="text-xs">
              {row.startAt.toLocaleString('es-ES')} - {row.endAt.toLocaleString('es-ES')} · {row.area?.name ?? 'Sin área'} · {row.responsible?.name ?? 'Sin responsable'} · {priorityLabels[row.priority]} · {statusLabels[row.status]} · {visibilityLabels[row.visibility]}
            </p>
            <details><summary>Editar</summary>{form(row)}</details>
          </article>
        ))}
      </div>
    </Shell>
  );
}
