import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "webhook_test",
    timestamp: new Date().toISOString(),
    message: "Instagram Webhook is accessible",
    method: "GET",
    url: "/api/meta/webhook",
    environment: {
      META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? 'SET' : 'MISSING',
      META_APP_SECRET: process.env.META_APP_SECRET ? 'SET' : 'MISSING',
      INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN ? 'SET' : 'MISSING'
    }
  });
}

export async function POST() {
  return NextResponse.json({
    status: "webhook_test",
    timestamp: new Date().toISOString(),
    message: "Instagram Webhook POST received successfully",
    method: "POST"
  });
}
