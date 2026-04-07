import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN =
    process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("META WEBHOOK EVENT:", body);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("META WEBHOOK ERROR:", error);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}