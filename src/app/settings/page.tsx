import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { canManageUsers } from '@/lib/permissions';
import { notFound } from 'next/navigation';
export default async function Settings(){const user=await requireUser(); if(!canManageUsers(user)) notFound(); return <Shell><h2 className="text-3xl font-bold">Configuración</h2><div className="card"><p>Panel reservado para ADMIN y JEFATURA. Configure DATABASE_URL, NEXTAUTH_SECRET y NEXTAUTH_URL como variables de entorno en Vercel.</p></div></Shell>}
