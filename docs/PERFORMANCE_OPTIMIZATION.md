# 构建与运行时性能优化

## 目标耗时（Windows 参考）

| 命令 | 目标耗时 | 关键策略 |
|------|----------|----------|
| `yarn build:fast` | **~3 min** | ultra：stub 重依赖 + 不压缩 + 无 PostCSS |
| `yarn build:fast:lite` | ~8–15 min | 真实 monaco/md-editor，仍不压缩 |
| `yarn build:full:fast` | **~5–8 min** | 并行 tsc ∥ release-fast（不压缩） |
| `yarn build` | 同 full:fast | 默认预发布 |
| `yarn build:release` | 按需 | 完整压缩，仅正式上线 |

> **23 min 根因**：旧 `vite.config.js` 覆盖 `vite.config.ts`，且 lite 模式对 monaco 等大 chunk 做 esbuild 压缩。已删除 stale config，默认 `build:fast` 走 ultra。

## 构建命令

| 命令 | 用途 |
|------|------|
| `yarn build:fast` | **日常最快**：ultra（stub monaco/md-editor，不压缩） |
| `yarn build:fast:lite` | 同 ultra，但保留真实 monaco/md-editor（较慢，用于编辑器联调） |
| `yarn build:full:fast` | 预发布：并行 type-check + release-fast |
| `yarn build` | 默认预发布（= build:full:fast） |
| `yarn build:release` | 正式发布（开启 JS+CSS 压缩） |
| `yarn build:electron` | Electron 单文件 |

## 构建模式说明

```
ultra / lite (build:fast)
  ├─ BUILD_SKIP_HEAVY=1  → monaco / md-editor 走 stub，跳过 ~6MB 打包
  ├─ BUILD_SKIP_MINIFY=1 → 不做 esbuild 压缩（节省最多时间）
  └─ BUILD_SKIP_REM=1    → 跳过 PostCSS px-to-viewport

release-fast (build / build:full:fast)
  ├─ 真实依赖完整打包
  ├─ 不压缩 JS/CSS
  └─ vue-tsc ∥ vite 并行

release (build:release)
  └─ 完整 JS+CSS 压缩，仅上线前使用
```

## 架构分层

1. **构建基础设施**：`scripts/build-env.mjs` + `vite.config.ts` 多模式
2. **入口瘦身**：`main.ts` 异步 bootstrap，无重依赖同步引入
3. **模块懒加载**：production / setting / workbench `defineAsyncComponent`
4. **重依赖动态化**：AsyncMdEditor / socket / mammoth / webav 按需加载

## 关键文件

| 文件 | 职责 |
|------|------|
| `scripts/build-env.mjs` | `BUILD_SKIP_HEAVY/MINIFY/REM` 环境变量 |
| `src/stubs/*` | ultra 模式重依赖占位 |
| `vite.config.ts` | 模式开关、manualChunks、alias |
| `scripts/build-full.mjs` | 并行 type-check + vite |

## 注意

- `build:fast` 产物中 Markdown/Monaco 为占位组件，**仅用于验证构建与主流程**，不能测试编辑器功能
- 编辑器联调用 `yarn build:fast:lite` 或 `yarn build:release`
- 禁止在 `main.ts` 同步引入 `md-editor-v3`、`@webav/*`、`@icon-park/vue-next/es/all`
