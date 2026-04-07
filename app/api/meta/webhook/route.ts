// ⚠️  WEBHOOK DESATIVADO - NÃO USAR ESTE ARQUIVO ⚠️
// 
// Este webhook foi DESATIVADO e substituído pela versão oficial em:
// apps/portal-backend/app/api/meta/webhook/route.ts
//
// Motivo:
// - Deploy Vercel usa rootDirectory = apps/portal-backend
// - Este arquivo nunca vai para produção
// - Causa confusão e duplicidade de código
//
// Webhook oficial ativo:
// https://advnoemia.com.br/api/meta/webhook
//
// NÃO ALTERE ESTE ARQUIVO - USE apps/portal-backend/app/api/meta/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return new Response("WEBHOOK DESATIVADO - Usar apps/portal-backend/app/api/meta/webhook/route.ts", { 
    status: 410 
  });
}

export async function POST() {
  return new Response("WEBHOOK DESATIVADO - Usar apps/portal-backend/app/api/meta/webhook/route.ts", { 
    status: 410 
  });
}
