// Wan3.0 Prime (Tokendance Gateway /alibaba/wan3) 连通性与参数规格验证
// 密钥从 .env 读取，不硬编码；注意：文档警告提交超时不要重试，本脚本单次提交
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_WAN3_API_KEY="?([^"\r\n]+)"?/)[1];
const BASE = 'https://tokendance.space';

async function submit(params) {
  const res = await fetch(`${BASE}/gateway/alibaba/wan3/v1/video-synthesis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'wan3.0-video-prime',
      input: { prompt: '一杯拿铁咖啡拉花特写，温暖日光，精致陶瓷杯，慢动作' },
      parameters: params,
    }),
  });
  const text = await res.text();
  console.log('SUBMIT', JSON.stringify(params), '=>', res.status, text.slice(0, 300));
  if (!res.ok) return null;
  try { return JSON.parse(text)?.output?.task_id; } catch { return null; }
}

// 1. 文档示例组合提交
const taskId = await submit({ resolution: '720P', ratio: '16:9', duration: 5, audio: false, watermark: false });
if (!taskId) process.exit(1);

// 2. 轮询直到终态
for (let i = 0; i < 24; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const q = await fetch(`${BASE}/gateway/alibaba/wan3/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const qJson = await q.json().catch(() => null);
  const status = qJson?.output?.task_status;
  console.log(`QUERY[${i}] HTTP`, q.status, 'status =', status, JSON.stringify(qJson)?.slice(0, 260));
  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
    console.log('VIDEO URL =', qJson?.output?.video_url);
    break;
  }
}

// 3. 探测其它规格是否受支持（400 拒绝则不计费）
await submit({ resolution: '1080P', ratio: '16:9', duration: 5, audio: false, watermark: false });
await submit({ resolution: '480P', ratio: '9:16', duration: 10, audio: false, watermark: false });
await submit({ resolution: '720P', ratio: '9:16', duration: 15, audio: false, watermark: false });
await submit({ resolution: '720P', ratio: '1:1', duration: 2, audio: false, watermark: false });
await submit({ resolution: '720P', ratio: '4:3', duration: 8, audio: true, watermark: false });
