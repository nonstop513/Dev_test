// POST /api/logout
export async function onRequestPost({ request, env }) {
  const sessionId = getCookie(request, 'session');
  if (sessionId) {
    await env.DB.prepare('DELETE FROM sessions WHERE session_id = ?')
      .bind(sessionId).run();
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie',
    'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}
