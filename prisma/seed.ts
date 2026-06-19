import { Area, PrismaClient, Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';

const areaNames = [
  'Dirección / coordinación',
  'Consultas externas',
  'Hospital de día / oncohematología',
  'Ensayos clínicos',
  'Farmacotecnia',
  'Nutrición / mezclas intravenosas',
  'Unidosis / hospitalización',
  'Urgencias / críticos',
  'Gestión de adquisiciones',
  'Logística / almacén',
  'Calidad / seguridad',
  'Docencia',
  'Investigación / innovación',
  'Sistemas de información',
  'Guardias'
];

type SeedResult = {
  areasCreated: string[];
  areasExisting: string[];
  adminCreated: boolean;
  adminAlreadyExisted: boolean;
  demoCreated: Record<string, number>;
};

export async function seedDatabase(prisma: PrismaClient = new PrismaClient()): Promise<SeedResult> {
  const result: SeedResult = {
    areasCreated: [],
    areasExisting: [],
    adminCreated: false,
    adminAlreadyExisted: false,
    demoCreated: { users: 0, tasks: 0, events: 0, incidents: 0, projects: 0 }
  };

  const areas: Area[] = [];
  for (const name of areaNames) {
    const existing = await prisma.area.findUnique({ where: { name } });
    if (existing) {
      result.areasExisting.push(name);
      areas.push(existing);
    } else {
      areas.push(await prisma.area.create({ data: { name } }));
      result.areasCreated.push(name);
    }
  }

  const by = (name: string) => areas.find((area) => area.name === name)!;
  const passwordHash = await hash('Demo1234!', 12);

  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@farmahub360.local' } });
  const admin = existingAdmin ?? await prisma.user.create({
    data: {
      name: 'Administrador FarmaHub360',
      email: 'admin@farmahub360.local',
      passwordHash,
      role: Role.ADMIN,
      areas: { connect: areas.map((area) => ({ id: area.id })) }
    }
  });
  result.adminCreated = !existingAdmin;
  result.adminAlreadyExisted = Boolean(existingAdmin);

  const demoUsers = [
    { email: 'jefatura@farmahub360.local', name: 'Jefatura Demo', role: Role.JEFATURA, areaNames: ['Dirección / coordinación'] },
    { email: 'farmaceutico@farmahub360.local', name: 'Farmacéutico Demo', role: Role.FARMACEUTICO, areaNames: ['Hospital de día / oncohematología', 'Calidad / seguridad'] }
  ];

  const users = { admin } as Record<string, User>;
  for (const demoUser of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: demoUser.email } });
    const user = existing ?? await prisma.user.create({
      data: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        areas: { connect: demoUser.areaNames.map((name) => ({ id: by(name).id })) }
      }
    });
    if (!existing) result.demoCreated.users += 1;
    users[demoUser.email.split('@')[0]] = user;
  }

  if (await prisma.task.count() === 0) {
    await prisma.task.createMany({ data: [
      { title: 'Revisar procedimiento de dispensación', description: 'Actualizar el circuito interno y validar con Calidad.', areaId: by('Calidad / seguridad').id, responsibleId: users.farmaceutico.id, dueDate: new Date(Date.now() + 86400000 * 7), priority: 'ALTA', status: 'EN_CURSO', visibility: 'AREA', createdById: users.jefatura.id },
      { title: 'Planificar inventario trimestral', description: 'Coordinar con logística y técnicos.', areaId: by('Logística / almacén').id, responsibleId: admin.id, dueDate: new Date(Date.now() + 86400000 * 14), priority: 'MEDIA', status: 'PENDIENTE', visibility: 'GLOBAL', createdById: admin.id }
    ] });
    result.demoCreated.tasks = 2;
  }

  if (await prisma.event.count() === 0) {
    await prisma.event.create({ data: { title: 'Comité de seguridad', description: 'Revisión mensual de incidencias.', type: 'COMITE', startAt: new Date(Date.now() + 86400000 * 3), endAt: new Date(Date.now() + 86400000 * 3 + 3600000), areaId: by('Calidad / seguridad').id, responsibleId: users.jefatura.id, priority: 'MEDIA', status: 'PENDIENTE', visibility: 'GLOBAL', createdById: users.jefatura.id } });
    result.demoCreated.events = 1;
  }

  if (await prisma.incident.count() === 0) {
    await prisma.incident.create({ data: { title: 'Incidencia de stock crítico', description: 'Comunicación interna y alternativas disponibles.', category: 'STOCK_DESABASTECIMIENTO', areaId: by('Logística / almacén').id, responsibleId: admin.id, priority: 'CRITICA', status: 'EN_CURSO', visibility: 'GLOBAL', createdById: admin.id } });
    result.demoCreated.incidents = 1;
  }

  if (await prisma.project.count() === 0) {
    await prisma.project.create({ data: { name: 'Cuadro de mando del servicio', description: 'Definir indicadores internos agregados y no clínicos.', areaId: by('Dirección / coordinación').id, responsibleId: users.jefatura.id, startDate: new Date(), expectedEndDate: new Date(Date.now() + 86400000 * 60), priority: 'ALTA', status: 'EN_CURSO', visibility: 'LEADERSHIP', createdById: users.jefatura.id } });
    result.demoCreated.projects = 1;
  }

  return result;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedDatabase(prisma);
    console.log('Seed completado:', result);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
}
