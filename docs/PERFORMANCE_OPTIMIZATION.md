# Toonflow Web 性能与架构优化文档

> 文档版本：2026-07-07  
> 适用分支：性能重构后续迭代  
> 技术栈：Vue 3.5 + Vite 5 + TypeScript + Pinia + TDesign

---

## 1. 优化目标

| 维度 | 问题 | 目标 |
|------|------|------|
| **构建耗时** | `yarn build` 曾需 5–30+ 分钟，内存压力大 | 日常 `build:fast` 稳定在 10–25 分钟（视机器与缓存），CI 可并行 type-check |
| **首屏体积** | 入口同步引入 md-editor、@webav、全量 icon-park | 重依赖按路由/功能懒加载，manualChunks 拆分 vendor |
| **运行时** | Production 流程图节点、设置面板、工作台 Tab 同步加载 | `defineAsyncComponent` + Vue Flow `only-render-visible-elements` |
| **工程规范** | axios 分散、孤儿 copy 文件、Electron/Web 构建混用 | API 层收敛、脚本分离、CI 拆分 |

---

## 2. 构建耗时基线

记录在仓库根目录 `build-profile.json`（由 `yarn build:profile` 生成，已加入 `.gitignore`）。

| 场景 | 耗时 | 说明 |
|------|------|------|
| 首次全量构建（冷 `node_modules`） | ~1545 s（≈25.7 min） | Windows，8GB Node 堆，完整依赖安装后 |
| 优化后单次构建 | ~572 s（≈9.5 min） | 同环境，`BUILD_TARGET=web`，Vite 缓存命中 |
| 含 vue-tsc 的 `yarn build` | 在上述基础上 +2–5 min | 取决于机器与类型错误数量 |

> **说明**：构建时间受 CPU、磁盘、PostCSS 扫描范围、`node_modules` 完整性影响极大。若出现大量 `Could not resolve` 或包内仅有 `.d.ts` 无 `.js`，需删除 `node_modules` 后 `yarn install`。

### 2.1 构建命令一览

| 命令 | 类型检查 | 产物模式 | 用途 |
|------|----------|----------|------|
| `yarn dev` | 否 | 开发 HMR | 本地开发 |
| `yarn build:fast` | 否 | lite（无 CSS 压缩） | **日常最快**（~7 min） |
| `yarn build:fast:ultra` | 否 | ultra（无 rem/无压缩） | 本地极速冒烟（~3–5 min） |
| `yarn build:release:fast` | 否 | release-fast（JS 压缩，无 CSS 压缩） | 预发布（~8 min） |
| `yarn build:release` | 否 | release（完整压缩） | 最终产物（~10–12 min） |
| `yarn build:full:fast` | **并行** tsc ∥ release-fast | Web 分包 | **发布前推荐**（~8 min） |
| `yarn build` | **并行** tsc ∥ release | Web 分包 | CI 严格发布（~12 min） |
| `yarn build:electron` | 并行 + Electron 单文件 | 桌面端 |
| `yarn type-check` | `vue-tsc --build`（增量 ~3 min） | — | CI / 本地 |

模式解析：`scripts/build-env.mjs`；并行完整构建：`scripts/build-full.mjs`。Node 堆 vite **8192 MB** / tsc **6144 MB**。

---

## 3. 构建侧优化（Vite / Rollup）

### 3.1 PostCSS `px-to-viewport` 收窄

**文件**：`vite.config.ts`

仅对需要 rem 适配的路径执行 px 转换，避免全量扫描 `src/**`：

- `src/pages/**`
- `src/views/production/**`
- `src/assets/main.scss`

`node_modules` 始终 `exclude`。

### 3.2 `manualChunks` 分包策略

**文件**：`vite.config.ts` → `build.rollupOptions.output.manualChunks`

