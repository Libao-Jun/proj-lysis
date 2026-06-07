/**
 * proj-lysis 核心分析引擎
 *
 * 递归扫描目录，按文件扩展名统计文件数、体积、代码行数、注释行数、空白行数及占比。
 * 分析结果输出到被分析项目的 `proj-lysis/` 目录下：
 *   - analysis.json  — JSON 格式数据
 *   - report-zh.md   — 代码统计报告（中文表头）
 *   - report-en.md   — Code statistics report（English headers）
 *   - size-zh.md     — 文件体积统计（中文表头，含单个文件明细）
 *   - size-en.md     — File size statistics（English headers, per-file details）
 */
import fs from "node:fs";
import path from "node:path";
import type { AnalysisResult, AnalyzeOptions } from "./types.js";
import {
  collectGitignore,
  countLines,
  getFileExt,
  isBinaryExt,
  isExcluded,
  safeReaddir,
  safeReadFile,
  safeStat,
  sortResult,
} from "./utils.js";

// ─── 预设排除 ──────────────────────────────────────────────────────────────

export const FRONTEND_PRESET = [
  "node_modules", ".git", ".svn",
  "dist", "build", ".next", ".nuxt", ".output", "out",
  "public", "static", "assets",
  "coverage", ".nyc_output",
  ".vscode", ".idea",
  ".DS_Store", "Thumbs.db",
  ".cache", ".temp", "tmp",
  ".lock",
  ".gitignore", ".npmrc", ".env",
  "docker",
  "__pycache__",
  ".agents",".claude"
];

// ─── 内部：收集文件 ────────────────────────────────────────────────────────

interface FileEntry { filePath: string; size: number; relativePath: string }

/** 最大递归深度，防止符号链接循环导致的无限递归 */
const MAX_DEPTH = 32;

function collectFiles(
  dir: string,
  excludeItems: string[],
  excludeExts: string[],
  rootDir: string,
  depth = 0,
): FileEntry[] {
  if (depth > MAX_DEPTH) return [];
  const result: FileEntry[] = [];
  const entries = safeReaddir(dir);
  if (entries.length === 0) return result;

  for (const name of entries) {
    const fullPath = path.join(dir, name);
    if (isExcluded(fullPath, excludeItems)) continue;

    const stat = safeStat(fullPath);
    if (!stat) continue;

    if (stat.isDirectory()) {
      result.push(...collectFiles(fullPath, excludeItems, excludeExts, rootDir, depth + 1));
    } else if (stat.isFile()) {
      const ext = getFileExt(fullPath);
      if (ext && !isBinaryExt(ext, excludeExts)) {
        result.push({
          filePath: fullPath,
          size: stat.size,
          relativePath: path.relative(rootDir, fullPath),
        });
      }
    }
  }
  return result;
}

/** 转义 Markdown 表格中的特殊字符，防止表格布局被破坏 */
function sanitizeMdTable(text: string): string {
  return text.replace(/\|/g, "\\|");
}

// ─── 内部：格式化 ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, Math.min(i, units.length - 1));
  return `${size!.toFixed(1)} ${units[i]}`;
}

// ─── 内部：Markdown 报告 ───────────────────────────────────────────────────

type Summary = {
  totalFiles: number;
  totalBytes: number;
  totalLines: number;
  totalCode: number;
  totalComment: number;
  totalBlank: number;
};

/** 代码统计报告（report-*.md） */
function buildReportMarkdown(
  sorted: AnalysisResult,
  summary: Summary,
  locale: "en" | "zh",
): string {
  const isZh = locale === "zh";
  const now = new Date().toISOString();
  const sep = "|";

  const title = isZh
    ? "# 📊 proj-lysis 代码统计报告"
    : "# 📊 proj-lysis Code Statistics Report";
  const genTime = isZh ? `生成时间：${now}` : `Generated: ${now}`;

  const summaryTitle = isZh ? "## 汇总" : "## Summary";
  const summaryLabels = isZh ? ["指标", "数值"] : ["Metric", "Value"];
  const summaryRows: [string, string][] = isZh
    ? [
        ["文件总数", String(summary.totalFiles)],
        ["总体积", formatBytes(summary.totalBytes)],
        ["总行数", String(summary.totalLines)],
        ["代码行", String(summary.totalCode)],
        ["注释行", String(summary.totalComment)],
        ["空白行", String(summary.totalBlank)],
      ]
    : [
        ["Total Files", String(summary.totalFiles)],
        ["Total Size", formatBytes(summary.totalBytes)],
        ["Total Lines", String(summary.totalLines)],
        ["Code Lines", String(summary.totalCode)],
        ["Comment Lines", String(summary.totalComment)],
        ["Blank Lines", String(summary.totalBlank)],
      ];

  const headers = isZh
    ? ["文件类型", "文件数", "体积", "总行数", "代码行", "注释行", "空白行", "文件占比", "代码占比", "体积占比"]
    : ["File Type", "Files", "Size", "Total Lines", "Code Lines", "Comment Lines", "Blank Lines", "File %", "Code %", "Size %"];

  let md = `${title}\n\n${genTime}\n\n${summaryTitle}\n\n`;
  md += `${sep} ${summaryLabels[0]} ${sep} ${summaryLabels[1]} ${sep}\n`;
  md += `${sep}------${sep}------${sep}\n`;
  for (const [label, value] of summaryRows) {
    md += `${sep} ${label} ${sep} ${value} ${sep}\n`;
  }

  md += `\n## ${isZh ? "按文件类型统计" : "File Breakdown"}\n\n`;
  md += `${sep} ${headers.join(` ${sep} `)} ${sep}\n`;
  md += `${sep}${headers.map(() => "------").join(sep)}${sep}\n`;
  for (const [ext, s] of Object.entries(sorted)) {
    const safeExt = sanitizeMdTable(ext);
    md += `${sep} .${safeExt} ${sep} ${s.files} ${sep} ${formatBytes(s.bytes)} ${sep} `;
    md += `${s.totalLines} ${sep} ${s.codeLines} ${sep} ${s.commentLines} ${sep} ${s.blankLines} ${sep} `;
    md += `${s.filePercentage} ${sep} ${s.codePercentage} ${sep} ${s.sizePercentage} ${sep}\n`;
  }

  md += `\n*Generated by proj-lysis*\n`;
  return md;
}

