import { fileURLToPath, URL } from "node:url";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { TDesignResolver } from "@tdesign-vue-next/auto-import-resolver";
import { viteSingleFile } from "vite-plugin-singlefile";
import postcsspxtoviewport from "postcss-px-to-viewport";

const require = createRequire(import.meta.url);

const buildMode = process.env.BUILD_MODE ?? "default";
const isUltraBuild = buildMode === "ultra" || process.env.BUILD_ULTRA === "1";
const isLiteBuild = buildMode === "lite" || process.env.BUILD_LITE === "1";
const isReleaseFast = buildMode === "release-fast" || process.env.BUILD_RELEASE_FAST === "1";
const skipHeavy = process.env.BUILD_SKIP_HEAVY === "1" || isUltraBuild;
const skipMinify = process.env.BUILD_SKIP_MINIFY === "1" || isUltraBuild || isLiteBuild || isReleaseFast;
const skipRem = process.env.BUILD_SKIP_REM === "1" || isUltraBuild || isLiteBuild || isReleaseFast;

function getVisualizerPlugins() {
  if (process.env.ANALYZE !== "1" && process.env.ANALYZE !== "true") return [];
  try {
    const { visualizer } = require("rollup-plugin-visualizer");
    return [
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ];
  } catch {
    console.warn("[vite] rollup-plugin-visualizer 未安装，跳过包体积分析插件");
    return [];
  }
}

