import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageUsers } from '@/lib/permissions';
import { LegalNotice } from './LegalNotice';
const nav = [['/','Inicio'],['/events','Calendario'],['/tasks','Tareas'],['/incidents','Incidencias'],['/projects','Proyectos'],['/areas','Áreas']];
export async function Shell({ children }: { children: React.ReactNode }) {
 const session = await getServerSession(authOptions); const role = (session?.user as any)?.role;
 const admin = role && canManageUsers({ role });
 return <div className="min-h-screen lg:flex"><aside className="bg-slate-950 p-5 text-white lg:w-72"><h1 className="text-2xl font-bold">FarmaHub360</h1><p className="mt-1 text-sm text-slate-300">Gestión interna de Farmacia</p><nav className="mt-8 grid gap-2">{nav.map(([href,label])=><Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href={href} key={href}>{label}</Link>)}{admin && <><Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href="/users">Usuarios</Link><Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href="/settings">Configuración</Link></>}<Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href="/api/auth/signout">Salir</Link></nav></aside><main className="flex-1 p-6"><div className="mx-auto max-w-7xl space-y-6"><LegalNotice />{children}<footer className="pt-6 text-center text-sm text-slate-500">FarmaHub360 · Desarrollado por Ramón Morillo · 2026</footer></div></main></div>
}
