export async function GET() {
  return new Response("API OK", {
    status: 200,
    headers: { 
      "Content-Type": "text/plain" 
    },
  });
}
