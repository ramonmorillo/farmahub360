# FarmaHub360

FarmaHub360 es una aplicación web privada para la gestión interna de un Servicio de Farmacia Hospitalaria: tareas, calendario, incidencias, proyectos, áreas, usuarios, comentarios, permisos y auditoría.

> **Aviso de uso:** FarmaHub360 es una herramienta de gestión interna del Servicio de Farmacia. No debe introducirse información clínica identificable ni datos personales de pacientes.

## Stack tecnológico

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL externo, recomendado Neon
- NextAuth con credenciales y contraseñas cifradas con bcrypt
- Preparado para Vercel

## Instalación local

```bash
npm install
cp .env.example .env
```

Configura `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` en `.env`.

## Base de datos y seed

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Usuarios demo:

- `admin@farmahub360.local` / `Demo1234!`
- `jefatura@farmahub360.local` / `Demo1234!`
- `farmaceutico@farmahub360.local` / `Demo1234!`

## Variables de entorno

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/farmahub360?sslmode=require"
NEXTAUTH_SECRET="change-me-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

No subas un `.env` real al repositorio.

## Despliegue en Vercel

1. Crea una base PostgreSQL en Neon u otro proveedor.
2. Enlaza el repositorio de GitHub a Vercel.
3. Añade `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` en Project Settings > Environment Variables.
4. Ejecuta las migraciones contra producción antes del primer uso:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. Despliega.

## Seguridad y permisos

Los registros operativos se almacenan en PostgreSQL y usan `visibility` (`GLOBAL`, `AREA`, `ASSIGNED`, `LEADERSHIP`, `CUSTOM`). Las consultas del backend aplican filtros reutilizables para que un usuario solo pueda listar o exportar lo que tiene permitido ver. Las rutas privadas y endpoints están protegidos por autenticación.

## Módulos incluidos

- Dashboard con indicadores principales.
- Calendario/eventos.
- Tareas.
- Incidencias.
- Proyectos.
- Áreas.
- Usuarios y configuración restringidos a ADMIN/JEFATURA.
- Exportación CSV respetando permisos.
- Modelos para comentarios, auditoría y eliminación lógica (`deletedAt`).
