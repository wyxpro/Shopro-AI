// 查询单个 MiniMax 任务，验证终态响应结构
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8')
  .match(/VITE_MINIMAX_API_KEY="?([^"\r\n]+)"?/)[1];
const taskId = process.argv[2] || 'tsk-gi1rbwmbxarriwwp';

const res = await fetch(`https://tokendance.space/gateway/minimax/v2/query/video_generation/${taskId}`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
console.log('HTTP', res.status);
console.log(JSON.stringify(await res.json(), null, 2));
