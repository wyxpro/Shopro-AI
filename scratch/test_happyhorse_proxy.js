// 验证 Vite dev 代理转发 HappyHorse 1.1 /alibaba/happyhorse (DashScope 异步) 协议是否生效
// 密钥从 .env 读取，不硬编码；提交超时不重试，避免重复计费
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_HAPPYHORSE_API_KEY="?([^"\r\n]+)"?/)[1];
const PROXY = process.argv[2] || 'http://localhost:5175/tokendance-api';

const submit = await fetch(`${PROXY}/gateway/alibaba/happyhorse/v1/video-synthesis`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
  },
  body: JSON.stringify({
    model: 'happyhorse-1.1-t2v',
    input: { prompt: '代理链路验证：夜空中的烟花倒映在湖面' },
    parameters: { size: '1280*720', duration: 5 },
  }),
});
const sJson = await submit.json().catch(() => null);
console.log('PROXY SUBMIT HTTP', submit.status, JSON.stringify(sJson));
const taskId = sJson?.output?.task_id;
if (!taskId) process.exit(1);

for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${PROXY}/gateway/alibaba/happyhorse/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.output?.task_status;
  console.log(`PROXY QUERY[${i}] HTTP`, q.status, 'status =', status);
  if (status === 'SUCCEEDED') { console.log('VIDEO URL =', qJson?.output?.video_url?.slice(0, 120), '...'); break; }
  if (status === 'FAILED' || status === 'CANCELED') { console.log('TERMINAL =', JSON.stringify(qJson)); break; }
}
