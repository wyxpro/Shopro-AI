// 探测 MiniMax H3 Max 网关接受的 resolution / duration / ratio 组合（只提交不等待完成）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const apiKey = envText.match(/VITE_MINIMAX_API_KEY="?([^"\r\n]+)"?/)[1];
const BASE = 'https://tokendance.space';

const cases = [
  { resolution: '720P', duration: 5, ratio: '16:9' },
  { resolution: '1080P', duration: 6, ratio: '16:9' },
  { resolution: '768P', duration: 10, ratio: '9:16' },
  { resolution: '768P', duration: 15, ratio: '1:1' },
  { resolution: '768P', duration: 3, ratio: '4:3' },
];

for (const c of cases) {
  const res = await fetch(`${BASE}/gateway/minimax/v2/video_generation`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'minimax-h3-max',
      ...c,
      content: [{ type: 'text', text: '参数探测：一杯咖啡的特写镜头' }],
    }),
  });
  const text = await res.text();
  console.log(JSON.stringify(c), '=>', res.status, text.slice(0, 200));
  await new Promise(r => setTimeout(r, 800));
}
