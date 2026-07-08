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
const skipRem = isUltraBuild || process.env.BUILD_SKIP_REM === "1";
const skipCssMinify = isLiteBuild || isUltraBuild || isReleaseFast;
function getVisualizerPlugins() {
    if (process.env.ANALYZE !== "1" && process.env.ANALYZE !== "true")
        return [];
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
    }
    catch {
        console.warn("[vite] rollup-plugin-visualizer 未安装，跳过包体积分析插件");
        return [];
    }
}
function getPostcssPlugins() {
    if (skipRem)
        return [];
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
            // 仅 pages + production 业务样式（不含 main.scss）
            include: [/src\/pages\//, /src\/views\/production\//],
            landscape: false,
        }),
    ];
}
// electron 发布需要单文件 HTML；日常构建可用 BUILD_TARGET=web 走分包模式（更快、更省内存）
const isElectronBuild = process.env.BUILD_TARGET !== "web";
const tdesignResolverOptions = { library: "vue-next", importStyle: false };
const tdesignChatResolverOptions = { library: "chat", importStyle: false };
const webBuild = {
    target: "es2022",
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    cssMinify: skipCssMinify ? false : "esbuild",
    minify: isUltraBuild ? false : "esbuild",
    modulePreload: { polyfill: false },
    esbuild: {
        legalComments: "none",
        drop: skipCssMinify ? [] : ["debugger"],
    },
    rollupOptions: {
        maxParallelFileOps: 32,
        treeshake: {
            moduleSideEffects: "no-external",
            preset: "recommended",
        },
        output: {
            experimentalMinChunkSize: 2048,
            manualChunks(id) {
                if (!id.includes("node_modules"))
                    return;
                if (id.includes("monaco-editor"))
                    return "monaco";
                if (id.includes("md-editor-v3") || id.includes("codemirror"))
                    return "markdown";
                if (id.includes("@tdesign-vue-next/chat"))
                    return "tdesign-chat";
                if (id.includes("tdesign-vue-next"))
                    return "tdesign";
                if (id.includes("@vue-flow"))
                    return "vueflow";
                if (id.includes("@webav"))
                    return "webav";
                if (id.includes("socket.io-client") || id.includes("engine.io-client"))
                    return "socketio";
                if (id.includes("mammoth"))
                    return "mammoth";
                if (id.includes("vue-clip-track"))
                    return "clip-track";
                if (id.includes("dayjs"))
                    return "dayjs";
                if (id.includes("vue-i18n"))
                    return "i18n";
                if (id.includes("@icon-park"))
                    return "icons";
                if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router"))
                    return "vue-vendor";
            },
        },
    },
};
const iconsLib = fileURLToPath(new URL("./node_modules/tdesign-icons-vue-next/lib", import.meta.url));
const iconParkLib = fileURLToPath(new URL("./node_modules/@icon-park/vue-next/lib/icons", import.meta.url));
export default defineConfig(({ command }) => {
    const isServe = command === "serve";
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
                resolvers: [TDesignResolver(tdesignResolverOptions), TDesignResolver(tdesignChatResolverOptions)],
            }),
            Components({
                dts: isServe ? "src/types/components.d.ts" : false,
                dirs: ["src/components"],
                resolvers: [TDesignResolver(tdesignResolverOptions), TDesignResolver(tdesignChatResolverOptions)],
            }),
            ...(isElectronBuild ? [viteSingleFile()] : []),
            ...getVisualizerPlugins(),
        ],
        resolve: {
            alias: [
                { find: /^tdesign-icons-vue-next\/esm/, replacement: iconsLib },
                { find: /^@icon-park\/vue-next\/es\/icons/, replacement: iconParkLib },
                { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
            ],
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
