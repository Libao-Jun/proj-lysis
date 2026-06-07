/**
 * proj-lysis 类型定义
 */

/** 单个扩展名的统计信息 */
export interface ExtensionStats {
  /** 文件数量 */
  files: number;
  /** 文件总体积（字节） */
  bytes: number;
  /** 总物理行数 */
  totalLines: number;
  /** 代码行数 */
  codeLines: number;
  /** 注释行数 */
  commentLines: number;
  /** 空白行数 */
  blankLines: number;
  /** 文件数占比 */
  filePercentage: string;
  /** 代码量占比 */
  codePercentage: string;
  /** 体积占比 */
  sizePercentage: string;
}

/** 分析结果 */
export type AnalysisResult = Record<string, ExtensionStats>;

/** 排序维度 */
export type SortField = "files" | "codeLines" | "codePercentage";

/** 文件行统计（内部使用） */
export interface FileLineStats {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

/** 分析选项 */
export interface AnalyzeOptions {
  /** 扫描的根目录，必填 */
  directory: string;

  /**
   * 预设排除（前端项目中常见的不参与统计的目录/文件）。
   * 有合理的默认值，传入自定义数组则完全覆盖默认预设。
   * 传入空数组 `[]` 表示不使用任何预设。
   */
  preset?: string[];

  /**
   * 自定义排除（用户额外不想统计的目录/文件）。
   * 子串匹配，始终追加在预设排除之后。
   */
  exclude?: string[];

  /** 额外排除的文件扩展名（不含点号） */
  excludeExtensions?: string[];
  /** 排序字段，默认 "files" */
  sortField?: SortField;
  /** 排序方向，默认 "desc" */
  sortOrder?: "asc" | "desc";
  /** JSON 输出路径，默认写到 {directory}/proj-lysis/analysis.json */
  outputPath?: string | null;
  /** 是否读取 .gitignore，默认 true */
  respectGitignore?: boolean;
}
