import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/session';
import { canManageUsers } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { resetPassword, saveUser } from '@/lib/actions';
import { roles } from '@/components/AdminForms';

export default async function Users({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser();
  if (!canManageUsers(user)) notFound();

  const params = await searchParams;
  const [users, areas] = await Promise.all([
    prisma.user.findMany({ include: { areas: true }, orderBy: { createdAt: 'desc' } }),
    prisma.area.findMany({ orderBy: { name: 'asc' } })
  ]);

  const areaSelect = (sel: string[] = []) => (
    <select className="input min-h-24" name="areaIds" multiple defaultValue={sel}>
      {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
    </select>
  );

  return (
    <Shell>
      <h2 className="text-3xl font-bold">Usuarios</h2>
      {params?.error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}
      {params?.success ? <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">{params.success}</p> : null}
      <form action={saveUser} className="card grid gap-3 md:grid-cols-3">
        <h3 className="font-semibold md:col-span-3">Crear usuario</h3>
        <input className="input" name="name" placeholder="Nombre" required />
        <input className="input" name="email" type="email" placeholder="Email" required />
        <input className="input" name="password" type="password" placeholder="Contraseña inicial" />
        <select className="input" name="role">{roles.map(role => <option key={role}>{role}</option>)}</select>
        {areaSelect()}
        <label><input name="active" type="checkbox" defaultChecked /> Activo</label>
        <button className="btn">Crear</button>
      </form>
      <div className="grid gap-3">
        {users.map(existingUser => (
          <div className="card" key={existingUser.id}>
            <form action={saveUser} className="grid gap-2 md:grid-cols-6">
              <input type="hidden" name="id" value={existingUser.id} />
              <input className="input" name="name" defaultValue={existingUser.name} />
              <input className="input" name="email" defaultValue={existingUser.email} />
              <select className="input" name="role" defaultValue={existingUser.role}>{roles.map(role => <option key={role}>{role}</option>)}</select>
              {areaSelect(existingUser.areas.map(area => area.id))}
              <label><input name="active" type="checkbox" defaultChecked={existingUser.active} /> Activo</label>
              <button className="btn">Guardar</button>
            </form>
            <form action={resetPassword} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={existingUser.id} />
              <input className="input max-w-xs" name="password" type="password" placeholder="Nueva contraseña" />
              <button className="btn">Resetear contraseña</button>
            </form>
          </div>
        ))}
      </div>
    </Shell>
  );
}
