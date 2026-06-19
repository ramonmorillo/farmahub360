import { priorityLabels, statusLabels, visibilityLabels } from '@/components/AdminForms';

export function formatDate(value?: Date | null, withTime = false) {
  if (!value) return '—';
  return withTime ? value.toLocaleString('es-ES') : value.toLocaleDateString('es-ES');
}

export function filterParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ['q', 'area', 'status', 'priority', 'responsible']) {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  return params;
}

export function taskFilters(searchParams: Record<string, string | string[] | undefined>) {
  const where: any = {};
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const priority = Array.isArray(searchParams.priority) ? searchParams.priority[0] : searchParams.priority;
  const area = Array.isArray(searchParams.area) ? searchParams.area[0] : searchParams.area;
  const responsible = Array.isArray(searchParams.responsible) ? searchParams.responsible[0] : searchParams.responsible;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (area) where.areaId = area;
  if (responsible) where.responsibleId = responsible;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  return where;
}

export function labelStatus(value: keyof typeof statusLabels) { return statusLabels[value] ?? String(value); }
export function labelPriority(value: keyof typeof priorityLabels) { return priorityLabels[value] ?? String(value); }
export function labelVisibility(value: keyof typeof visibilityLabels) { return visibilityLabels[value] ?? String(value); }
