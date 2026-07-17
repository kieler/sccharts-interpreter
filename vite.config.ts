import { defineConfig } from "vite";
import path from "path";
import { execSync } from "child_process";

const gitHash = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  root: "public",
  resolve: {
    alias: {
      "web-interpreter": path.resolve(__dirname, "src/bundle.ts"),
    },
  },
  build: {
    outDir: "../dist/web",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "inject-git-hash",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace("__GIT_HASH__", gitHash);
        },
      },
    },
  ],
});
