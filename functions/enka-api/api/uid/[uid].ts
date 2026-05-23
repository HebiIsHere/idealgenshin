/**
 * Enka Network API 代理
 *
 * 路由：/enka-api/api/uid/:uid
 * 解决 EdgeOne Pages 部署时浏览器跨域拦截 Enka API 的问题。
 * 前端调用同源地址，此函数代为请求 enka.network 并返回结果。
 */

export async function onRequest(context: {
  request: Request;
  params: { uid?: string };
}) {
  const { request, params } = context;
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
      headers: { 'Accept-Language': 'zh-CN' },
    });

    const data = await enkaRes.json();

    return new Response(JSON.stringify(data), {
      status: enkaRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: '无法连接到 Enka Network' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
