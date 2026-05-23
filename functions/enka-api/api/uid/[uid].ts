/**
 * Enka Network API 代理
 *
 * 路由：/enka-api/api/uid/:uid
 * 解决 Cloudflare Pages 部署时浏览器跨域拦截 Enka API 的问题。
 */

export async function onRequest(context: {
  request: Request;
  params: { uid?: string };
}) {
  const { params } = context;
  const uid = params.uid;

  if (!uid) {
    return new Response(JSON.stringify({ error: 'Missing UID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const enkaUrl = `https://enka.network/api/uid/${uid}`;

  try {
    const enkaRes = await fetch(enkaUrl, {
      headers: {
        'Accept-Language': 'zh-CN',
        'User-Agent': 'IdealGenshin/1.0',
      },
    });

    // Enka may return non-200 with an HTML error page
    const contentType = enkaRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          error: `Enka API returned non-JSON response (status ${enkaRes.status})`,
          status: enkaRes.status,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const data = await enkaRes.json();
    return new Response(JSON.stringify(data), {
      status: enkaRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: '无法连接到 Enka Network',
        detail: err?.message || String(err),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
