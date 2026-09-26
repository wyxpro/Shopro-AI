// 验证 Vite dev 代理转发 Seedance 2.0 Mini /ark/v3 协议是否生效
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_SEEDANCE_MINI_API_KEY="?([^"\r\n]+)"?/)[1];
const PROXY = process.argv[2] || 'http://localhost:5175/tokendance-api';

const submit = await fetch(`${PROXY}/gateway/ark/v3/generations/tasks`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'seedance-2.0-mini',
    content: [{ type: 'text', text: '代理链路验证：夜空中的烟花倒映在湖面' }],
    resolution: '720p',
    ratio: '16:9',
    duration: 5,
  }),
});
const sJson = await submit.json().catch(() => null);
console.log('PROXY SUBMIT HTTP', submit.status, JSON.stringify(sJson));
const taskId = sJson?.id;
if (!taskId) process.exit(1);

for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${PROXY}/gateway/ark/v3/generations/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.status;
  console.log(`PROXY QUERY[${i}] HTTP`, q.status, 'status =', status);
  if (status === 'succeeded') { console.log('VIDEO URL =', qJson?.content?.video_url?.slice(0, 120), '...'); break; }
  if (status === 'failed' || status === 'cancelled' || status === 'expired') { console.log('TERMINAL =', JSON.stringify(qJson)); break; }
}
