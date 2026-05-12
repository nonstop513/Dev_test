// POST /api/logout
export async function onRequestPost({ request }) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  // Clear the session cookie
  headers.append(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
