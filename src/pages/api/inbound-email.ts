import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const expected = (import.meta.env.WEBHOOK_SECRET as string | undefined) ?? '';
  const provided = request.headers.get('x-webhook-secret') ?? '';
  if (expected && provided !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  // Log to Workers logs (visible via `wrangler tail`).
  console.log('inbound email', JSON.stringify(body));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
