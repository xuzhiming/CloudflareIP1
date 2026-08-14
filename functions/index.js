// Cloudflare Pages Function - 订阅服务说明页

const SOURCE_MAP = {
  'cdtools': '优选IP (Cdtools)',
  'cfxyz': '测速IP (Cfxyz)',
  'sg': '新加坡IP',
  'jp': '日本IP',
  'us': '美国IP',
  'de': '德国IP',
  'nl': '荷兰IP',
  'me': '运营商IP',
  'all': '全部IP',
  'domain': '域名IP',
  'nodes': '节点IP',
  'vless': 'VLESS节点',
};

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 如果是根路径，返回说明页面
  if (url.pathname === '/' || url.pathname === '/index') {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VLESS 订阅服务</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.8; }
        h1 { color: #6366f1; }
        code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
        .endpoint { background: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .endpoint strong { color: #4f46e5; }
    </style>
</head>
<body>
    <h1>VLESS 订阅服务</h1>
    <p>使用 v2ray/karing 等客户端订阅以下节点：</p>
    <hr>
    ${Object.entries(SOURCE_MAP).map(([id, name]) => `
    <div class="endpoint">
        <strong>/sub/${id}</strong> - ${name}
    </div>
    `).join('')}
    <hr>
    <p>例如: <code>${url.origin}/sub/cdtools</code></p>
    <p>说明: 每个来源只返回速度 ≥4MB/s 的节点，最多10个。</p>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 其他路径返回 404
  return new Response('Not Found', { status: 404 });
}
