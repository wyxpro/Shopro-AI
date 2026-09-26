// MiniMax H3 Max (Tokendance Gateway) 视频 V2 协议连通性验证
// 密钥从 .env 的 VITE_MINIMAX_API_KEY 读取，不硬编码
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const match = envText.match(/VITE_MINIMAX_API_KEY="?([^"\r\n]+)"?/);
if (!match) {
  console.error('VITE_MINIMAX_API_KEY not found in .env');
  process.exit(1);
}
const apiKey = match[1];
const BASE = 'https://tokendance.space';

async function main() {
  // 1. 提交文生视频任务
  const submitRes = await fetch(`${BASE}/gateway/minimax/v2/video_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimax-h3-max',
      resolution: '768P',
      duration: 6,
      ratio: '16:9',
      content: [{ type: 'text', text: '女人坐在咖啡馆里抬头看向窗外，镜头推进拍到街道，暖色调' }],
    }),
  });
  const submitJson = await submitRes.json().catch(() => null);
  console.log('SUBMIT HTTP', submitRes.status, JSON.stringify(submitJson, null, 2));
  if (!submitRes.ok || !submitJson) process.exit(2);

  const taskId = submitJson.task_id || submitJson.id || submitJson?.data?.task_id;
  if (!taskId) {
    console.error('No task_id found in submit response');
    process.exit(3);
  }
  console.log('TASK_ID =', taskId);

  // 2. 轮询任务状态（最多 5 次演示，验证查询链路通畅即可）
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 6000));
    const qRes = await fetch(`${BASE}/gateway/minimax/v2/query/video_generation/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const qJson = await qRes.json().catch(() => null);
    const status = qJson?.task?.status || qJson?.status;
    console.log(`QUERY[${i}] HTTP`, qRes.status, 'status =', status, JSON.stringify(qJson));
    if (status === 'succeeded' || status === 'failed' || status === 'cancelled' || status === 'expired') {
      console.log('FINAL VIDEO URL =', qJson?.task?.content?.url);
      break;
    }
  }
}

main().catch(e => { console.error('ERROR:', e); process.exit(9); });
