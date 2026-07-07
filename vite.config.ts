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

const tdesignResolverOptions = { library: "vue-next" as const };
const tdesignChatResolverOptions = { library: "chat" as const };

const webBuild = {
  target: "es2020" as const,
  sourcemap: false,
  reportCompressedSize: false,
  chunkSizeWarningLimit: 2000,
  rollupOptions: {
    output: {
      manualChunks(id: string) {
        if (!id.includes("node_modules")) return;
        if (id.includes("monaco-editor")) return "monaco";
        if (id.includes("md-editor-v3") || id.includes("codemirror")) return "markdown";
        if (id.includes("tdesign-vue-next")) return "tdesign";
        if (id.includes("@vue-flow")) return "vueflow";
        if (id.includes("@webav")) return "webav";
        if (id.includes("socket.io-client") || id.includes("engine.io-client")) return "socketio";
        if (id.includes("mammoth")) return "mammoth";
        if (id.includes("vue-clip-track")) return "clip-track";
        if (id.includes("@icon-park")) return "icons";
        if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router")) return "vue-vendor";
      },
    },
  },
};

const iconsLib = fileURLToPath(new URL("./node_modules/tdesign-icons-vue-next/lib", import.meta.url));

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
    : webBuild,
  plugins: [
    vue(),
    AutoImport({
      dts: "src/types/auto-imports.d.ts",
      imports: ["vue", "pinia", "vue-router"],
      resolvers: [TDesignResolver(tdesignResolverOptions), TDesignResolver(tdesignChatResolverOptions)],
    }),
    Components({
      dts: "src/types/components.d.ts",
      resolvers: [TDesignResolver(tdesignResolverOptions), TDesignResolver(tdesignChatResolverOptions)],
    }),
    ...(isElectronBuild ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: [
      { find: /^tdesign-icons-vue-next\/esm/, replacement: iconsLib },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  optimizeDeps: {
    include: [
      "vue",
      "vue-router",
      "pinia",
      "axios",
      "tdesign-vue-next",
      "@vue-flow/core",
      "md-editor-v3",
      "monaco-editor",
    ],
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
          exclude: [/node_modules/],
          // 仅对需要 rem 适配的目录做 px 转换，缩短构建时间
          include: [/src\/pages\//, /src\/views\/production\//, /src\/assets\/main\.scss/],
          landscape: false,
        }),
      ],
    },
  },
  server: {
    port: 50188,
    warmup: {
      clientFiles: ["./src/main.ts", "./src/App.vue", "./src/router/index.ts"],
    },
  },
});
