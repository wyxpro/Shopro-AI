// 临时验证脚本：确认 GLM-5.3-Flash (Sophnet) 正确的接口路径
const KEY = process.env.GLM_TEST_KEY || "";

async function probe(url, stream) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "glm-5.3-flash",
        messages: [{ role: "user", content: "用一句中文回答：1+1等于几？" }],
        temperature: 0.7,
        max_tokens: 4096,
        stream,
      }),
    });
    const text = await res.text();
    console.log(`\n=== ${url} (stream=${stream}) => HTTP ${res.status} ===`);
    console.log(text.slice(0, 600));
  } catch (e) {
    console.log(`\n=== ${url} (stream=${stream}) => ERROR ===`, e.message);
  }
}

(async () => {
  // 验证流式 SSE（前端 GLM 直连主通道使用 stream: true）
  const res = await fetch("https://www.sophnet.com/api/open-apis/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "glm-5.3-flash",
      messages: [{ role: "user", content: "用一句中文描述一个电商视频画面" }],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });
  console.log(`stream=true => HTTP ${res.status}, content-type: ${res.headers.get("content-type")}`);
  const text = await res.text();
  const lines = text.split("\n").filter(l => l.startsWith("data:"));
  console.log("SSE chunks:", lines.length, "| first:", lines[0]?.slice(0, 200), "| last:", lines[lines.length - 1]?.slice(0, 200));
  // 统计含正文 content 的 chunk 数（验证前端解析逻辑可用）
  let contentChunks = 0;
  for (const l of lines) {
    try { const j = JSON.parse(l.slice(5)); if (j.choices?.[0]?.delta?.content) contentChunks++; } catch {}
  }
  console.log("content chunks:", contentChunks);
})();
