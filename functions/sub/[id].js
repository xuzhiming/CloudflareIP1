// Cloudflare Pages Function - 订阅接口
// 访问路径: /sub/xxx (xxx 为 IP 来源标识)

const UUID = '8e8911a9-602d-4715-b0a9-abe7f894104f';
const PROXY_IP = 'proxyip.cmliussss.net';
const RAW_BASE = 'https://raw.githubusercontent.com/xuzhiming/CloudflareIP1/refs/heads/main';

// IP 来源映射
const SOURCE_MAP = {
  'cdtools': { url: RAW_BASE + '/Cdtools.txt', name: '优选IP' },
  'cfxyz':   { url: RAW_BASE + '/Cfxyz.txt',   name: '测速IP' },
  'sg':      { url: RAW_BASE + '/SG.txt',       name: '新加坡IP' },
  'jp':      { url: RAW_BASE + '/JP.txt',       name: '日本IP' },
  'us':      { url: RAW_BASE + '/US.txt',       name: '美国IP' },
  'de':      { url: RAW_BASE + '/DE.txt',       name: '德国IP' },
  'nl':      { url: RAW_BASE + '/NL.txt',       name: '荷兰IP' },
  'me':      { url: RAW_BASE + '/Me.txt',       name: '运营商IP' },
  'all':     { url: RAW_BASE + '/All.txt',      name: '全部IP' },
  'domain':  { url: RAW_BASE + '/Domain.txt',    name: '域名IP' },
  'nodes':   { url: RAW_BASE + '/Nodes.txt',     name: '节点IP' },
  'vless':   { url: RAW_BASE + '/Vless.txt',     name: 'VLESS节点' },
};

// 解析速度 (MB/s)
function parseSpeed(remark) {
  if (!remark) return 0;
  // 支持 "16.00 MB/s" 和 "76.94MB/s" 两种格式
  const match = remark.match(/([\d.]+)\s*(MB\/s|MB|mbps|Mbps|GB\/s|GB|KB\/s|KB|Kbit\/s|Gbps)/i);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith('GB')) val *= 1000;
  else if (unit.startsWith('KB')) val /= 1000;
  else if (unit.includes('MBIT') || unit === 'MBPS' || unit === 'GBPS') val /= 8;
  return val;
}

// 生成单个 VLESS 链接
function buildVless(ip, name, domain) {
  return `vless://${UUID}@${ip}:443?encryption=none&security=tls&sni=${domain}&fp=random&insecure=0&allowInsecure=0&type=ws&host=${domain}&path=pyip%3D${PROXY_IP}#${name}`;
}

// 解析 IP 列表并过滤
async function fetchAndProcess(source) {
  const info = SOURCE_MAP[source];
  if (!info) {
    return { error: `Unknown source: ${source}`, available: Object.keys(SOURCE_MAP) };
  }

  const response = await fetch(info.url);
  if (!response.ok) {
    return { error: `Failed to fetch ${info.url}: ${response.status}`, available: Object.keys(SOURCE_MAP) };
  }

  const text = await response.text();
  const lines = text.split('\n').filter(l => l.trim());
  const ipRe = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const domain = new URL(info.url).hostname; // 获取当前 worker 域名

  const results = [];
  for (const line of lines) {
    const parts = line.trim().split('#');
    const ip = parts[0];
    const remark = parts[1] || '';

    if (!ipRe.test(ip)) continue;

    const speed = parseSpeed(remark);
    // 只保留速度 >= 4MB/s 的节点
    if (speed >= 4) {
      const name = remark || ip;
      results.push({
        vless: buildVless(ip, name, '2026.vyou.ccwu.cc'),
        speed: speed
      });
    }
  }

  // 按速度降序排列，最多返回10个
  results.sort((a, b) => b.speed - a.speed);
  const top10 = results.slice(0, 10);

  return {
    name: info.name,
    count: top10.length,
    lines: top10.map(r => r.vless)
  };
}

export async function onRequest(context) {
  const { params, request } = context;
  const sourceId = params.id;
  const url = new URL(request.url);
  const userDomain = url.hostname; // 用户访问时的域名

  // 处理 favicon.ico 请求
  if (sourceId === 'favicon.ico') {
    return new Response(null, { status: 204 });
  }

  const result = await fetchAndProcess(sourceId);

  if (result.error) {
    // 返回可用来源列表
    const availableList = result.available.map(id => `  /sub/${id} - ${SOURCE_MAP[id]?.name || id}`).join('\n');
    return new Response(
      `Error: ${result.error}\n\nAvailable subscription endpoints:\n${availableList}`,
      { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 返回订阅内容
  const content = result.lines.join('\n');

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, max-age=0',
      'Subscription-Userinfo': `upload=0; download=0; total=${result.count}; endpoint=${userDomain}`,
    }
  });
}
