// Legacy sentinel only.
// The canonical runtime lives in apps/portal-backend.
// Keeping this route fail-closed avoids a false positive if someone points
// the wrong Vercel project at a Next.js root build in the future.

export async function GET() {
  return new Response("LEGACY ROUTE DISABLED - use apps/portal-backend", {
    status: 410,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}

export async function POST() {
  return new Response("LEGACY ROUTE DISABLED - use apps/portal-backend", {
    status: 410,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
