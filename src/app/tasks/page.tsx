import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { secureWhere } from '@/lib/data';
import { addTaskComment, changeTaskStatus, deleteTask, saveTask } from '@/lib/actions';
import { Filters, MultiUsers, Select, Text, TextArea, VisibilitySelect, areaOptions, priorities, priorityLabels, projectOptions, statusLabels, statuses, userOptions, visibilityLabels } from '@/components/AdminForms';

function dateTimeValue(value?: Date | null) {
  if (!value) return '';
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function short(text?: string | null) {
  if (!text) return '—';
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function exportHref(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const key of ['q', 'area', 'status', 'priority', 'responsible']) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `/api/export/tasks${query ? `?${query}` : ''}`;
}

function pdfHref(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const key of ['q', 'area', 'status', 'priority', 'responsible']) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `/api/pdf/tasks${query ? `?${query}` : ''}`;
}

export default async function Page({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const [areas, users, projects] = await Promise.all([
    prisma.area.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
  ]);

  const filters: any = {};
  if (searchParams.status) filters.status = searchParams.status;
  if (searchParams.priority) filters.priority = searchParams.priority;
  if (searchParams.area) filters.areaId = searchParams.area;
  if (searchParams.responsible) filters.responsibleId = searchParams.responsible;
  if (searchParams.q) filters.OR = [{ title: { contains: searchParams.q, mode: 'insensitive' } }, { description: { contains: searchParams.q, mode: 'insensitive' } }];
  const where: any = { AND: [secureWhere(user, true, false), filters] };

  const rows = await prisma.task.findMany({
    where,
    include: { area: true, responsible: true, project: true, createdBy: true, assignees: { include: { user: true } }, comments: { include: { author: true }, orderBy: { createdAt: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const selected = rows.find((task) => task.id === searchParams.detail) ?? rows[0];
  const audits = selected ? await prisma.auditLog.findMany({ where: { entityType: 'TASK', entityId: selected.id }, include: { user: true }, orderBy: { createdAt: 'desc' }, take: 20 }) : [];

  const form = (r?: any) => (
    <form action={saveTask} className="card grid gap-3 md:grid-cols-2">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Text name="title" label="Título" value={r?.title} required />
      <Select name="areaId" label="Área" options={areaOptions(areas)} value={r?.areaId} required />
      <TextArea name="description" label="Descripción" value={r?.description} />
      <Select name="status" label="Estado" options={statuses} value={r?.status} required />
      <Select name="priority" label="Prioridad" options={priorities} value={r?.priority} required />
      <Select name="responsibleId" label="Responsable" options={userOptions(users)} value={r?.responsibleId} />
      <MultiUsers users={users} name="assigneeIds" selected={r?.assignees?.map((a: any) => a.userId)} />
      <Text name="dueDate" label="Fecha límite" type="datetime-local" value={dateTimeValue(r?.dueDate)} />
      <VisibilitySelect value={r?.visibility} />
      <Select name="projectId" label="Proyecto" options={projectOptions(projects)} value={r?.projectId} />
      <TextArea name="comment" label="Comentario" />
      <div className="flex gap-2 md:col-span-2"><a className="btn" href="/tasks">Cancelar</a><button className="btn">Guardar tarea</button></div>
    </form>
  );

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold">Tareas</h2>
        <div className="flex flex-wrap gap-2"><Link className="btn" href="#new">Nueva tarea</Link><a className="btn" href={exportHref(searchParams)}>Exportar CSV</a><a className="btn" href={pdfHref(searchParams)}>Generar PDF</a></div>
      </div>
      <Filters areas={areas} users={users} values={searchParams} />
      {searchParams.error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Tarea</th><th>Área</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th><th>Visibilidad</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map((r) => <tr className="border-b align-top last:border-0" key={r.id}>
            <td className="max-w-sm py-3"><b>{r.title}</b><p className="mt-1 text-slate-600">{short(r.description)}</p></td>
            <td>{r.area?.name ?? 'Sin área'}</td><td>{r.responsible?.name ?? 'Sin responsable'}</td><td>{statusLabels[r.status]}</td><td>{priorityLabels[r.priority]}</td><td>{r.dueDate?.toLocaleDateString('es-ES') ?? '—'}</td><td>{visibilityLabels[r.visibility]}</td>
            <td className="min-w-52 space-y-2"><Link className="btn inline-block" href={`/tasks?detail=${r.id}`}>Ver detalle</Link><a className="btn inline-block" href={`/api/pdf/tasks/${r.id}`}>Generar PDF individual</a><details><summary className="btn cursor-pointer">Editar</summary>{form(r)}<form action={deleteTask}><input type="hidden" name="id" value={r.id} /><button className="btn mt-2">Eliminar lógico</button></form></details><form action={changeTaskStatus} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><select className="input" name="status" defaultValue={r.status}>{statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select><button className="btn">Cambiar</button></form></td>
          </tr>)}</tbody>
        </table>
      </div>

      <details id="new" className="card">
        <summary className="cursor-pointer font-semibold">Nueva tarea</summary>
        <div className="mt-3">{form()}</div>
      </details>

      {selected && <section className="card grid gap-4"><h3 className="text-xl font-bold">Detalle: {selected.title}</h3><p>{selected.description ?? 'Sin descripción'}</p><div className="grid gap-2 text-sm md:grid-cols-3"><p><b>Área:</b> {selected.area?.name ?? '—'}</p><p><b>Responsable:</b> {selected.responsible?.name ?? '—'}</p><p><b>Proyecto:</b> {selected.project?.name ?? '—'}</p><p><b>Estado:</b> {statusLabels[selected.status]}</p><p><b>Prioridad:</b> {priorityLabels[selected.priority]}</p><p><b>Visibilidad:</b> {visibilityLabels[selected.visibility]}</p><p><b>Asignados:</b> {selected.assignees.map((a) => a.user.name).join(', ') || '—'}</p></div><form action={addTaskComment} className="grid gap-2"><input type="hidden" name="id" value={selected.id} /><TextArea name="comment" label="Nuevo comentario" /><button className="btn w-fit">Añadir comentario</button></form><div><h4 className="font-semibold">Comentarios</h4>{selected.comments.map((c) => <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm" key={c.id}><b>{c.author.name}</b> · {c.createdAt.toLocaleString('es-ES')}<br />{c.text}</p>)}</div><div><h4 className="font-semibold">Historial</h4>{audits.map((a) => <p className="mt-2 text-sm" key={a.id}>{a.createdAt.toLocaleString('es-ES')} · {a.user?.name ?? 'Sistema'} · {a.action} · {a.summary}</p>)}</div></section>}
    </Shell>
  );
}
