/**
 * proj-lysis 命令行入口
 *
 * 用法: proj-lysis [选项]
 *
 * 排除配置分为两项：
 *   --preset, -p   预设排除（默认包含前端常见目录/文件，可覆盖）
 *   --exclude, -e  自定义排除（始终追加在预设之后）
 */
import { analyze, FRONTEND_PRESET } from "./core.js";
import type { AnalyzeOptions } from "./types.js";

/** 帮助信息 */
const HELP = `
proj-lysis — 代码统计分析工具

用法:
  proj-lysis [选项]

排除配置（两项）:
  --preset, -p <..>   预设排除，逗号分隔。覆盖默认预设，空字符串=不使用
  --exclude, -e <..>  自定义排除，逗号分隔。始终追加在预设之后

其他选项:
  --dir, -d <path>    分析的目录路径（默认: .）
  --output, -o <path> 输出 JSON 报告文件路径
  --sort, -s <order>       排序方向: asc | desc（默认: desc）
  --sort-field <field>     排序维度: files | codeLines | codePercentage（默认: files）
  --no-gitignore           不自动读取 .gitignore
  --help, -h               显示此帮助
  --version, -v            显示版本号

示例:
  proj-lysis
  proj-lysis -e test,__tests__
  proj-lysis -p node_modules,dist,.git
  proj-lysis --sort-field codeLines --sort asc     # 按代码行数升序
  proj-lysis --sort-field codePercentage --sort desc  # 按代码占比降序
`;

function printHelp() { console.log(HELP); }
function printVersion() { console.log("proj-lysis v2.0.0"); }

/** 解析逗号分隔列表，空字符串 → [] */
function parseList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  if (raw === "") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** 解析命令行参数 */
function parseArgs(argv: string[]): AnalyzeOptions | "help" | "version" {
  const opts: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    let k: string, v: string | undefined;

    if (a.startsWith("--") && a.includes("=")) {
      [k, v] = [a.slice(2, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
    } else if (a.startsWith("--")) {
      k = a.slice(2);
      v = argv[i + 1] && !argv[i + 1]!.startsWith("-") ? argv[++i] : undefined;
    } else if (a.startsWith("-") && a.length === 2) {
      const map: Record<string, string> = {
        d: "dir", e: "exclude", p: "preset",
        o: "output", s: "sort", h: "help", v: "version",
      };
      k = map[a.slice(1)] ?? a.slice(1);
      v = argv[i + 1] && !argv[i + 1]!.startsWith("-") ? argv[++i] : undefined;
    } else {
      continue;
    }

    if (k === "help" || k === "h") return "help";
    if (k === "version" || k === "v") return "version";
    if (k === "no-gitignore") { opts["no-gitignore"] = "true"; continue; }
    if (v !== undefined) opts[k] = v;
  }

  return {
    directory: opts["dir"] ?? ".",
    preset: parseList(opts["preset"]),
    exclude: parseList(opts["exclude"]),
    outputPath: opts["output"] ?? null,
    sortField: (opts["sort-field"] as any) ?? "files",
    sortOrder: (opts["sort"]?.toLowerCase() as "asc" | "desc") ?? "desc",
    respectGitignore: !opts["no-gitignore"],
  };
}

/** CLI 主函数（含控制台输出，供命令行用户使用） */
export function main(argv: string[]): void {
  if (argv.length === 0) { printHelp(); return; }

  const parsed = parseArgs(argv);
  if (parsed === "help") { printHelp(); return; }
  if (parsed === "version") { printVersion(); return; }

  try {
    const result = analyze(parsed);

    if (Object.keys(result).length === 0) {
      console.log("未找到可分析的代码文件。");
      return;
    }

    // 控制台表格输出
    console.table(result);

    let totalFiles = 0, totalBytes = 0, totalCode = 0, totalComment = 0, totalBlank = 0, totalAll = 0;
    for (const s of Object.values(result)) {
      totalFiles += s.files;
      totalBytes += s.bytes;
      totalCode += s.codeLines;
      totalComment += s.commentLines;
      totalBlank += s.blankLines;
      totalAll += s.totalLines;
    }

    const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

    console.log(
      `\n总计: ${totalFiles} 个文件, ${fmt(totalBytes)}, ${totalAll} 行 ` +
      `(代码 ${totalCode}, 注释 ${totalComment}, 空白 ${totalBlank})`,
    );

    // 输出文件路径
    const outDir = parsed.outputPath ?? `${parsed.directory}/proj-lysis/analysis.json`;
    console.error(`[proj-lysis] JSON 数据: ${outDir}`);
    console.error(`[proj-lysis] 代码统计: ${parsed.directory}/proj-lysis/report-zh.md`);
    console.error(`[proj-lysis] Code report: ${parsed.directory}/proj-lysis/report-en.md`);
    console.error(`[proj-lysis] 体积统计: ${parsed.directory}/proj-lysis/size-zh.md`);
    console.error(`[proj-lysis] Size report: ${parsed.directory}/proj-lysis/size-en.md`);
  } catch (err) {
    console.error("[proj-lysis] 分析失败:", err);
    process.exit(1);
  }
}

// 直接运行时执行
main(process.argv.slice(2));
