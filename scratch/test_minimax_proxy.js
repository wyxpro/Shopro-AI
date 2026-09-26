// 验证 Vite dev 代理 /tokendance-api -> https://tokendance.space 转发 MiniMax V2 协议是否生效
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_MINIMAX_API_KEY="?([^"\r\n]+)"?/)[1];

const PROXY = process.argv[2] || 'http://localhost:5175/tokendance-api';

const submitRes = await fetch(`${PROXY}/gateway/minimax/v2/video_generation`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'minimax-h3-max',
    resolution: '768P',
    duration: 6,
    ratio: '16:9',
    content: [{ type: 'text', text: '代理链路验证：咖啡馆暖色调镜头' }],
  }),
});
const submitJson = await submitRes.json().catch(() => null);
console.log('PROXY SUBMIT HTTP', submitRes.status, JSON.stringify(submitJson));
const taskId = submitJson?.task_id;
if (!taskId) process.exit(1);

for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${PROXY}/gateway/minimax/v2/query/video_generation/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.task?.status;
  console.log(`PROXY QUERY[${i}] HTTP`, q.status, 'status =', status);
  if (status === 'succeeded') { console.log('VIDEO URL =', qJson.task.content?.url?.slice(0, 120), '...'); break; }
  if (status === 'failed' || status === 'cancelled' || status === 'expired') { console.log('TERMINAL RESP =', JSON.stringify(qJson)); break; }
}
