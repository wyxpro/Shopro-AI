# 将 Shopro AI 仓库提交到 Gitee 教程

> 当前仓库状态：本地仓库已初始化并完成首次提交，分支为 `master`。
> 包含文件：`PRD.md`、`gitee.md`。

---

## 第一步：在 Gitee 创建远程仓库

1. 打开 [https://gitee.com](https://gitee.com)，注册 / 登录账号（首次使用需完成实名认证，否则无法创建仓库）。
2. 点击右上角 **「+」→「新建仓库」**。
3. 填写仓库信息：
   - **仓库名称**：`Shopro-AI`（建议与 GitHub 保持一致）
   - **是否开源**：按需选择（开源仓库可被搜索到）
   - **初始化仓库**：**务必选择「不初始化」**（不要勾选自动生成 README / .gitignore / LICENSE），否则本地推送时会因历史不一致而冲突。
4. 点击「创建」，创建成功后记下仓库地址，例如：

```
https://gitee.com/你的用户名/Shopro-AI.git
```

---

## 第二步：整理并提交本地未完成的改动

当前工作区存在未提交的改动（如 `docs/简历.md`、`完善.md`），建议先提交，或按需从暂存区排除：

```powershell
# 查看当前改动
git status

# ⚠️ 推送前安全检查：确认 .env 等敏感文件未被跟踪
git check-ignore .env          # 有输出说明已被 .gitignore 忽略，安全

# 提交改动（.env 已被忽略，不会进入版本库）
git add .
git commit -m "chore: 提交本地文档与改动"
```

> 注意：`.gitignore` 已忽略 `node_modules`、`.env`、`dist` 等标准文件，无需手动排除。
> 但请确认 `supabase/config.toml`、`scratch/` 下脚本中没有硬编码的密钥/密码，如有请先清理再提交。

---

## 第三步：绑定 Gitee 远程仓库

在项目根目录（`e:\Code\AI\Start\Web\Shopro AI`）执行：

```powershell
# 新增名为 gitee 的远程，保留原 origin（GitHub）不动
git remote add gitee https://gitee.com/你的用户名/Shopro-AI.git

# 确认远程配置
git remote -v
```

预期输出：

```
gitee   https://gitee.com/你的用户名/Shopro-AI.git (fetch)
gitee   https://gitee.com/你的用户名/Shopro-AI.git (push)
origin  https://github.com/wyxpro/Shopro-AI.git (fetch)
origin  https://github.com/wyxpro/Shopro-AI.git (push)
```

---

## 第四步：推送到 Gitee

```powershell
# 推送 master 分支并建立跟踪关系
git push -u gitee master
```

- 首次推送会弹出 Gitee 登录验证，输入 **Gitee 用户名 + 密码**（HTTPS 方式）。
- 如果仓库有较大文件（如 `public/Video/*.mp4`），免费版单文件限制 100MB，超限会推送失败，可考虑 [Gitee LFS](https://gitee.com/help/articles/4276) 或从历史中移除大文件。

推送成功后，刷新 Gitee 仓库页面即可看到全部代码和历史提交。

---

## 第五步（可选）：日常双平台同步

之后每次开发，可一条命令同时推送到 GitHub 和 Gitee：

```powershell
# 方式一：分别推送
git push origin master
git push gitee master

# 方式二：配置 origin 一次性推送到两个平台
git remote set-url --add --push origin https://github.com/wyxpro/Shopro-AI.git
git remote set-url --add --push origin https://gitee.com/你的用户名/Shopro-AI.git
# 之后只需：git push origin master 即可同时推送两边
```

---

## 常见问题排查

| 问题 | 原因与解决方法 |
| --- | --- |
| `fatal: remote gitee already exists` | 远程已添加过，直接用 `git remote -v` 查看，或 `git remote set-url gitee 新地址` 修改 |
| `rejected (fetch first)` 非快进拒绝 | Gitee 仓库初始化时勾选了自动生成 README。执行 `git pull gitee master --rebase --allow-unrelated-histories` 合并后再推送 |
| 一直提示输入用户名密码 | 在 URL 中直接嵌入用户名：`https://你的用户名@gitee.com/你的用户名/Shopro-AI.git`，凭据会由 Git 管理器保存 |
| 推送大文件失败 `remote: large file...exceeded` | 仓库含超过 100MB 的文件，需删除或用 Git LFS |
| 想改用 SSH 推送 | 在 Gitee「设置 → SSH 公钥」添加本机的 `~/.ssh/id_rsa.pub`，然后把远程换成 `git@gitee.com:你的用户名/Shopro-AI.git` |
| 误把敏感文件推送上去了 | 立即在 Gitee 删除仓库或用 `git filter-repo` 清理历史，并**马上轮换（rotate）所有泄露的密钥**，仅删除最新提交是无效的 |

---

## 附：完整命令速查

```powershell
git status                                  # 1. 查看改动
git check-ignore .env                       # 2. 确认敏感文件已忽略
git add . ; git commit -m "chore: 本地改动"  # 3. 提交
git remote add gitee https://gitee.com/你的用户名/Shopro-AI.git  # 4. 绑定远程
git push -u gitee master                    # 5. 推送
```
