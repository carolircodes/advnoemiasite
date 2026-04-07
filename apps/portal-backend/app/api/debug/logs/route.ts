import { NextResponse } from "next/server";

// Storage temporário para logs (em produção, usar Redis ou DB)
const tempLogs: any[] = [];

export async function GET() {
  return NextResponse.json({
    status: "logs",
    timestamp: new Date().toISOString(),
    logs: tempLogs.slice(-50), // Últimos 50 logs
    count: tempLogs.length
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const logEntry = {
      timestamp: new Date().toISOString(),
      body: body.substring(0, 1000),
      headers: Object.fromEntries(request.headers.entries())
    };
    
    tempLogs.push(logEntry);
    
    // Manter apenas últimos 100 logs
    if (tempLogs.length > 100) {
      tempLogs.splice(0, tempLogs.length - 100);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
