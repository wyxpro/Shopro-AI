// 探测 seedance-2.0-mini 的有效 duration 下界（3/4），仅看提交是否被 400 拒绝
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_SEEDANCE_MINI_API_KEY="?([^"\r\n]+)"?/)[1];
const BASE = 'https://tokendance.space';

for (const dur of [3, 4]) {
  const res = await fetch(`${BASE}/gateway/ark/v3/generations/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'seedance-2.0-mini',
      content: [{ type: 'text', text: '下界探测：湖面涟漪特写' }],
      resolution: '720p',
      ratio: '16:9',
      duration: dur,
    }),
  });
  const text = await res.text();
  console.log('duration =', dur, '=>', res.status, text.slice(0, 200));
}
