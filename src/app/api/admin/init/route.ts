import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedDatabase } from '../../../../../prisma/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

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
      message: 'No se pudo ejecutar prisma migrate deploy desde la ruta API. En Vercel puede ser preferible ejecutarlo con npm run prisma:migrate:deploy o npm run db:init en un entorno con acceso a DATABASE_URL.',
      error: details
    };
  }
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

  const response: Record<string, unknown> = { ok: false, migrations: null, tables: {}, seed: null, errors: [] };

  const migrations = await runMigrations();
  response.migrations = migrations;

  try {
    const userTableExists = await tableExists('User');
    const areaTableExists = await tableExists('Area');
    response.tables = { User: userTableExists, Area: areaTableExists };

    if (!userTableExists || !areaTableExists) {
      return NextResponse.json({
        ...response,
        ok: false,
        message: 'La base de datos aún no tiene las tablas necesarias. Revisa el resultado de migraciones y ejecuta npm run prisma:migrate:deploy contra Neon si Vercel no pudo hacerlo desde esta ruta.'
      }, { status: 500 });
    }

    const seed = await seedDatabase(prisma);
    response.seed = seed;
    response.ok = true;
    return NextResponse.json({
      ...response,
      message: 'Inicialización completada. Debe existir la tabla public."User" y el login admin@farmahub360.local / Demo1234! debe funcionar.'
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ...response, ok: false, errors: [details] }, { status: 500 });
  }
}
