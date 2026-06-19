import { EventType, IncidentCategory, Priority, Role, Status, Visibility } from '@prisma/client';

type Option = string | { value: string; label: string };

export const priorityLabels: Record<Priority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica'
};

export const statusLabels: Record<Status, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada'
};

export const visibilityLabels: Record<Visibility, string> = {
  GLOBAL: 'Todo el servicio',
  AREA: 'Solo el área seleccionada',
  ASSIGNED: 'Solo responsables/asignados',
  LEADERSHIP: 'Solo jefatura/coordinación',
  CUSTOM: 'Personalizado'
};

export const visibilityHelp: Record<Exclude<Visibility, 'CUSTOM'>, string> = {
  GLOBAL: 'Todo el servicio: visible para todos los usuarios autenticados.',
  AREA: 'Solo el área seleccionada: visible para usuarios pertenecientes al área indicada.',
  ASSIGNED: 'Solo responsables/asignados: visible para creador, responsable y usuarios asignados.',
  LEADERSHIP: 'Solo jefatura/coordinación: visible para perfiles ADMIN y JEFATURA.'
};

export const priorities = Object.values(Priority).map((value) => ({ value, label: priorityLabels[value] }));
export const statuses = Object.values(Status).map((value) => ({ value, label: statusLabels[value] }));
export const visibilities = Object.values(Visibility)
  .filter((value) => value !== 'CUSTOM')
  .map((value) => ({ value, label: visibilityLabels[value] }));
export const roles = Object.values(Role);
export const eventTypes = Object.values(EventType);
export const incidentCategories = Object.values(IncidentCategory);

const optionValue = (option: Option) => typeof option === 'string' ? option : option.value;
const optionLabel = (option: Option) => typeof option === 'string' ? option : option.label;

export function Select({ name, options, value, label, required = false, help }: { name: string; options: Option[]; value?: string | null; label?: string; required?: boolean; help?: string }) {
  return <label className="grid gap-1 text-sm">{label ?? name}<select className="input" name={name} defaultValue={value ?? ''} required={required}><option value="">—</option>{options.map((option) => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}</select>{help && <span className="text-xs text-slate-500">{help}</span>}</label>;
}

export function Text({ name, label, value, type = 'text', required = false }: { name: string; label: string; value?: string | null; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm">{label}<input className="input" name={name} type={type} defaultValue={value ?? ''} required={required}/></label>;
}

export function TextArea({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return <label className="grid gap-1 text-sm md:col-span-2">{label}<textarea className="input" name={name} defaultValue={value ?? ''}/></label>;
}

export function areaOptions(areas: { id: string; name: string }[]) {
  return areas.map((area) => ({ value: area.id, label: area.name }));
}

export function userOptions(users: { id: string; name: string }[]) {
  return users.map((user) => ({ value: user.id, label: user.name }));
}

export function projectOptions(projects: { id: string; name: string }[]) {
  return projects.map((project) => ({ value: project.id, label: project.name }));
}

export function MultiUsers({ users, name, selected = [], label = 'Usuarios asignados' }: { users: { id: string; name: string }[]; name: string; selected?: string[]; label?: string }) {
  return <label className="grid gap-1 text-sm">{label}<select className="input min-h-28" name={name} multiple defaultValue={selected}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>;
}

export function VisibilitySelect({ value }: { value?: string | null }) {
  const selected = value === 'CUSTOM' ? '' : value;
  return <div className="grid gap-2 text-sm md:col-span-2"><Select name="visibility" label="Visibilidad" options={visibilities} value={selected} required/><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p className="font-medium text-slate-700">Ayuda de visibilidad</p><ul className="mt-1 list-disc space-y-1 pl-5">{Object.values(visibilityHelp).map((text) => <li key={text}>{text}</li>)}</ul></div></div>;
}

export function Filters({ areas, users }: { areas: { id: string; name: string }[]; users: { id: string; name: string }[] }) {
  return <form className="card grid gap-3 md:grid-cols-5"><input className="input" name="q" placeholder="Buscar"/><select className="input" name="area"><option value="">Área</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><select className="input" name="status"><option value="">Estado</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><select className="input" name="priority"><option value="">Prioridad</option>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select><select className="input" name="responsible"><option value="">Responsable</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><button className="btn md:col-span-5">Filtrar</button></form>;
}
