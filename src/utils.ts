/**
 * proj-lysis 工具函数
 */
import fs from "node:fs";
import path from "node:path";
import type { FileLineStats } from "./types.js"; // eslint-disable-line

/** 默认跳过的二进制/非代码扩展名 */
const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp3", "mp4", "wav", "ogg", "webm", "avi", "mov",
  "zip", "tar", "gz", "bz2", "7z", "rar",
  "exe", "dll", "so", "dylib", "wasm",
  "pdf",
]);

/** 各语言注释语法模式（用于统计注释行） */
const COMMENT_PATTERNS: Record<string, { line?: string; blockStart?: string; blockEnd?: string }> = {
  js: { line: "//", blockStart: "/*", blockEnd: "*/" },
  mjs: { line: "//", blockStart: "/*", blockEnd: "*/" },
  cjs: { line: "//", blockStart: "/*", blockEnd: "*/" },
  jsx: { line: "//", blockStart: "/*", blockEnd: "*/" },
  ts: { line: "//", blockStart: "/*", blockEnd: "*/" },
  tsx: { line: "//", blockStart: "/*", blockEnd: "*/" },
  vue: { line: "//", blockStart: "/*", blockEnd: "*/" },
  css: { blockStart: "/*", blockEnd: "*/" },
  scss: { line: "//", blockStart: "/*", blockEnd: "*/" },
  less: { line: "//", blockStart: "/*", blockEnd: "*/" },
  py: { line: "#", blockStart: '"""', blockEnd: '"""' },
  rb: { line: "#" },
  sh: { line: "#" },
  bash: { line: "#" },
  go: { line: "//", blockStart: "/*", blockEnd: "*/" },
  rs: { line: "//", blockStart: "/*", blockEnd: "*/" },
  c: { line: "//", blockStart: "/*", blockEnd: "*/" },
  cpp: { line: "//", blockStart: "/*", blockEnd: "*/" },
  h: { line: "//", blockStart: "/*", blockEnd: "*/" },
  java: { line: "//", blockStart: "/*", blockEnd: "*/" },
  kt: { line: "//", blockStart: "/*", blockEnd: "*/" },
  swift: { line: "//", blockStart: "/*", blockEnd: "*/" },
  php: { line: "//", blockStart: "/*", blockEnd: "*/" },
  sql: { line: "--", blockStart: "/*", blockEnd: "*/" },
  lua: { line: "--", blockStart: "--[[", blockEnd: "]]" },
  hs: { line: "--", blockStart: "{-", blockEnd: "-}" },
  yaml: { line: "#" },
  yml: { line: "#" },
  toml: { line: "#" },
  dart: { line: "//", blockStart: "/*", blockEnd: "*/" },
  ex: { line: "#" },
  scala: { line: "//", blockStart: "/*", blockEnd: "*/" },
  r: { line: "#" },
};

// ─── 扩展名 ──────────────────────────────────────────────────────────────

/** 提取文件扩展名（不含前导点号，小写） */
export function getFileExt(filePath: string): string {
  const basename = path.basename(filePath);
  // 点文件：.env → "env", .gitignore → "gitignore", .npmrc → "npmrc"
  if (basename.startsWith(".") && basename.indexOf(".") === 0 && basename.length > 1) {
    return basename.slice(1).toLowerCase();
  }
  const ext = path.extname(filePath).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

/** 判断是否为二进制/非代码扩展名 */
export function isBinaryExt(ext: string, extra: string[]): boolean {
  if (!ext) return false;
  return BINARY_EXTS.has(ext) || extra.includes(ext);
}

// ─── 文件系统安全操作 ──────────────────────────────────────────────────

export function safeReaddir(dir: string): string[] {
  try { return fs.readdirSync(dir); } catch { return []; }
}

export function safeStat(p: string): fs.Stats | null {
  try { return fs.statSync(p); } catch { return null; }
}

/** 单文件最大读取体积：10 MB，超过则跳过 */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function safeReadFile(p: string, maxBytes = MAX_FILE_BYTES): string {
  try {
    const stat = fs.statSync(p);
    if (stat.size > maxBytes) return "";
    return fs.readFileSync(p, "utf8");
  } catch { return ""; }
}

// ─── 行数统计（含注释检测）─────────────────────────────────────────────

/** 统计文件中的总行/代码行/注释行/空白行 */
export function countLines(content: string, ext: string): FileLineStats {
  if (!content) return { totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
  const lines = content.split("\n");
  const total = content.endsWith("\n") ? lines.length - 1 : lines.length;

  let blank = 0, comment = 0, code = 0;
  const pat = COMMENT_PATTERNS[ext];
  let inBlock = false;

  for (let i = 0; i < total; i++) {
    const raw = lines[i]!;
    const t = raw.trim();
    if (t === "") { blank++; continue; }

    if (pat?.blockStart && pat.blockEnd) {
      if (inBlock) {
        comment++;
        if (t.includes(pat.blockEnd)) inBlock = false;
        continue;
      }
      if (t.startsWith(pat.blockStart)) {
        comment++;
        if (!t.includes(pat.blockEnd)) inBlock = true;
        continue;
      }
    }

    if (pat?.line && t.startsWith(pat.line)) { comment++; continue; }
    code++;
  }

  return { totalLines: total, codeLines: code, commentLines: comment, blankLines: blank };
}

// ─── 排除匹配 ──────────────────────────────────────────────────────────

/** 判断路径是否匹配排除列表（子串匹配） */
export function isExcluded(filePath: string, items: string[]): boolean {
  const p = filePath.replace(/\\/g, "/");
  return items.some((item) => p.includes(item));
}

// ─── 排序 ──────────────────────────────────────────────────────────────

/** 按指定字段排序，支持 files/codeLines/codePercentage */
export function sortResult<T extends Record<string, Record<string, any>>>(
  obj: T,
  field: string,
  order: "asc" | "desc",
): T {
  const entries = Object.entries(obj);
  const m = order === "desc" ? -1 : 1;
  entries.sort((a, b) => {
    const va = field === "codePercentage" ? parseFloat(a[1][field]) : a[1][field];
    const vb = field === "codePercentage" ? parseFloat(b[1][field]) : b[1][field];
    return m * (va - vb);
  });
  return Object.fromEntries(entries) as T;
}

// ─── .gitignore ────────────────────────────────────────────────────────

/** 解析 .gitignore 内容 */
export function parseGitignore(content: string): string[] {
  return content.split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

/** 收集目录及祖先的 .gitignore 模式 */
export function collectGitignore(dir: string, rootDir: string): string[] {
  const patterns: string[] = [];
  let cur = path.resolve(dir);
  const root = path.resolve(rootDir);

  while (cur.length >= root.length) {
    try {
      const gf = path.join(cur, ".gitignore");
      if (fs.existsSync(gf)) {
        patterns.push(...parseGitignore(fs.readFileSync(gf, "utf8")));
      }
    } catch { /* 忽略 */ }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return patterns;
}

// 导出类型供外部使用
export type { FileLineStats } from "./types.js";
