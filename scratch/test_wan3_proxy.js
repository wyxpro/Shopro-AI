// 验证 Vite dev 代理转发 Wan3.0 Prime /alibaba/wan3 协议是否生效
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_WAN3_API_KEY="?([^"\r\n]+)"?/)[1];
const PROXY = process.argv[2] || 'http://localhost:5175/tokendance-api';

const submit = await fetch(`${PROXY}/gateway/alibaba/wan3/v1/video-synthesis`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'wan3.0-video-prime',
    input: { prompt: '代理链路验证：纸飞机在明亮蓝天中飞过，电影感运镜' },
    parameters: { resolution: '720P', ratio: '16:9', duration: 5, audio: false, watermark: false },
  }),
});
const sJson = await submit.json().catch(() => null);
console.log('PROXY SUBMIT HTTP', submit.status, JSON.stringify(sJson));
const taskId = sJson?.output?.task_id;
if (!taskId) process.exit(1);

for (let i = 0; i < 24; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${PROXY}/gateway/alibaba/wan3/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.output?.task_status;
  console.log(`PROXY QUERY[${i}] HTTP`, q.status, 'status =', status);
  if (status === 'SUCCEEDED') { console.log('VIDEO URL =', qJson?.output?.video_url?.slice(0, 120), '...'); break; }
  if (status === 'FAILED' || status === 'CANCELED') { console.log('TERMINAL =', JSON.stringify(qJson)); break; }
}
