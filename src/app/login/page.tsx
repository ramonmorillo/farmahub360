'use client';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function messageForError(error: string) {
  if (error === 'DATABASE_NOT_INITIALIZED' || error === 'Configuration') {
    return 'La base de datos de producción todavía no está inicializada. Ejecuta la ruta segura /api/admin/init con SEED_SECRET y vuelve a intentarlo.';
  }
  return 'Credenciales no válidas o servicio temporalmente no disponible.';
}

function LoginForm(){
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');
  const [error,setError]=useState(initialError ? messageForError(initialError) : '');
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6"><form className="card w-full max-w-md space-y-4" onSubmit={async e=>{e.preventDefault();setError('');const f=new FormData(e.currentTarget);const r=await signIn('credentials',{email:f.get('email'),password:f.get('password'),redirect:false,callbackUrl:'/'}); if(r?.ok && r.url){window.location.href=r.url;return;} if(r?.error)setError(messageForError(r.error));}}><h1 className="text-2xl font-bold">Entrar en FarmaHub360</h1><p className="text-sm text-slate-600">Demo: admin@farmahub360.local / Demo1234!</p><input className="input" name="email" type="email" placeholder="Email" required/><input className="input" name="password" type="password" placeholder="Contraseña" required/>{error&&<p className="text-sm text-red-600">{error}</p>}<button className="btn w-full">Entrar</button></form></main>;
}

export default function Login(){
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 p-6"><div className="card w-full max-w-md">Cargando…</div></main>}><LoginForm /></Suspense>;
}
