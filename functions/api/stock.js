// GET /api/stock?symbol=AAPL
// Proxy Yahoo Finance API to avoid CORS issues

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) {
    return json({ error: 'Missing symbol' }, 400);
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=14d`;
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return json({ error: `Yahoo Finance 回應錯誤: ${res.status}` }, res.status);
    }

    const data = await res.json();

    if (!data.chart?.result?.[0]) {
      return json({ error: '找不到該股票代碼' }, 404);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 快取 5 分鐘
      },
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
