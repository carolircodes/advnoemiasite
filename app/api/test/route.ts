export async function GET() {
  return new Response("API OK", { 
    status: 200 
  });
}

export async function POST() {
  return new Response("POST OK", { 
    status: 200 
  });
}
