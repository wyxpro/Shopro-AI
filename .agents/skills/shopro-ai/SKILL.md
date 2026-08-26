---
name: shopro-ai
description: Comprehensive development, refactoring, and AI workflow integration skill for the Shopro AI platform (React 18 seller workstation, Vue 3 admin dashboard, Supabase edge functions, AI video pipeline, credit auditing, and MSW mock engine). Always trigger this skill whenever a user requests adding features, creating components, integrating AI APIs (DeepSeek, CosyVoice, Seedance), debugging credit logs, modifying Vue/React codebases, running project lint checks (tsgo/biome/check.sh), or maintaining documentation in Shopro AI.
---

# Shopro AI 项目专属开发与维护技能包

本 Skill 为 **Shopro AI（抖音/TikTok电商AIGC带货视频创作平台）** 项目的通用开发、重构、AI 工作流集成及自动化构建维护指南。

---

## 🚀 核心工作流与规范指引

当处理 Shopro AI 项目的相关需求时，遵循以下阶段与原则：

### 1. 架构理解与模块定位
Shopro AI 为双端解耦架构：
- 🛒 **商家创作端 (`src/`)**: 基于 React 18 + Vite + Tailwind CSS + Radix UI + Supabase。包含 AI 脚本生成、数字人克隆、分镜编辑、视频合成等。
- 🏢 **厂商运营后台 (`Shopro-backend/Shopro-backend-main/`)**: 基于 Vue 3 + Element Plus + Pinia + MSW / Spring Boot。负责多租户运营、算力调账、AI 风控、Attempt 追踪与一键退款审计。

👉 详细双端架构与目录规范，请阅读 [architecture.md](file:///e:/Code/AI/Start/Web/Shopro%20AI/.agents/skills/shopro-ai/references/architecture.md)。

---

### 2. AI 工作流与算力扣除规范
- **AI 模型编排**: 所有多模态 AI (DeepSeek-V4-Flash 文案/CoT打标, CosyVoice2 语音合成, Seedance 2.0 短视频生成) 统一由 Supabase Edge Functions (`supabase/functions/`) 代理。
- **积分扣除 (`useCredits`)**: 任何涉及算力消耗的操作必须在客户端触发前使用 `@/hooks/useCredits` 校验余额并扣除积分，失败需写入 Attempt 错误日志。

👉 详细 AI 模型接口契约与积分审计规范，请阅读 [ai-workflows.md](file:///e:/Code/AI/Start/Web/Shopro%20AI/.agents/skills/shopro-ai/references/ai-workflows.md)。

---

### 3. 代码质量与自动化 Git 同步
- **代码质量检查**: 修改代码后，必须在终端运行 `npm run lint` 验证 `tsgo` 类型、`Biome` 代码规范以及 `.rules/check.sh` 预构建检查。
- **Git 自动提交同步**: 按照项目定义规则，代码或文档变更完成后必须自动执行：
  ```bash
  git add .
  git commit -m "<type>(<scope>): <简明规范的中文描述>"
  git push
  ```

👉 详细质量检查工具与代码格式规范，请阅读 [coding-standards.md](file:///e:/Code/AI/Start/Web/Shopro%20AI/.agents/skills/shopro-ai/references/coding-standards.md)。
