import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { secureWhere } from '@/lib/data';
function Stat({label,value}:{label:string;value:number}){return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>}
export default async function Home(){const user=await requireUser();const now=new Date();const [my,overdue,critical,events,incidents,projects]=await Promise.all([
 prisma.task.count({where:{...secureWhere(user,true),status:{not:'COMPLETADA'}} as any}),
 prisma.task.count({where:{...secureWhere(user,true),dueDate:{lt:now},status:{notIn:['COMPLETADA','CANCELADA']}} as any}),
 prisma.task.count({where:{...secureWhere(user,true),priority:'CRITICA',status:{not:'COMPLETADA'}} as any}),
 prisma.event.count({where:{...secureWhere(user,true),startAt:{gte:now}} as any}),
 prisma.incident.count({where:{...secureWhere(user),status:{notIn:['COMPLETADA','CANCELADA']}} as any}),
 prisma.project.count({where:{...secureWhere(user,false,true),status:'EN_CURSO'} as any})]);
 return <Shell><h2 className="text-3xl font-bold">Inicio</h2><div className="grid gap-4 md:grid-cols-3"><Stat label="Mis tareas pendientes" value={my}/><Stat label="Tareas vencidas" value={overdue}/><Stat label="Tareas críticas" value={critical}/><Stat label="Eventos próximos" value={events}/><Stat label="Incidencias abiertas" value={incidents}/><Stat label="Proyectos activos" value={projects}/></div><div className="card"><h3 className="font-semibold">Filtros disponibles</h3><p className="mt-2 text-sm text-slate-600">Las vistas permiten filtrar por área, estado y prioridad mediante parámetros URL: <code>?area=&priority=&status=</code>.</p></div></Shell>}
