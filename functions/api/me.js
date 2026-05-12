// GET /api/me — returns current logged-in user info
export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: look up sessionId in KV to get real username
  const sessionId = match[1];
  const username = 'admin'; // placeholder until KV is wired up

  return new Response(JSON.stringify({ username, sessionId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
