// Seedance 2.0 Mini (Tokendance Gateway /ark/v3) 连通性、响应结构与参数规格验证
// 密钥从 .env 读取，不硬编码
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_SEEDANCE_MINI_API_KEY="?([^"\r\n]+)"?/)[1];
const BASE = 'https://tokendance.space';

async function submit(body) {
  const res = await fetch(`${BASE}/gateway/ark/v3/generations/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'seedance-2.0-mini', ...body }),
  });
  const text = await res.text();
  console.log('SUBMIT', JSON.stringify(body).slice(0, 160), '=>', res.status, text.slice(0, 300));
  if (!res.ok) return null;
  try {
    const j = JSON.parse(text);
    return j?.id || j?.task_id || j?.data?.task_id || j?.data?.id;
  } catch { return null; }
}

// 1. 文档示例：文生视频提交，观察响应结构
const taskId = await submit({
  content: [{ type: 'text', text: '夜空中的烟花倒映在湖面' }],
  resolution: '720p',
  ratio: '16:9',
  duration: 5,
});
if (!taskId) process.exit(1);
console.log('TASK_ID =', taskId);

// 2. 轮询直到终态，观察 status 字段与 video_url 位置
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${BASE}/gateway/ark/v3/generations/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.status || qJson?.data?.status;
  console.log(`QUERY[${i}] HTTP`, q.status, 'status =', status, JSON.stringify(qJson)?.slice(0, 320));
  if (status && !['queued', 'running', 'pending', 'processing', 'PENDING', 'RUNNING'].includes(status)) {
    console.log('FULL TERMINAL RESP =', JSON.stringify(qJson, null, 2)?.slice(0, 800));
    break;
  }
}

// 3. 探测其它规格（400 拒绝则不计费）
await submit({ content: [{ type: 'text', text: '规格探测：一杯咖啡特写' }], resolution: '1080p', ratio: '16:9', duration: 5 });
await submit({ content: [{ type: 'text', text: '规格探测：一杯咖啡特写' }], resolution: '480p', ratio: '9:16', duration: 10 });
await submit({ content: [{ type: 'text', text: '规格探测：一杯咖啡特写' }], resolution: '720p', ratio: 'adaptive', duration: 5 });
await submit({ content: [{ type: 'text', text: '规格探测：一杯咖啡特写' }], resolution: '720p', ratio: '1:1', duration: 2 });
await submit({ content: [{ type: 'text', text: '规格探测：一杯咖啡特写' }], resolution: '720p', ratio: '16:9', duration: 15 });
