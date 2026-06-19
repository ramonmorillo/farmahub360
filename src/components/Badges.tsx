import { Priority, Status, Visibility } from '@prisma/client';
import { priorityLabels, statusLabels, visibilityLabels } from './AdminForms';

const statusClass: Record<Status, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-800 ring-amber-200',
  EN_CURSO: 'bg-blue-50 text-blue-800 ring-blue-200',
  BLOQUEADA: 'bg-red-50 text-red-800 ring-red-200',
  COMPLETADA: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELADA: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const priorityClass: Record<Priority, string> = {
  BAJA: 'bg-slate-50 text-slate-700 ring-slate-200',
  MEDIA: 'bg-sky-50 text-sky-800 ring-sky-200',
  ALTA: 'bg-orange-50 text-orange-800 ring-orange-200',
  CRITICA: 'bg-red-100 text-red-900 ring-red-300',
};
const visibilityClass: Record<Visibility, string> = {
  GLOBAL: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  AREA: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  ASSIGNED: 'bg-violet-50 text-violet-800 ring-violet-200',
  LEADERSHIP: 'bg-slate-900 text-white ring-slate-900',
  CUSTOM: 'bg-slate-100 text-slate-700 ring-slate-200',
};
function Badge({ label, cls }: { label: string; cls: string }) { return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${cls}`}>{label}</span>; }
export function StatusBadge({ value }: { value: Status }) { return <Badge label={statusLabels[value]} cls={statusClass[value]} />; }
export function PriorityBadge({ value }: { value: Priority }) { return <Badge label={priorityLabels[value]} cls={priorityClass[value]} />; }
export function VisibilityBadge({ value }: { value: Visibility }) { return <Badge label={visibilityLabels[value]} cls={visibilityClass[value]} />; }
