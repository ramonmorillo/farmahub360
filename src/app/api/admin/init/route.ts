import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminEmail = 'admin@farmahub360.local';
const adminPassword = 'Demo1234!';
const adminName = 'Administrador FarmaHub360';

const initialAreaNames = [
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

async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

async function getMissingRequiredTables() {
  const requiredTables = ['User', 'Area'];
  const checks = await Promise.all(requiredTables.map(async (tableName) => ({
    tableName,
    exists: await tableExists(tableName)
  })));

  return checks.filter(({ exists }) => !exists).map(({ tableName }) => tableName);
}

async function ensureInitialAreas() {
  const result = await prisma.area.createMany({
    data: initialAreaNames.map((name) => ({ name })),
    skipDuplicates: true
  });

  return {
    status: result.count > 0 ? 'created' : 'already_exists',
    createdCount: result.count
  };
}

async function ensureAdminUser() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    return { status: 'already_exists', email: adminEmail };
  }

  const areas = await prisma.area.findMany({
    where: { name: { in: initialAreaNames } },
    select: { id: true }
  });
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      areas: { connect: areas.map((area) => ({ id: area.id })) }
    }
  });

  return { status: 'created', email: adminEmail };
}

export async function GET(request: Request) {
  const configuredSecret = process.env.SEED_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ ok: false, error: 'SEED_SECRET no está configurado en las variables de entorno.' }, { status: 500 });
  }

  const providedSecret = new URL(request.url).searchParams.get('secret');
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: 'Secret inválido.' }, { status: 401 });
  }

  try {
    await checkDatabaseConnection();

    const missingTables = await getMissingRequiredTables();
    if (missingTables.length > 0) {
      return NextResponse.json({
        ok: false,
        message: 'Database schema is not migrated. Run prisma migrate deploy during build/deploy.',
        missingTables
      }, { status: 500 });
    }

    const areas = await ensureInitialAreas();
    const adminUser = await ensureAdminUser();

    return NextResponse.json({
      ok: true,
      message: 'FarmaHub360 database initialized',
      adminUser,
      areas
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message: 'No se pudo inicializar la base de datos.', error: details }, { status: 500 });
  }
}
