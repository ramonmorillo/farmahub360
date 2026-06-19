import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';import { seedDemo } from '../../../../../prisma/seed-demo';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(request:Request){const secret=process.env.SEED_SECRET; const provided=new URL(request.url).searchParams.get('secret'); if(!secret||provided!==secret) return NextResponse.json({ok:false,error:'Secret inválido.'},{status:401}); const created=await seedDemo(prisma); return NextResponse.json({ok:true,created});}
