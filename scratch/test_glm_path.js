// 临时验证脚本：确认 GLM-5.3-Flash (Sophnet) 正确的接口路径
const KEY = "jWWpyPDgQUM6Z9NEAoUGT0o41PM8dE3KqOMa8IKKyo3FZmfZHD9mvMB3Wd_cy58rOigYO6m3IwdFpMd-DAt_mg";

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
  // 当前 vite 代理 rewrite 后的错误路径
  await probe("https://www.sophnet.com/v1/chat/completions", false);
  // .env GLM_BASE_URL 指向的正确路径
  await probe("https://www.sophnet.com/api/open-apis/v1/chat/completions", false);
})();
