# 构建与运行时性能优化

本文档说明 Toonflow-web 的**架构级**构建优化：最短构建链路 + 最小入口图 + 按需懒加载。

## 目标

| 指标 | 优化前 | 优化后（参考） |
|------|--------|----------------|
| `yarn build:fast` | ~24 min | **~7 min** |
| `yarn build`（并行 tsc + vite） | 串行累加 | **≈ max(tsc, vite)** |
| 首屏入口 JS | 单文件 / 巨型 bundle | 多 chunk + 懒加载 |

## 构建命令

| 命令 | 用途 | 说明 |
|------|------|------|
| `yarn build:fast` | 日常开发验证 | lite：跳过 CSS 压缩，最快 |
| `yarn build:fast:ultra` | 极速冒烟 | 不压缩 JS/CSS |
| `yarn build:release:fast` | 预发布 | release-fast：压缩 JS，跳过 CSS 压缩 |
| `yarn build:full:fast` | **推荐预发布** | 并行 `vue-tsc` + release-fast |
| `yarn build` | CI / 正式发布 | 并行 `vue-tsc` + 完整 release |
| `yarn build:electron` | Electron 单文件 | `BUILD_TARGET=electron` |
| `yarn build:profile` | 耗时分析 | 输出 `build-profile.json` |
| `ANALYZE=1 yarn build:profile` | 包体积分析 | 输出 `dist/stats.html` |

## 架构分层

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 构建基础设施 (scripts/ + vite.config.ts)     │
│  - 多模式 lite / ultra / release-fast / release         │
│  - vue-tsc ∥ vite 并行 (build-full.mjs)                 │
│  - manualChunks 拆分重依赖                               │
│  - PostCSS px-to-viewport 仅生产页路由                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: 入口瘦身 (main.ts / App.vue)                   │
│  - 异步 bootstrap，无 webav / md-editor / icon-park-all │
│  - i18n 懒加载单语言                                     │
│  - TDesign 全量 CSS 保留在入口（按需 CSS 待回归）        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: 路由与模块懒加载                               │
│  - production 节点、setting 面板、workbench 子模块       │
│  - defineAsyncComponent + only-render-visible-elements   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: 重依赖动态化                                   │
│  - AsyncMdEditor / AsyncMonacoEditor / AsyncMdPreview    │
│  - socket.io、mammoth、webav 按需 import()               │
│  - icon-park 按需注册 ~90 个图标                         │
└─────────────────────────────────────────────────────────┘
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `scripts/build-env.mjs` | 统一解析 `--lite` / `--ultra` / `--release` 等 |
| `scripts/vite-build.mjs` | Vite 构建（8GB heap） |
| `scripts/build-full.mjs` | 并行 type-check + vite |
| `vite.config.ts` | chunk 策略、PostCSS 范围、web/electron 双目标 |
| `src/main.ts` | 瘦入口 + async bootstrap |
| `src/locales/index.ts` | `setupI18n` / `switchLocale` 懒加载语言包 |
| `src/components/async/*` | Markdown / Monaco 异步包装 |

## manualChunks 策略

重依赖独立 chunk，避免重复打包、利于缓存：

- `monaco`、`markdown`、`tdesign`、`tdesign-chat`
- `vueflow`、`webav`、`socketio`、`mammoth`
- `clip-track`、`icons`、`vue-vendor`、`dayjs`、`i18n`

## 开发注意

1. **禁止**在 `main.ts` 同步引入 `md-editor-v3`、`@webav/*`、`@icon-park/vue-next/es/all`
2. 新页面 Markdown/代码编辑请用 `AsyncMdEditor` / `AsyncMonacoEditor`
3. 新增 production 流程节点用 `defineAsyncComponent`
4. `md-editor-v3` 仅允许 `import type` 类型引用
5. Windows `node_modules` 损坏时：`yarn cache clean` → 删 `node_modules` → `yarn` → `node scripts/fix-tdesign-packages.mjs`

## 后续可选优化

- TDesign 按需 CSS（release 构建可再省数分钟，需全量 UI 回归）
- Linux CI 构建（通常比 Windows 快 30%+）
- `languageConfig` 已接入 `switchLocale`，切换语言会加载对应 chunk
