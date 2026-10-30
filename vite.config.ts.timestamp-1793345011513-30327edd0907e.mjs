// vite.config.ts
import { defineConfig } from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { resolve } from "path";
import AutoImport from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/unplugin-vue-components/dist/vite.js";
import { ElementPlusResolver } from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/unplugin-vue-components/dist/resolvers.js";
import tailwindcss from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/@tailwindcss/vite/dist/index.mjs";
import { visualizer } from "file:///D:/%E5%B7%A5%E4%BD%9C/%E9%A1%B9%E7%9B%AE%E6%B5%8B%E8%AF%95/%E6%9C%AA%E6%9D%A5%E6%99%BA%E5%8C%A0%E5%89%8D%E5%90%8E%E7%AB%AF%E9%A1%B9%E7%9B%AE/wise-forge/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "D:\\\u5DE5\u4F5C\\\u9879\u76EE\u6D4B\u8BD5\\\u672A\u6765\u667A\u5320\u524D\u540E\u7AEF\u9879\u76EE\\wise-forge";
var vite_config_default = defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    // copyDist('../ainode/dist'),
    ...process.env.ANALYZE === "true" ? [
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "./dist/stats.html"
      })
    ] : []
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://spark-api-open.xf-yun.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      },
      // 开发环境走同源代理，验证码依赖的 session cookie 才能正常回传
      "/aicg": {
        target: "http://127.0.0.1:5002",
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler"
      }
    }
  },
  esbuild: {
    drop: ["console", "debugger"]
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const extType = info[info.length - 1];
          if (/\.(css|scss|sass|less|styl)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${extType}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `images/[name]-[hash].${extType}`;
          }
          return `assets/[name]-[hash].${extType}`;
        },
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("element-plus")) return "vendor-element";
            if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router"))
              return "vendor-vue";
            if (id.includes("highlight.js")) return "vendor-highlight";
            if (id.includes("markdown-it")) return "vendor-markdown";
            return "vendor-common";
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxcdTVERTVcdTRGNUNcXFxcXHU5ODc5XHU3NkVFXHU2RDRCXHU4QkQ1XFxcXFx1NjcyQVx1Njc2NVx1NjY3QVx1NTMyMFx1NTI0RFx1NTQwRVx1N0FFRlx1OTg3OVx1NzZFRVxcXFx3aXNlLWZvcmdlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxcdTVERTVcdTRGNUNcXFxcXHU5ODc5XHU3NkVFXHU2RDRCXHU4QkQ1XFxcXFx1NjcyQVx1Njc2NVx1NjY3QVx1NTMyMFx1NTI0RFx1NTQwRVx1N0FFRlx1OTg3OVx1NzZFRVxcXFx3aXNlLWZvcmdlXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi8lRTUlQjclQTUlRTQlQkQlOUMvJUU5JUExJUI5JUU3JTlCJUFFJUU2JUI1JThCJUU4JUFGJTk1LyVFNiU5QyVBQSVFNiU5RCVBNSVFNiU5OSVCQSVFNSU4QyVBMCVFNSU4OSU4RCVFNSU5MCU4RSVFNyVBQiVBRiVFOSVBMSVCOSVFNyU5QiVBRS93aXNlLWZvcmdlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJ1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSdcbmltcG9ydCB7IEVsZW1lbnRQbHVzUmVzb2x2ZXIgfSBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy9yZXNvbHZlcnMnXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJ1xuLy8gaW1wb3J0IGNvcHlEaXN0IGZyb20gJy4vc3JjL3BsdWdpbnMvdml0ZS1wbHVnaW4tY29weSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHRhaWx3aW5kY3NzKCksXG4gICAgdnVlKCksXG4gICAgQXV0b0ltcG9ydCh7XG4gICAgICByZXNvbHZlcnM6IFtFbGVtZW50UGx1c1Jlc29sdmVyKCldXG4gICAgfSksXG4gICAgQ29tcG9uZW50cyh7XG4gICAgICByZXNvbHZlcnM6IFtFbGVtZW50UGx1c1Jlc29sdmVyKCldXG4gICAgfSksXG4gICAgLy8gY29weURpc3QoJy4uL2Fpbm9kZS9kaXN0JyksXG4gICAgLi4uKHByb2Nlc3MuZW52LkFOQUxZWkUgPT09ICd0cnVlJ1xuICAgICAgPyBbXG4gICAgICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgICAgICBvcGVuOiB0cnVlLFxuICAgICAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgICAgICBicm90bGlTaXplOiB0cnVlLFxuICAgICAgICAgICAgZmlsZW5hbWU6ICcuL2Rpc3Qvc3RhdHMuaHRtbCdcbiAgICAgICAgICB9KVxuICAgICAgICBdXG4gICAgICA6IFtdKVxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vc3BhcmstYXBpLW9wZW4ueGYteXVuLmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogcGF0aCA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJylcbiAgICAgIH0sXG4gICAgICAvLyBcdTVGMDBcdTUzRDFcdTczQUZcdTU4ODNcdThENzBcdTU0MENcdTZFOTBcdTRFRTNcdTc0MDZcdUZGMENcdTlBOENcdThCQzFcdTc4MDFcdTRGOURcdThENTZcdTc2ODQgc2Vzc2lvbiBjb29raWUgXHU2MjREXHU4MEZEXHU2QjYzXHU1RTM4XHU1NkRFXHU0RjIwXG4gICAgICAnL2FpY2cnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6NTAwMicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgY3NzOiB7XG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgc2Nzczoge1xuICAgICAgICBhcGk6ICdtb2Rlcm4tY29tcGlsZXInXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBlc2J1aWxkOiB7XG4gICAgZHJvcDogWydjb25zb2xlJywgJ2RlYnVnZ2VyJ11cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm86IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGluZm8gPSBhc3NldEluZm8ubmFtZS5zcGxpdCgnLicpXG4gICAgICAgICAgY29uc3QgZXh0VHlwZSA9IGluZm9baW5mby5sZW5ndGggLSAxXVxuICAgICAgICAgIGlmICgvXFwuKGNzc3xzY3NzfHNhc3N8bGVzc3xzdHlsKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGNzcy9bbmFtZV0tW2hhc2hdLiR7ZXh0VHlwZX1gXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvXFwuKHBuZ3xqcGU/Z3xnaWZ8c3ZnfHdlYnB8aWNvKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGltYWdlcy9bbmFtZV0tW2hhc2hdLiR7ZXh0VHlwZX1gXG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF0uJHtleHRUeXBlfWBcbiAgICAgICAgfSxcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgLy8gXHU2MjhBXHU1OTI3XHU0RjlEXHU4RDU2XHU2MkM2XHU2MjEwXHU3MkVDXHU3QUNCIGNodW5rXHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU1RTc2XHU4ODRDXHU0RTBCXHU4RjdEXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2VsZW1lbnQtcGx1cycpKSByZXR1cm4gJ3ZlbmRvci1lbGVtZW50J1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd2dWUnKSB8fCBpZC5pbmNsdWRlcygncGluaWEnKSB8fCBpZC5pbmNsdWRlcygndnVlLXJvdXRlcicpKVxuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci12dWUnXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2hpZ2hsaWdodC5qcycpKSByZXR1cm4gJ3ZlbmRvci1oaWdobGlnaHQnXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ21hcmtkb3duLWl0JykpIHJldHVybiAndmVuZG9yLW1hcmtkb3duJ1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY29tbW9uJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVosU0FBUyxvQkFBb0I7QUFDOWEsT0FBTyxTQUFTO0FBQ2hCLFNBQVMsZUFBZTtBQUN4QixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLDJCQUEyQjtBQUNwQyxPQUFPLGlCQUFpQjtBQUN4QixTQUFTLGtCQUFrQjtBQVAzQixJQUFNLG1DQUFtQztBQVV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxZQUFZO0FBQUEsSUFDWixJQUFJO0FBQUEsSUFDSixXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxJQUNuQyxDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxJQUNuQyxDQUFDO0FBQUE7QUFBQSxJQUVELEdBQUksUUFBUSxJQUFJLFlBQVksU0FDeEI7QUFBQSxNQUNFLFdBQVc7QUFBQSxRQUNULE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLFVBQVU7QUFBQSxNQUNaLENBQUM7QUFBQSxJQUNILElBQ0EsQ0FBQztBQUFBLEVBQ1A7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsVUFBUSxLQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDNUM7QUFBQTtBQUFBLE1BRUEsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQSxRQUNKLEtBQUs7QUFBQSxNQUNQO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU0sQ0FBQyxXQUFXLFVBQVU7QUFBQSxFQUM5QjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCLENBQUMsY0FBbUI7QUFDbEMsZ0JBQU0sT0FBTyxVQUFVLEtBQUssTUFBTSxHQUFHO0FBQ3JDLGdCQUFNLFVBQVUsS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUNwQyxjQUFJLCtCQUErQixLQUFLLFVBQVUsSUFBSSxHQUFHO0FBQ3ZELG1CQUFPLHFCQUFxQixPQUFPO0FBQUEsVUFDckM7QUFDQSxjQUFJLGtDQUFrQyxLQUFLLFVBQVUsSUFBSSxHQUFHO0FBQzFELG1CQUFPLHdCQUF3QixPQUFPO0FBQUEsVUFDeEM7QUFDQSxpQkFBTyx3QkFBd0IsT0FBTztBQUFBLFFBQ3hDO0FBQUEsUUFDQSxhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFFL0IsZ0JBQUksR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3hDLGdCQUFJLEdBQUcsU0FBUyxLQUFLLEtBQUssR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsWUFBWTtBQUN4RSxxQkFBTztBQUNULGdCQUFJLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQUN4QyxnQkFBSSxHQUFHLFNBQVMsYUFBYSxFQUFHLFFBQU87QUFDdkMsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUNqQztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
