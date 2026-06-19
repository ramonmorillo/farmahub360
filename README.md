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
6. Comprueba que el comando de build de Vercel ejecuta las migraciones antes de compilar Next.js:

   ```bash
   prisma generate && prisma migrate deploy && next build
   ```

   Este repositorio ya configura ese flujo en el script `build`. No uses `prisma migrate dev` en producción.
7. Haz redeploy del proyecto para que Vercel cargue las nuevas variables, genere el cliente Prisma, ejecute `prisma migrate deploy` contra Neon y compile la aplicación.
8. Inicializa el seed idempotente de producción desde el navegador con la ruta segura:

   ```text
   https://farmahub360.vercel.app/api/admin/init?secret=VALOR_DE_SEED_SECRET
   ```

   La ruta comprueba `SEED_SECRET`, verifica la conexión con Prisma, confirma que las tablas ya existen y ejecuta solo el seed idempotente. No instala dependencias ni ejecuta migraciones desde runtime. Si la tabla `User` aún no existe, devolverá un JSON claro indicando que debes ejecutar `prisma migrate deploy` durante el build/deploy.
9. Vuelve al login y entra con:

   ```text
   admin@farmahub360.local
   Demo1234!
   ```

Después del próximo deploy, `prisma migrate deploy` debe ejecutarse en build, debe existir la tabla `public."User"` en Neon, `/api/admin/init` debe crear el usuario administrador inicial y el login debe funcionar.


## Alta del primer usuario real

Después de inicializar producción y entrar con el usuario demo administrador, crea cuanto antes una cuenta real de administración:

1. Entra en `/users` con un usuario `ADMIN`.
2. Completa **Nombre**, **Email**, **Contraseña inicial**, **Rol**, **Áreas** y el estado **Activo**.
3. Usa un rol válido del sistema: `ADMIN`, `JEFATURA`, `COORDINADOR_AREA`, `FARMACEUTICO`, `TECNICO`, `ADMINISTRATIVO` o `INVITADO`.
4. Entrega la contraseña temporal por un canal seguro y pide al usuario que la cambie en el primer acceso operativo.
5. Verifica que la cuenta nueva puede iniciar sesión.

Por seguridad, tras confirmar que existe al menos un administrador real, cambia la contraseña de las cuentas demo o desactívalas desde `/users`. No mantengas en producción `admin@farmahub360.local` con la contraseña demo `Demo1234!`.

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