| Chunk 名 | 包含依赖 | 典型体积（gzip 前） |
|----------|----------|---------------------|
| `monaco` | monaco-editor | ~4.2 MB |
| `markdown` | md-editor-v3, codemirror | ~1.8 MB |
| `tdesign` | tdesign-vue-next | ~3.9 MB |
| `tdesign-chat` | @tdesign-vue-next/chat | 中等 |
| `vueflow` | @vue-flow/* | 中等 |
| `webav` | @webav/* | ~235 KB |
| `clip-track` | vue-clip-track | ~280 KB |
| `socketio` | socket.io-client | 小 |
| `mammoth` | mammoth（动态 import） | 小 |
| `dayjs` | dayjs | 小 |
| `i18n` | vue-i18n | 小 |
| `icons` | @icon-park/vue-next | ~78 KB |
| `vue-vendor` | vue, pinia, vue-router | 核心框架 |

其他构建选项：

- `target: es2020` — 减少转译开销
- `reportCompressedSize: false` — 跳过分包 gzip 统计以缩短构建
- `cssCodeSplit: true` — CSS 随路由拆分
- `esbuild.legalComments: 'none'` + `drop: ['debugger']` — 加快压缩阶段
- `rollupOptions.maxParallelFileOps: 24` — 提高 Rollup 并行文件处理

### 3.2.1 构建期跳过 unplugin dts 生成

`unplugin-auto-import` / `unplugin-vue-components` 在 `command === 'serve'` 时才写 `auto-imports.d.ts` / `components.d.ts`。生产 `vite build` 不再全量扫描写盘，显著缩短 Rollup 前置阶段。

> dts 文件已提交仓库；新增组件后运行 `yarn dev` 或 `yarn type-check` 刷新。

### 3.2.2 TDesign 样式去重

`main.ts` 已引入 `tdesign-vue-next/es/style/index.css`（全量主题 + 组件样式）。Resolver 设置 `importStyle: false`，避免构建期为每个 `t-*` 组件重复解析 CSS 入口。

### 3.2.3 重依赖动态 import（构建图瘦身）

| 依赖 | 策略 |
|------|------|
| `socket.io-client` | `useChat` / `useSocket` 在 `connect()` 时 `import()` |
| `mammoth` | `loadMammoth()` 工具，仅 Word 上传时加载 |
| `lodash` | 已移除（`App.vue` locale 合并改为直接引用） |

### 3.3 依赖预构建（`optimizeDeps`）

**预构建（加快 dev 冷启动）**：`vue`, `vue-router`, `pinia`, `axios`, `tdesign-vue-next`, `@vue-flow/core`

**排除（按需加载）**：`monaco-editor`, `monaco-editor-vue3` — 仅设置页 `vendorConfig` / `devConfig` 使用

### 3.4 包体积分析

```bash
yarn build:analyze
# 构建完成后在浏览器打开 dist/stats.html
```

由 `rollup-plugin-visualizer` 生成，环境变量 `ANALYZE=1` 由 `scripts/analyze-build.mjs` 注入。

### 3.5 TDesign 补丁脚本

`yarn postinstall` 执行：

1. `scripts/fix-tdesign-icons.mjs` — 占位（icons 走 Vite alias）
2. `scripts/fix-tdesign-packages.mjs` — 补齐缺失的 `css.mjs`、locale `.mjs`

**Vite alias**：`tdesign-icons-vue-next/esm` → `lib`；`@icon-park/vue-next/es/icons` → `lib/icons`（规避 es 目录部分图标缺 `.js`）

若跳过 postinstall（`yarn install --ignore-scripts`），需手动：

```bash
node scripts/fix-tdesign-packages.mjs
```

### 3.6 Electron vs Web 构建

| `BUILD_TARGET` | 行为 |
|----------------|------|
| `web`（默认 `build:fast`） | 代码分包、资源外链，构建快、内存友好 |
| 未设置 / `electron` | `vite-plugin-singlefile` 内联为单 HTML，耗时长、内存高 |

---

## 4. 运行时优化

### 4.1 路由级懒加载

**文件**：`src/router/index.ts`

所有业务页面使用 `() => import(...)`。`/test` 路由仅在 `import.meta.env.DEV` 下注册。

### 4.2 Production 流程图

**文件**：`src/views/production/index.vue`

- 流程节点组件：`script`, `scriptPlan`, `assets`, `storyboardTable`, `storyboard`, `workbench` — 全部 `defineAsyncComponent`
- `rightChatBox` 异步加载
- Vue Flow：`only-render-visible-elements: true`
- 拖拽/平移期间 `is-interacting` 降载（`interactionTimer` 150ms 防抖）

### 4.3 工作台全屏对话框

**文件**：`src/views/production/components/workbench/index.vue`

| Tab | 加载方式 |
|-----|----------|
| preview | 同步（默认 Tab） |
| generate | `defineAsyncComponent` |
| editVideo | `defineAsyncComponent`（含 @webav、vue-clip-track） |

### 4.4 设置面板

**文件**：`src/components/setting/index.vue`

14 个子面板全部为 `defineAsyncComponent`，含 Monaco（`vendorConfig`、`devConfig`）与 md-editor 相关面板。

**文件**：`src/pages/workbench/index.vue` — `setting` 组件仅在 `showSetting` 时挂载。

### 4.5 Icon Park 按需注册

**之前**：`main.ts` 全量 `@icon-park/vue-next/es/all`（构建与首屏极重）

**现在**：`src/utils/registerIconPark.ts` 按图标路径单独 import（约 90 个常用图标），`main.ts` 调用 `registerIconPark(app)`。

> 模板中的 `<i-xxx>` 为 **Icon Park**（`theme="outline"` 等），非 TDesign Icons。

### 4.6 md-editor 懒加载

**之前**：`App.vue` 同步 `import "md-editor-v3/lib/style.css"` 与 `config()`

**现在**：

- `src/utils/mdEditorSetup.ts` — 单例 `setupMdEditor()`，动态 import CSS + config
- `App.vue` 在 `getPort()` 完成、`loading=false` 后异步调用（不阻塞首屏骨架）

Markdown 编辑组件仍分布在各业务页；样式与全局 link 行为在首次初始化时加载，进入 **markdown** chunk。

### 4.7 @webav 懒加载

**之前**：`main.ts` 同步 `Log.setLogLevel(Log.warn)`

**现在**：

- `src/utils/webavSetup.ts` — `setupWebavLog()` 动态 import `@webav/av-cliper`
- `editVideo/index.vue` 入口调用 — 仅打开视频编辑 Tab 时加载 **webav** chunk

### 4.8 国际化懒加载

**文件**：`src/locales/index.ts`

- 默认语言同步加载，其他语言 `import()` 动态加载
- `switchLocale()` 供设置页与浏览器语言探测使用
- `App.vue` 使用 `tdesign-vue-next/lib/locale/*`（规避 es 路径缺 `.mjs`）

### 4.9 CSS 按需

| 资源 | 位置 |
|------|------|
| TDesign 全量样式 | `main.ts`（暂保留，保证全局组件样式完整） |
| md-editor 样式 | `mdEditorSetup.ts` 动态加载 |
| splitpanes | `editVideo/index.vue`、`scriptAgent/index.vue` |
| Vue Flow 样式 | `production/index.vue`（随路由） |

### 4.10 开发服务器预热

`vite.config.ts` → `server.warmup.clientFiles`：`main.ts`, `App.vue`, `router/index.ts`

---

## 5. 工程与 API 层

### 5.1 API 收敛

**目录**：`src/api/`

| 模块 | 职责 |
|------|------|
| `client.ts` | axios 实例与拦截器 |
| `project.ts` | 项目相关 |
| `production.ts` | 制作流程 |
| `script.ts` | 剧本 |
| `video.ts` | 视频 |
| `agents.ts` | Agent |
| `index.ts` | 统一导出 |

已迁移调用方：核心 stores（`index`, `productionAgent`, `scriptAgent`, `video`, `imageListCache`）、`views/project/index.vue`。其余页面可逐步替换直接 `axios.post`。

### 5.2 死代码清理

已删除：6 个 `* copy*` 文件、`taskList/index.vue`、重复 `vite.config.js` / `vite.config.d.ts`。

### 5.3 类型修复（generate 工作台）

**文件**：`src/views/production/components/workbench/generate/index.vue`

- `UploadItem` 与 `RefMediaInput` 通过显式 cast 对齐 `sortMediasForRef` / `updateTrackMedias`
- `storyboardList` 赋值加 `as StoryboardItem[]`
- `generateVideo` 的 `scriptId` 使用 `episodesId.value ?? 0`

`yarn type-check` 应能通过（CI job `type-check` 与之相同）。

---

## 6. CI 流水线

**文件**：`.github/workflows/ci.yml`

```text
并行 Job:
├── type-check  → yarn type-check
└── build       → fix-tdesign-scripts + yarn build:profile → 上传 build-profile.json
```

类型检查与构建分离，避免单次 Job 超时；构建不跑 vue-tsc 以控制时长。

---

## 7. 目录与关键文件索引

```text
scripts/
├── vite-build.mjs          # 统一构建入口（8GB heap）
├── build-profile.mjs       # 耗时报告
├── analyze-build.mjs       # ANALYZE=1 + visualizer
├── fix-tdesign-packages.mjs
└── fix-tdesign-icons.mjs

src/
├── main.ts                 # 精简入口（无 webav / 无 md-editor 同步依赖）
├── App.vue                 # 异步 setupMdEditor
├── utils/
│   ├── mdEditorSetup.ts
│   ├── webavSetup.ts
│   ├── registerIconPark.ts
│   └── refSlotUtils.ts
├── api/                    # HTTP 收敛层
└── locales/index.ts        # i18n 懒加载

vite.config.ts              # PostCSS / manualChunks / optimizeDeps / visualizer
build-profile.json          # 本地耗时（gitignore）
dist/stats.html             # 包分析（gitignore，analyze 构建生成）
```

---

## 8. 常见问题（Troubleshooting）

### 8.1 构建极慢或 OOM

1. 确认使用 `yarn build:fast` 而非默认 Electron 单文件模式  
2. 确认 `BUILD_TARGET=web`（`vite-build.mjs` 已默认）  
3. 关闭其他占内存应用；Node 堆已设为 8GB  
4. 二次构建应明显快于首次（Vite 缓存）

### 8.2 `tdesign-icons` / `css.mjs` 解析失败

```bash
node scripts/fix-tdesign-packages.mjs
```

并确认 `vite.config.ts` 中 `tdesign-icons-vue-next/esm` → `lib` alias 存在。

### 8.3 `node_modules` 损坏（Windows）

症状：包目录仅有 `.d.ts`、大量 `Could not resolve`。

```bash
# PowerShell
Remove-Item -Recurse -Force node_modules
yarn install
# 若 postinstall 失败：
node scripts/fix-tdesign-packages.mjs
```

### 8.4 图标不显示

检查 `registerIconPark.ts` 是否包含该图标；新增图标需添加对应 `import` 与 `app.component` 注册。

### 8.5 md-editor 链接点击无效

确认 `setupMdEditor` 已执行（`App.vue` → `getPort` 末尾）；`window.handleLinkClick` 由 `mdEditorSetup` 挂载。

---

## 9. 后续可优化项（未实施 / 部分实施）

| 项 | 预期收益 | 风险 |
|----|----------|------|
| TDesign 全量 CSS → 按需样式 | 首屏 CSS 显著减小 | 需全站回归，易漏样式 |
| md-editor 包装为 `AsyncMdEditor.vue` | 各页进一步懒加载编辑器本体 | 改动文件多 |
| 剩余 axios 调用迁入 `src/api/` | 可维护性 | 低 |
| Production API 响应 TypeScript 类型 | type-check 更严 | 需后端契约 |
| `lodash/merge` → 轻量替代 | 略减 lodash chunk | 低 |
| 二次构建 CI 缓存 `node_modules/.vite` | CI 构建加速 | 需 actions cache 配置 |

---

## 10. 变更记录摘要

| 日期 | 内容 |
|------|------|
| 2026-07 | 初版性能重构：PostCSS 收窄、manualChunks、懒加载、API 层、CI 拆分 |
| 2026-07-07 | 续优化：md-editor / @webav 懒加载、visualizer、lodash/dayjs/i18n 分包、generate 类型修复、本文档 |
| 2026-07-08 | 深度构建优化：build 跳过 dts、TDesign importStyle:false、socket/mammoth 动态 import、移除 lodash、icon-park 走 lib 路径、esbuild/rollup 并行调优 |
| 2026-07-08 | build 并行 tsc∥vite；统一 build-env.mjs；新增 release-fast / build:full:fast；type-check 改回 --build |

---

## 11. 验证清单

发布或合并前建议：

- [ ] `yarn type-check` 通过  
- [ ] `yarn build:fast` 成功，`dist/` 产物正常  
- [ ] 登录 → 项目列表 → 制作流程 → 工作台三 Tab 功能正常  
- [ ] 设置页各子面板（尤其 vendorConfig Monaco、skillManagement md-editor）  
- [ ] 图标（Icon Park）在主要页面显示正常  
- [ ] 可选：`yarn build:analyze` 检查无异常巨型业务 chunk  

---

如有问题请在 Issue 中附上 `build-profile.json`、`dist/stats.html`（analyze 构建）及 Node / OS 版本。
