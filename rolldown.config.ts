/**
 * rolldown 打包配置
 * 产物: dist/proj-lysis.mjs (ESM), dist/proj-lysis.cjs (CJS), dist/cli.mjs (CLI)
 */
import { defineConfig } from "rolldown";

// Node.js 内置模块（外部化，不打包进产物）
const EXTERNAL = [
  "fs", "path", "os", "url", "crypto", "stream", "util",
  "events", "buffer", "child_process", "module", "readline",
  "process", "querystring", "timers", "tty", "v8", "vm",
  "worker_threads",
].flatMap((m) => [m, `node:${m}`]);

export default defineConfig([
  {
    input: "src/index.ts",
    external: EXTERNAL,
    output: [
      { file: "dist/proj-lysis.mjs", format: "esm" },
      { file: "dist/proj-lysis.cjs", format: "cjs", exports: "named" },
    ],
    platform: "node",
  },
  {
    input: "src/cli.ts",
    external: EXTERNAL,
    output: { file: "dist/cli.mjs", format: "esm", banner: "#!/usr/bin/env node" },
    platform: "node",
  },
]);
