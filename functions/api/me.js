// GET /api/me
export async function onRequestGet({ request, env }) {
  const sessionId = getCookie(request, 'session');
  if (!sessionId) return json({ error: 'Unauthenticated' }, 401);

  const session = await env.DB.prepare(
    'SELECT username, expires_at FROM sessions WHERE session_id = ?'
  ).bind(sessionId).first();

  if (!session || session.expires_at < Date.now()) {
    return json({ error: 'Session expired' }, 401);
  }

  return json({ username: session.username });
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
