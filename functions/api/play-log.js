// POST /api/play-log
// Body: { game, result, win }
export async function onRequestPost({ request, env }) {
  try {
    const cookie = request.headers.get('Cookie') ?? '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const log = {
      sessionId: match[1],
      game: body.game,
      result: body.result,
      win: body.win,
      timestamp: new Date().toISOString(),
    };

    // TODO: write log to D1 or KV
    console.log('[play-log]', JSON.stringify(log));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
