import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { TDesignResolver } from "@tdesign-vue-next/auto-import-resolver";
import { viteSingleFile } from "vite-plugin-singlefile";
import postcsspxtoviewport from "postcss-px-to-viewport";
// electron 发布需要单文件 HTML；日常构建可用 BUILD_TARGET=web 走分包模式（更快、更省内存）
const isElectronBuild = process.env.BUILD_TARGET !== "web";
export default defineConfig({
    base: "./",
    build: isElectronBuild
        ? {
            assetsInlineLimit: Infinity,
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
        }
        : {
            sourcemap: false,
            chunkSizeWarningLimit: 2000,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes("node_modules"))
                            return;
                        if (id.includes("monaco-editor"))
                            return "monaco";
                        if (id.includes("md-editor-v3") || id.includes("codemirror"))
                            return "markdown";
                        if (id.includes("tdesign-vue-next"))
                            return "tdesign";
                        if (id.includes("@vue-flow"))
                            return "vueflow";
                        if (id.includes("@webav"))
                            return "webav";
                        if (id.includes("@icon-park"))
                            return "icons";
                        if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router"))
                            return "vue-vendor";
                    },
                },
            },
        },
    plugins: [
        vue(),
        AutoImport({
            dts: "src/types/auto-imports.d.ts",
            imports: ["vue", "pinia", "vue-router"],
            resolvers: [
                TDesignResolver({
                    library: "vue-next",
                }),
                TDesignResolver({
                    library: "chat",
                }),
            ],
        }),
        Components({
            dts: "src/types/components.d.ts",
            resolvers: [
                TDesignResolver({
                    library: "vue-next",
                }),
                TDesignResolver({
                    library: "chat",
                }),
            ],
        }),
        ...(isElectronBuild ? [viteSingleFile()] : []),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
            },
        },
        postcss: {
            plugins: [
                postcsspxtoviewport({
                    unitToConvert: "px",
                    viewportWidth: 1600,
                    unitPrecision: 4,
                    viewportUnit: "rem",
                    fontViewportUnit: "rem",
                    propList: ["*"],
                    selectorBlackList: ["ignore"],
                    minPixelValue: 1,
                    mediaQuery: true,
                    replace: true,
                    // 仅处理业务样式，跳过 node_modules 避免构建极慢
                    exclude: [/node_modules/],
                    include: [/src/],
                    landscape: false,
                }),
            ],
        },
    },
    server: {
        port: 50188,
    },
});
