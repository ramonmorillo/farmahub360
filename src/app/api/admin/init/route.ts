import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const initialAreaNames = [
  'Consultas externas',
  'Oncohematología',
  'Ensayos clínicos',
  'Farmacotecnia',
  'Unidosis',
  'Gestión',
  'Calidad',
  'Docencia',
  'Investigación',
  'Logística',
  'Dirección / coordinación',
  'Otra'
];

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass(${`public."${tableName}"`}) IS NOT NULL AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function runMigrations() {
  try {
    const { stdout, stderr } = await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: process.env,
      timeout: 55_000,
      maxBuffer: 1024 * 1024
    });
    return { attempted: true, ok: true, message: 'prisma migrate deploy ejecutado correctamente.', stdout, stderr };
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return {
      attempted: true,
      ok: false,
      message: 'No se pudo ejecutar prisma migrate deploy desde la ruta API. Ejecuta npm run prisma:migrate:deploy o npm run db:init en un entorno con acceso a DATABASE_URL si las tablas aún no existen.',
      error: details
    };
  }
}

async function ensureInitialAreas() {
  let createdCount = 0;

  for (const name of initialAreaNames) {
    const existing = await prisma.area.findUnique({ where: { name } });
    if (!existing) {
      await prisma.area.create({ data: { name } });
      createdCount += 1;
    }
  }

  return createdCount > 0 ? 'created' : 'already_exists';
}

async function ensureAdminUser() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@farmahub360.local' } });
  if (existingAdmin) return 'already_exists';

  const areas = await prisma.area.findMany({ where: { name: { in: initialAreaNames } }, select: { id: true } });
  const passwordHash = await hash('Demo1234!', 12);

  await prisma.user.create({
    data: {
      name: 'Administrador FarmaHub360',
      email: 'admin@farmahub360.local',
      passwordHash,
      role: Role.ADMIN,
      areas: { connect: areas.map((area) => ({ id: area.id })) }
    }
  });

  return 'created';
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

  const migrations = await runMigrations();

  try {
    const userTableExists = await tableExists('User');
    const areaTableExists = await tableExists('Area');
    const tables = { User: userTableExists, Area: areaTableExists };

    if (!userTableExists || !areaTableExists) {
      return NextResponse.json({
        ok: false,
        message: 'La base de datos aún no tiene las tablas necesarias. Revisa migrations y ejecuta npm run prisma:migrate:deploy contra Neon si Vercel no pudo hacerlo desde esta ruta.',
        migrations,
        tables
      }, { status: 500 });
    }

    const areas = await ensureInitialAreas();
    const adminUser = await ensureAdminUser();

    return NextResponse.json({
      ok: true,
      message: 'FarmaHub360 database initialized',
      adminUser,
      areas,
      migrations,
      tables
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message: 'No se pudo inicializar la base de datos.', migrations, error: details }, { status: 500 });
  }
}
