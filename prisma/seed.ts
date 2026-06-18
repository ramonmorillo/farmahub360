import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
const prisma = new PrismaClient();
const areaNames = ['Consultas externas','Oncohematología','Ensayos clínicos','Farmacotecnia','Unidosis','Gestión','Calidad','Docencia','Investigación','Logística','Dirección / coordinación','Otra'];
async function main(){
 const passwordHash=await hash('Demo1234!',12);
 const areas=await Promise.all(areaNames.map(name=>prisma.area.upsert({where:{name},update:{},create:{name}})));
 const by=(n:string)=>areas.find(a=>a.name===n)!;
 const admin=await prisma.user.upsert({where:{email:'admin@farmahub360.local'},update:{},create:{name:'Admin Demo',email:'admin@farmahub360.local',passwordHash,role:Role.ADMIN,areas:{connect:areas.map(a=>({id:a.id}))}}});
 const boss=await prisma.user.upsert({where:{email:'jefatura@farmahub360.local'},update:{},create:{name:'Jefatura Demo',email:'jefatura@farmahub360.local',passwordHash,role:Role.JEFATURA,areas:{connect:[{id:by('Dirección / coordinación').id}]}}});
 const farma=await prisma.user.upsert({where:{email:'farmaceutico@farmahub360.local'},update:{},create:{name:'Farmacéutico Demo',email:'farmaceutico@farmahub360.local',passwordHash,role:Role.FARMACEUTICO,areas:{connect:[{id:by('Oncohematología').id},{id:by('Calidad').id}]}}});
 await prisma.task.createMany({data:[
  {title:'Revisar procedimiento de dispensación',description:'Actualizar el circuito interno y validar con Calidad.',areaId:by('Calidad').id,responsibleId:farma.id,dueDate:new Date(Date.now()+86400000*7),priority:'ALTA',status:'EN_CURSO',visibility:'AREA',createdById:boss.id},
  {title:'Planificar inventario trimestral',description:'Coordinar con logística y técnicos.',areaId:by('Logística').id,responsibleId:admin.id,dueDate:new Date(Date.now()+86400000*14),priority:'MEDIA',status:'PENDIENTE',visibility:'GLOBAL',createdById:admin.id},
  {title:'Resolver bloqueo de integración',description:'Seguimiento con sistemas de información.',areaId:by('Gestión').id,responsibleId:boss.id,dueDate:new Date(Date.now()-86400000),priority:'CRITICA',status:'BLOQUEADA',visibility:'LEADERSHIP',createdById:boss.id}
 ]});
 await prisma.event.createMany({data:[
  {title:'Comité de seguridad',description:'Revisión mensual de incidencias.',type:'COMITE',startAt:new Date(Date.now()+86400000*3),endAt:new Date(Date.now()+86400000*3+3600000),areaId:by('Calidad').id,responsibleId:boss.id,priority:'MEDIA',status:'PENDIENTE',visibility:'GLOBAL',createdById:boss.id},
  {title:'Sesión clínica interna',description:'Uso seguro: sin datos identificables de pacientes.',type:'SESION_CLINICA',startAt:new Date(Date.now()+86400000*5),endAt:new Date(Date.now()+86400000*5+5400000),areaId:by('Docencia').id,responsibleId:farma.id,priority:'BAJA',status:'PENDIENTE',visibility:'GLOBAL',createdById:farma.id}
 ]});
 await prisma.incident.createMany({data:[{title:'Incidencia de stock crítico',description:'Comunicación interna y alternativas disponibles.',category:'STOCK_DESABASTECIMIENTO',areaId:by('Logística').id,responsibleId:admin.id,priority:'CRITICA',status:'EN_CURSO',visibility:'GLOBAL',createdById:admin.id},{title:'Documento pendiente de aprobación',description:'Procedimiento en revisión.',category:'DOCUMENTACION',areaId:by('Calidad').id,responsibleId:boss.id,priority:'MEDIA',status:'PENDIENTE',visibility:'AREA',createdById:boss.id}]});
 await prisma.project.createMany({data:[{name:'Cuadro de mando del servicio',description:'Definir indicadores internos agregados y no clínicos.',areaId:by('Dirección / coordinación').id,responsibleId:boss.id,startDate:new Date(),expectedEndDate:new Date(Date.now()+86400000*60),priority:'ALTA',status:'EN_CURSO',visibility:'LEADERSHIP',createdById:boss.id},{name:'Programa de formación anual',description:'Plan docente interno.',areaId:by('Docencia').id,responsibleId:farma.id,startDate:new Date(),expectedEndDate:new Date(Date.now()+86400000*90),priority:'MEDIA',status:'EN_CURSO',visibility:'GLOBAL',createdById:farma.id}]});
 console.log('Seed demo creado. Usuarios: admin@farmahub360.local, jefatura@farmahub360.local, farmaceutico@farmahub360.local / Demo1234!');
}
main().finally(()=>prisma.$disconnect());