/** 文件体积统计报告（size-*.md）—— 含单个文件明细（使用相对路径） */
function buildSizeMarkdown(
  sorted: AnalysisResult,
  byExt: Map<string, FileEntry[]>,
  totalBytes: number,
  locale: "en" | "zh",
): string {
  const isZh = locale === "zh";
  const now = new Date().toISOString();
  const sep = "|";

  const title = isZh
    ? "# 📊 proj-lysis 文件体积统计"
    : "# 📊 proj-lysis File Size Statistics";
  const genTime = isZh ? `生成时间：${now}` : `Generated: ${now}`;

  const summaryTitle = isZh ? "## 同类文件体积汇总" : "## Size Summary by Type";
  const summaryLabels = isZh
    ? ["文件类型", "文件数", "总体积", "平均体积", "体积占比"]
    : ["File Type", "Files", "Total Size", "Avg Size", "Size %"];

  const detailTitle = isZh ? "## 单个文件体积明细" : "## Per-File Size Details";

  let md = `${title}\n\n${genTime}\n\n${summaryTitle}\n\n`;
  md += `${sep} ${summaryLabels.join(` ${sep} `)} ${sep}\n`;
  md += `${sep}${summaryLabels.map(() => "------").join(sep)}${sep}\n`;

  for (const [ext] of Object.entries(sorted)) {
    const entries = byExt.get(ext) ?? [];
    const s = sorted[ext]!;
    const avg = entries.length > 0 ? s.bytes / entries.length : 0;
    const safeExt = sanitizeMdTable(ext);
    md += `${sep} .${safeExt} ${sep} ${s.files} ${sep} ${formatBytes(s.bytes)} ${sep} `;
    md += `${formatBytes(Math.round(avg))} ${sep} ${s.sizePercentage} ${sep}\n`;
  }

  // ── 单个文件明细（使用相对路径保护隐私）──
  md += `\n${detailTitle}\n\n`;

  for (const [ext] of Object.entries(sorted)) {
    const entries = byExt.get(ext) ?? [];
    const s = sorted[ext]!;

    if (entries.length === 0) continue;

    const safeExt = sanitizeMdTable(ext);
    const extTitle = isZh
      ? `### .${safeExt}（${s.files} 个文件, ${formatBytes(s.bytes)}）`
      : `### .${safeExt} (${s.files} files, ${formatBytes(s.bytes)})`;
    md += `${extTitle}\n\n`;

    const fileHeaders = isZh ? ["文件路径", "体积"] : ["File Path", "Size"];
    md += `${sep} ${fileHeaders.join(` ${sep} `)} ${sep}\n`;
    md += `${sep}------${sep}------${sep}\n`;

    const sortedEntries = [...entries].sort((a, b) => b.size - a.size);
    for (const entry of sortedEntries) {
      const safePath = sanitizeMdTable(entry.relativePath);
      md += `${sep} ${safePath} ${sep} ${formatBytes(entry.size)} ${sep}\n`;
    }
    md += "\n";
  }

  md += `*Generated by proj-lysis*\n`;
  return md;
}

// ─── 写文件 ────────────────────────────────────────────────────────────────

function writeFile(filePath: string, content: string): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  } catch { /* 静默 */ }
}

// ─── 公共 API ──────────────────────────────────────────────────────────────

