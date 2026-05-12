// POST /api/login
// Body: { username, password }
export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    // TODO: replace with real credential check against KV / D1
    const valid = username === 'admin' && password === 'demo1234';
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Simple signed session cookie (replace with JWT or KV session in production)
    const sessionId = crypto.randomUUID();
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append(
      'Set-Cookie',
      `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );

    // TODO: persist sessionId → username in KV
    return new Response(JSON.stringify({ ok: true, username }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
