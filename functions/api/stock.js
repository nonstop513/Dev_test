// GET /api/stock?symbol=AAPL&range=1mo
// GET /api/stock?symbol=AAPL&period1=1700000000&period2=1710000000
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) return json({ error: 'Missing symbol' }, 400);

  try {
    let yahooUrl;

    const period1 = url.searchParams.get('period1');
    const period2 = url.searchParams.get('period2');

    if (period1 && period2) {
      // 自訂日期區間
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
    } else {
      // 預設區間（10d / 1mo / 3mo / 6mo / 1y）
      const range = url.searchParams.get('range') ?? '14d';
      // 10d 不是 Yahoo 的標準參數，轉換成 period1/period2
      if (range === '10d') {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 10 * 86400;
        yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${start}&period2=${end}`;
      } else {
        yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
      }
    }

    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return json({ error: `Yahoo Finance 回應錯誤: ${res.status}` }, res.status);

    const data = await res.json();
    if (!data.chart?.result?.[0]) return json({ error: '找不到該股票代碼' }, 404);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
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
