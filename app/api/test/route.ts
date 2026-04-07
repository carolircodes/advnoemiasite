import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("TEST API ROUTE WORKING");
  
  return new Response("API ROUTE TEST WORKING", {
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

export async function POST(request: NextRequest) {
  console.log("TEST API POST WORKING");
  
  return NextResponse.json({
    message: "POST TEST WORKING",
    timestamp: new Date().toISOString()
  });
}
