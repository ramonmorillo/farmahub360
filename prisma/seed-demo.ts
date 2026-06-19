import { PrismaClient } from '@prisma/client';
export async function seedDemo(prisma = new PrismaClient()) {
 const [admin] = await prisma.user.findMany({ take: 1 }); if (!admin) throw new Error('Ejecuta primero la inicialización.');
 const areas = await prisma.area.findMany({ take: 5 }); const a=(i:number)=>areas[i%areas.length]?.id;
 await Promise.all(Array.from({length:5},(_,i)=>prisma.task.create({data:{title:`Tarea demo ${i+1}`,description:'Dato demo no clínico.',areaId:a(i),createdById:admin.id,responsibleId:admin.id,priority:i%2?'MEDIA':'ALTA',status:'PENDIENTE',visibility:'GLOBAL'}})));
 await Promise.all(Array.from({length:5},(_,i)=>prisma.event.create({data:{title:`Evento demo ${i+1}`,description:'Evento operativo demo.',startAt:new Date(Date.now()+86400000*(i+1)),endAt:new Date(Date.now()+86400000*(i+1)+3600000),areaId:a(i),createdById:admin.id,responsibleId:admin.id,priority:'MEDIA',visibility:'GLOBAL'}})));
 await Promise.all(Array.from({length:5},(_,i)=>prisma.incident.create({data:{title:`Incidencia demo ${i+1}`,description:'Incidencia demo sin datos de pacientes.',areaId:a(i),createdById:admin.id,responsibleId:admin.id,priority:'MEDIA',status:'PENDIENTE'}})));
 await Promise.all(Array.from({length:2},(_,i)=>prisma.project.create({data:{name:`Proyecto demo ${i+1}`,description:'Proyecto demo operativo.',areaId:a(i),createdById:admin.id,responsibleId:admin.id,priority:'MEDIA',status:'EN_CURSO',visibility:'GLOBAL'}})));
 return { tasks:5, events:5, incidents:5, projects:2 };
}
if (require.main === module) seedDemo().then(r=>console.log(r)).finally(()=>process.exit());