/**
 * 分析指定目录的代码统计信息。
 *
 * 最终排除列表 = (preset ?? FRONTEND_PRESET) + exclude + .gitignore
 *
 * 输出文件（写入 `{directory}/proj-lysis/`）：
 * - `analysis.json`  — JSON 数据
 * - `report-zh.md`   — 代码统计报告（中文表头）
 * - `report-en.md`   — Code statistics report（English headers）
 * - `size-zh.md`     — 文件体积统计（中文表头 + 单个文件明细）
 * - `size-en.md`     — File size statistics（English headers + per-file details）
 *
 * @returns 排序后的分析结果
 */
export function analyze(options: AnalyzeOptions): AnalysisResult {
  const {
    directory,
    preset,
    exclude = [],
    excludeExtensions = [],
    sortField = "files",
    sortOrder = "desc",
    outputPath,
    respectGitignore = true,
  } = options;

  // ─── 合并排除 ──────────────────────────────────────────────────
  const basePreset = preset !== undefined ? preset : FRONTEND_PRESET;
  const excludeItems = [...new Set([...basePreset, ...exclude])];

  if (respectGitignore) {
    const resolved = path.resolve(directory);
    excludeItems.push(...collectGitignore(resolved, resolved));
  }

  // ─── 验证输出路径，禁止写入到分析目录之外 ────────────────────
  const resolvedDir = path.resolve(directory);

  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    if (!resolvedOutput.startsWith(resolvedDir + path.sep) && resolvedOutput !== resolvedDir) {
      throw new Error(
        `输出路径 "${outputPath}" 不在分析目录 "${resolvedDir}" 内，拒绝写入。`,
      );
    }
  }

  // ─── 收集文件 ─────────────────────────────────────────────────
  const entries = collectFiles(resolvedDir, excludeItems, excludeExtensions, resolvedDir);
  const stats: AnalysisResult = {};
  const byExt = new Map<string, FileEntry[]>(); // 按扩展名分组（供体积报告用）

  for (const entry of entries) {
    const ext = getFileExt(entry.filePath);
    if (!ext) continue;

    // 记录文件条目（含路径和体积）
    if (!byExt.has(ext)) byExt.set(ext, []);
    byExt.get(ext)!.push(entry);

    const content = safeReadFile(entry.filePath);
    if (!content) continue;

    const lineStats = countLines(content, ext);

    if (!stats[ext]) {
      stats[ext] = {
        files: 0, bytes: 0, totalLines: 0, codeLines: 0,
        commentLines: 0, blankLines: 0,
        filePercentage: "0.00%", codePercentage: "0.00%", sizePercentage: "0.00%",
      };
    }
    const s = stats[ext]!;
    s.files++;
    s.bytes += entry.size;
    s.totalLines += lineStats.totalLines;
    s.codeLines += lineStats.codeLines;
    s.commentLines += lineStats.commentLines;
    s.blankLines += lineStats.blankLines;
  }

  // ─── 汇总 & 百分比 ──────────────────────────────────────────
  let totalFiles = 0, totalBytes = 0, totalCode = 0, totalComment = 0, totalBlank = 0, totalAll = 0;
  for (const s of Object.values(stats)) {
    totalFiles += s.files;
    totalBytes += s.bytes;
    totalCode += s.codeLines;
    totalComment += s.commentLines;
    totalBlank += s.blankLines;
    totalAll += s.totalLines;
  }

  for (const s of Object.values(stats)) {
    s.filePercentage = totalFiles > 0 ? `${((s.files / totalFiles) * 100).toFixed(2)}%` : "0.00%";
    s.codePercentage = totalCode > 0 ? `${((s.codeLines / totalCode) * 100).toFixed(2)}%` : "0.00%";
    s.sizePercentage = totalBytes > 0 ? `${((s.bytes / totalBytes) * 100).toFixed(2)}%` : "0.00%";
  }

  const sorted = sortResult(stats, sortField, sortOrder);

  // ─── 写文件 ──────────────────────────────────────────────────
  if (Object.keys(sorted).length > 0) {
    const outDir = path.join(resolvedDir, "proj-lysis");
    const summary: Summary = { totalFiles, totalBytes, totalLines: totalAll, totalCode, totalComment, totalBlank };

    // 代码统计
    writeFile(outputPath ?? path.join(outDir, "analysis.json"), JSON.stringify(sorted, null, 2));
    writeFile(path.join(outDir, "report-zh.md"), buildReportMarkdown(sorted, summary, "zh"));
    writeFile(path.join(outDir, "report-en.md"), buildReportMarkdown(sorted, summary, "en"));

    // 体积统计（含单个文件明细）
    writeFile(path.join(outDir, "size-zh.md"), buildSizeMarkdown(sorted, byExt, totalBytes, "zh"));
    writeFile(path.join(outDir, "size-en.md"), buildSizeMarkdown(sorted, byExt, totalBytes, "en"));
  }

  return sorted;
}

export type { AnalysisResult, AnalyzeOptions, ExtensionStats } from "./types.js";
