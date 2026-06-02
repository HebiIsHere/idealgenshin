/**
 * MiniGG API 代理
 *
 * 路由：/minigg-api/api/uid/:uid
 * MiniGenshin (MiniGG) 是 Enka 的镜像服务，覆盖 Bilibili 服务器
 * (世界树，UID 以 5 开头) 的玩家数据，同时作为 Enka 故障时的 fallback。
 *
 * MiniGG API 文档：https://genshin.microgg.cn/
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

  const miniggUrl = `https://profile.microgg.cn/api/uid/${uid}`;

  try {
    const miniggRes = await fetch(miniggUrl, {
      headers: {
        'Accept-Language': 'zh-CN',
        'User-Agent': 'IdealGenshin/1.0',
      },
    });

    // MiniGG returns 424 when upstream (Enka/game servers) is unreachable
    if (miniggRes.status === 424) {
      return new Response(
        JSON.stringify({
          error: 'MiniGG 数据服务暂时不可用（上游服务器维护中），请稍后再试',
          status: 424,
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

    // 400: UID not in database (player hasn't visited enka.network yet)
    if (miniggRes.status === 400) {
      return new Response(
        JSON.stringify({
          error: `UID「${uid}」暂未收录，请先到 enka.network/u/${uid} 查看一次角色展柜，再回来导入`,
          status: 400,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const contentType = miniggRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          error: `MiniGG API returned non-JSON response (status ${miniggRes.status})`,
          status: miniggRes.status,
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

    const data = await miniggRes.json();
    return new Response(JSON.stringify(data), {
      status: miniggRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: '无法连接到 MiniGG 数据服务',
        detail: err?.message || String(err),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
