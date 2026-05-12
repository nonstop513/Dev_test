// POST /api/login
// Body: { username, password }

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return json({ error: 'Missing fields' }, 400);
    }

    // 查詢 D1 使用者資料表
    const user = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) return json({ error: 'Invalid credentials' }, 401);

    const hash = await hashPassword(password);
    if (hash !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);

    // 建立 session，有效期 24 小時
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 86400 * 1000;
    await env.DB.prepare(
      'INSERT INTO sessions (session_id, username, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, username, expiresAt).run();

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie',
      `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );
    return new Response(JSON.stringify({ ok: true, username }), { status: 200, headers });

  } catch (e) {
    return json({ error: 'Bad request', detail: e?.message ?? String(e) }, 400);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
