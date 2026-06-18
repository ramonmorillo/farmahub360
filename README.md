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

Configura `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `SEED_SECRET` en `.env`.

## Base de datos y seed

```bash
npm run prisma:generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Usuarios demo:

- `admin@farmahub360.local` / `Demo1234!`
- `jefatura@farmahub360.local` / `Demo1234!`
- `farmaceutico@farmahub360.local` / `Demo1234!`

El seed es idempotente: crea las áreas iniciales, el usuario administrador inicial y datos demo básicos solo cuando faltan.

## Variables de entorno

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/farmahub360?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-with-a-long-random-secret"
SEED_SECRET="change-me-with-a-long-random-seed-secret"
```

No subas un `.env` real al repositorio.

## Despliegue en Vercel con Neon PostgreSQL

1. En Vercel, abre el proyecto y crea Neon desde **Storage** para que Vercel conecte la base PostgreSQL al proyecto.
2. En **Project Settings > Environment Variables**, comprueba que existe `DATABASE_URL` y que apunta a Neon.
3. Añade `NEXTAUTH_URL` con la URL pública exacta de producción, por ejemplo `https://farmahub360.vercel.app`.
4. Añade `NEXTAUTH_SECRET` con un valor largo y aleatorio.
5. Añade `SEED_SECRET` con un valor largo, aleatorio y privado. Este valor protege la ruta temporal de inicialización.
6. Haz redeploy del proyecto para que Vercel cargue las nuevas variables y el cliente Prisma generado.
7. Inicializa producción desde el navegador con la ruta segura:

   ```text
   https://farmahub360.vercel.app/api/admin/init?secret=VALOR_DE_SEED_SECRET
   ```

   La ruta comprueba `SEED_SECRET`, intenta ejecutar `prisma migrate deploy`, verifica si existen las tablas principales y ejecuta el seed idempotente. Si Vercel no permite completar las migraciones desde una función serverless, la respuesta JSON indicará el error y deberás ejecutar contra la misma `DATABASE_URL`:

   ```bash
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```

   También puedes ejecutar ambos pasos con:

   ```bash
   npm run db:init
   ```

8. Vuelve al login y entra con:

   ```text
   admin@farmahub360.local
   Demo1234!
   ```

Después de aplicar las migraciones y el seed debe existir la tabla `public."User"` en Neon, debe existir el usuario administrador inicial y el login debe funcionar.

## Scripts útiles

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run db:init
```

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
