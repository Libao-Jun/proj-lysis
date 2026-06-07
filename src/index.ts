/**
 * proj-lysis — 代码统计分析工具
 *
 * 按文件扩展名统计项目的文件数量、代码行数、注释行数、空白行数及占比。
 * 纯 TypeScript 实现，零外部依赖，仅使用 Node.js 原生模块。
 *
 * @example
 * ```ts
 * import { analyze } from "proj-lysis";
 * const result = analyze({ directory: "./src" });
 * ```
 *
 * @example
 * ```bash
 * npx proj-lysis --dir ./src --sort desc -o report.json
 * ```
 *
 * @module proj-lysis
 */

// 核心函数 + 预设常量
export { analyze, FRONTEND_PRESET } from "./core.js";

// 类型
export type {
  AnalysisResult,
  AnalyzeOptions,
  ExtensionStats,
} from "./types.js";
