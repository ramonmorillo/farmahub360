import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { secureWhere, includeCommon } from '@/lib/data';
const map:any={tasks:['task',true,false],events:['event',true,false],incidents:['incident',false,false],projects:['project',false,true]};
function csv(rows:any[]){ const head=['id','titulo','area','responsable','prioridad','estado','visibilidad','creado']; return [head.join(','),...rows.map(r=>[r.id,r.title??r.name,r.area?.name,r.responsible?.name,r.priority,r.status,r.visibility,r.createdAt].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n') }
export async function GET(_:Request,{params}:{params:{entity:string}}){ const cfg=map[params.entity]; if(!cfg) return NextResponse.json({error:'Entidad no soportada'},{status:404}); const user=await requireUser(); const rows=await (prisma as any)[cfg[0]].findMany({where:secureWhere(user,cfg[1],cfg[2]),include:includeCommon,take:1000}); return new NextResponse(csv(rows),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${params.entity}.csv"`}}); }
