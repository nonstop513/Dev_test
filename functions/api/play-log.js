// POST /api/play-log
// Body: { game, result, win }
export async function onRequestPost({ request, env }) {
  try {
    const sessionId = getCookie(request, 'session');
    if (!sessionId) return json({ error: 'Unauthenticated' }, 401);

    const session = await env.DB.prepare(
      'SELECT username FROM sessions WHERE session_id = ? AND expires_at > ?'
    ).bind(sessionId, Date.now()).first();

    if (!session) return json({ error: 'Session expired' }, 401);

    const { game, result, win } = await request.json();

    // TODO: 之後可新增 play_logs 資料表取代 console.log
    console.log('[play-log]', JSON.stringify({
      username: session.username,
      game, result, win,
      timestamp: new Date().toISOString(),
    }));

    return json({ ok: true });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
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
