import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
export default async function Areas(){await requireUser(); const areas=await prisma.area.findMany({orderBy:{name:'asc'},include:{_count:{select:{users:true,tasks:true,events:true,incidents:true,projects:true}}}}); return <Shell><h2 className="text-3xl font-bold">Áreas</h2><div className="grid gap-3 md:grid-cols-2">{areas.map(a=><div className="card" key={a.id}><h3 className="font-semibold">{a.name}</h3><p className="text-sm text-slate-500">{a._count.users} usuarios · {a._count.tasks+a._count.events+a._count.incidents+a._count.projects} registros</p></div>)}</div></Shell>}
