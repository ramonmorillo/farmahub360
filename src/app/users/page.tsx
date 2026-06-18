import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { canManageUsers } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
export default async function Users(){const user=await requireUser(); if(!canManageUsers(user)) notFound(); const users=await prisma.user.findMany({include:{areas:true},orderBy:{createdAt:'desc'}}); return <Shell><h2 className="text-3xl font-bold">Usuarios</h2><div className="card overflow-x-auto"><table className="w-full text-sm"><tbody>{users.map(u=><tr className="border-b" key={u.id}><td className="py-2 font-medium">{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active?'Activo':'Inactivo'}</td><td>{u.areas.map(a=>a.name).join(', ')}</td></tr>)}</tbody></table></div></Shell>}
