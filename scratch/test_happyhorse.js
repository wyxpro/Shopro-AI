// HappyHorse 1.1 (Tokendance Gateway /alibaba/happyhorse) 连通性、响应结构与 size/duration 规格验证
// 密钥从 .env 读取，不硬编码；提交超时不重试以避免重复计费
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_HAPPYHORSE_API_KEY="?([^"\r\n]+)"?/)[1];
const BASE = 'https://tokendance.space';

async function submit(input, parameters) {
  const res = await fetch(`${BASE}/gateway/alibaba/happyhorse/v1/video-synthesis`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({ model: 'happyhorse-1.1-t2v', input, parameters }),
  });
  const text = await res.text();
  console.log('SUBMIT', JSON.stringify({ input: Object.keys(input), parameters }), '=>', res.status, text.slice(0, 260));
  if (!res.ok) return null;
  try {
    const j = JSON.parse(text);
    return j?.output?.task_id || j?.task_id || j?.output?.id;
  } catch { return null; }
}

// 1. 文档示例提交，学习响应结构与轮询状态字段
const taskId = await submit({ prompt: '夜空中的烟花' }, { size: '1280*720', duration: 5 });
if (!taskId) process.exit(1);
console.log('TASK_ID =', taskId);

for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${BASE}/gateway/alibaba/happyhorse/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.output?.task_status;
  console.log(`QUERY[${i}] HTTP`, q.status, 'status =', status, JSON.stringify(qJson)?.slice(0, 300));
  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED' || status === 'UNKNOWN') {
    console.log('FULL TERMINAL RESP =', JSON.stringify(qJson, null, 1)?.slice(0, 900));
    break;
  }
}

// 2. size 规格探测（400 拒绝不计费）
for (const size of ['720*1280', '1920*1080', '720*720', '960*720', '1080*1920', '1440*1080']) {
  await submit({ prompt: '规格探测：湖面涟漪特写' }, { size, duration: 5 });
}

// 3. duration 边界探测
for (const duration of [3, 10, 15]) {
  await submit({ prompt: '时长探测：夜空烟花' }, { size: '1280*720', duration });
}
