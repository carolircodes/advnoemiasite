import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "webhook_test",
    timestamp: new Date().toISOString(),
    message: "WhatsApp Webhook is accessible",
    method: "GET",
    url: "/api/whatsapp/webhook",
    environment: {
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'MISSING',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? 'SET' : 'MISSING',
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'MISSING',
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'SET' : 'MISSING'
    }
  });
}

export async function POST() {
  return NextResponse.json({
    status: "webhook_test",
    timestamp: new Date().toISOString(),
    message: "WhatsApp Webhook POST received successfully",
    method: "POST"
  });
}