function getPostcssPlugins() {
  if (skipRem) return [];
  return [
    postcsspxtoviewport({
      unitToConvert: "px",
      viewportWidth: 1600,
      unitPrecision: 1,
      viewportUnit: "rem",
      fontViewportUnit: "rem",
      propList: ["*"],
      selectorBlackList: ["ignore", /^\.t-/],
      minPixelValue: 2,
      mediaQuery: false,
      replace: true,
      exclude: [/node_modules/],
      include: [/src\/pages\//, /src\/views\/production\//],
      landscape: false,
    }),
  ];
}

const isElectronBuild = process.env.BUILD_TARGET !== "web";

const tdesignResolverOptions = { library: "vue-next" as const, importStyle: false };
const tdesignChatResolverOptions = { library: "chat" as const, importStyle: false };

const emptyCss = fileURLToPath(new URL("./src/stubs/empty.css", import.meta.url));
const mdEditorStub = fileURLToPath(new URL("./src/stubs/md-editor-v3.ts", import.meta.url));
const monacoStub = fileURLToPath(new URL("./src/stubs/monaco-editor.ts", import.meta.url));
const monacoVueStub = fileURLToPath(new URL("./src/stubs/monaco-editor-vue3.vue", import.meta.url));

const tdesignChatStub = fileURLToPath(new URL("./src/stubs/tdesign-chat.ts", import.meta.url));
const webavCliperStub = fileURLToPath(new URL("./src/stubs/webav-cliper.ts", import.meta.url));
const webavCanvasStub = fileURLToPath(new URL("./src/stubs/webav-canvas.ts", import.meta.url));
const mammothStub = fileURLToPath(new URL("./src/stubs/mammoth.ts", import.meta.url));
const clipTrackStub = fileURLToPath(new URL("./src/stubs/vue-clip-track.ts", import.meta.url));

function getManualChunks(id: string) {
  if (!id.includes("node_modules")) return;
  if (id.includes("monaco-editor")) return "monaco";
  if (id.includes("md-editor-v3") || id.includes("codemirror")) return "markdown";
  if (id.includes("@tdesign-vue-next/chat")) return "tdesign-chat";
  if (id.includes("tdesign-vue-next")) return "tdesign";
  if (id.includes("@vue-flow")) return "vueflow";
  if (id.includes("@webav")) return "webav";
  if (id.includes("socket.io-client") || id.includes("engine.io-client")) return "socketio";
  if (id.includes("mammoth")) return "mammoth";
  if (id.includes("vue-clip-track")) return "clip-track";
  if (id.includes("dayjs")) return "dayjs";
  if (id.includes("vue-i18n")) return "i18n";
  if (id.includes("@icon-park")) return "icons";
  if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router")) return "vue-vendor";
}

const webBuild = {
  target: skipMinify ? ("esnext" as const) : ("es2022" as const),
  sourcemap: false,
  reportCompressedSize: false,
  chunkSizeWarningLimit: 5000,
  cssCodeSplit: !skipMinify,
  assetsInlineLimit: 4096,
  cssMinify: skipMinify ? false : ("esbuild" as const),
  minify: skipMinify ? false : ("esbuild" as const),
  modulePreload: { polyfill: false },
  esbuild: {
    legalComments: "none",
    drop: skipMinify ? [] : ["debugger"],
  },
  rollupOptions: {
    maxParallelFileOps: 64,
    treeshake: skipMinify ? { preset: "recommended" as const } : { moduleSideEffects: "no-external", preset: "recommended" as const },
    output: {
      manualChunks: getManualChunks,
    },
  },
};

const iconsLib = fileURLToPath(new URL("./node_modules/tdesign-icons-vue-next/lib", import.meta.url));
const iconParkLib = fileURLToPath(new URL("./node_modules/@icon-park/vue-next/lib/icons", import.meta.url));

function getResolveAlias() {
  const alias = [
    { find: /^tdesign-icons-vue-next\/esm/, replacement: iconsLib },
    { find: /^@icon-park\/vue-next\/es\/icons/, replacement: iconParkLib },
    { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
  ];

  if (skipHeavy) {
    alias.push(
      { find: /^tdesign-vue-next\/es\/style\/index\.css$/, replacement: emptyCss },
      { find: /^vue-clip-track\/style\.css$/, replacement: emptyCss },
      { find: /^vue-clip-track$/, replacement: clipTrackStub },
      { find: /^md-editor-v3\/lib\/style\.css$/, replacement: emptyCss },
      { find: /^monaco-editor$/, replacement: monacoStub },
      { find: /^monaco-editor\//, replacement: monacoStub },
      { find: /^monaco-editor-vue3$/, replacement: monacoVueStub },
      { find: /^md-editor-v3$/, replacement: mdEditorStub },
      { find: /^@tdesign-vue-next\/chat$/, replacement: tdesignChatStub },
      { find: /^@webav\/av-cliper$/, replacement: webavCliperStub },
      { find: /^@webav\/av-canvas$/, replacement: webavCanvasStub },
      { find: /^mammoth$/, replacement: mammothStub },
    );
  }

  return alias;
}

export default defineConfig(({ command }) => {
  const isServe = command === "serve";
  const isBuild = command === "build";
  const chatResolver = skipHeavy && isBuild ? [] : [TDesignResolver(tdesignChatResolverOptions)];
  const vueResolvers = [TDesignResolver(tdesignResolverOptions), ...chatResolver];

  if (!isServe && !isElectronBuild) {
    console.log(
      `[vite] mode=${buildMode} skipHeavy=${skipHeavy} skipMinify=${skipMinify} skipRem=${skipRem}`,
    );
  }

  return {
    base: "./",
    cacheDir: "node_modules/.vite",
    build: isElectronBuild
      ? {
          assetsInlineLimit: Infinity,
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        }
      : webBuild,
    plugins: [
      vue({
        template: {
          compilerOptions: {
            comments: false,
          },
        },
      }),
      AutoImport({
        dts: isServe ? "src/types/auto-imports.d.ts" : false,
        imports: ["vue", "pinia", "vue-router"],
        resolvers: vueResolvers,
      }),
      Components({
        dts: isServe ? "src/types/components.d.ts" : false,
        dirs: ["src/components"],
        resolvers: vueResolvers,
      }),
      ...(isElectronBuild ? [viteSingleFile()] : []),
      ...getVisualizerPlugins(),
    ],
    resolve: {
      alias: getResolveAlias(),
    },
    optimizeDeps: {
      include: ["vue", "vue-router", "pinia", "axios", "tdesign-vue-next", "@vue-flow/core"],
      exclude: ["monaco-editor", "monaco-editor-vue3", "mammoth"],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          silenceDeprecations: ["legacy-js-api"],
        },
      },
      postcss: {
        plugins: getPostcssPlugins(),
      },
    },
    server: {
      port: 50188,
      warmup: {
        clientFiles: ["./src/main.ts", "./src/App.vue", "./src/router/index.ts"],
      },
    },
  };
});
