# 代码规范与质量保证流程

## 🛠️ 质量检测命令与工具链

项目配置了自动化 Lint、类型检查与规则校验工具。在提交代码或完成功能修改前，必须确保质量检查无报错。

### 本地质量检查命令
```bash
npm run lint
```
该命令执行一系列链式检查：
1. `tsgo -p tsconfig.check.json`: 极速 TypeScript 全局类型静态检查。
2. `npx biome lint`: 使用 Biome 格式化与代码质量校验。
3. `.rules/check.sh`: 项目自定义安全与规范检查脚本。
4. `TailwindCSS` 样式语法诊断。
5. `.rules/testBuild.sh`: 预构建构建检测。

---

## 🎨 UI & 样式开发规范

1. **响应式与主题支持**:
   - 保持暗色 (Dark Mode) / 浅色 (Light Mode) 玻璃态设计风格的一致性。
   - 使用 Tailwind 提供的 CSS 变量与主题类，避免硬编码十六进制颜色。
2. **图标与 UI 基础库**:
   - 优先使用 `lucide-react` 图标。
   - 按钮、对话框、下拉列表等优先使用 `@/components/ui/` 下基于 Radix UI 封装的组件。
3. **图像生成标准**:
   - 当需要页面演示图、生成图或占位图时，不得使用本地缺失路径，应使用 `generate_image` 工具生成真实画质演示图。

---

## 📦 规范与 Git Commit/Push 规则

### Git 提交规范
在代码修改或文档更新完成后，必须自动执行如下命令：
```bash
git add .
git commit -m "<type>(<scope>): <简明规范的中文描述>"
git push
```
常见的 Type 类型说明：
- `feat`: 新增功能
- `fix`: 修复 Bug
- `refactor`: 重构代码
- `docs`: 修改文档或技能包
- `style`: 样式调整
