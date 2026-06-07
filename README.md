# proj-lysis

> proj = project（项目），lysis = analysis（分析）。基于 Node.js 的代码统计分析工具 — 按文件类型统计文件数、体积、代码/注释/空白行数及占比。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-≥16-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

`proj-lysis` 是 [magic-analyzer](https://gitee.com/giteeHumor/magic-analyzer) 的 TypeScript 重构版，零外部依赖，仅使用 Node.js 原生模块。

## ✨ 特性

- 🎯 **零依赖** — 仅使用 `fs`、`path` 等 Node.js 原生模块
- 📊 **多维度统计** — 文件数 / 体积 / 代码行 / 注释行 / 空白行
- 📦 **中英双语报告** — Markdown 格式，中文和 English 两种表头
- 📏 **文件体积明细** — 单个文件体积 + 同类文件聚合统计
- 🎛️ **双排除配置** — `preset`（预设，可覆盖）+ `exclude`（自定义追加）
- 📝 **`.gitignore` 支持** — 自动读取项目的 `.gitignore` 规则
- 🌐 **跨平台** — 统一处理 Windows / Linux / macOS 路径
- 🔌 **双模块** — 同时提供 ESM 和 CJS 产物
- 📘 **完整类型** — 构建生成 `.d.ts` 类型声明文件

## 📦 安装

```bash
npm install proj-lysis
```

## 🚀 使用

### 命令行

```bash
# 分析当前目录（使用默认预设排除）
npx proj-lysis

# 分析指定目录 + 自定义排除
npx proj-lysis --dir ./src --exclude test,__tests__,fixtures

# 覆盖预设排除
npx proj-lysis --preset node_modules,dist,.git

# 不使用预设
npx proj-lysis --preset "" --exclude temp

# 按代码行数降序 + 自定义 JSON 输出
npx proj-lysis --dir ./src --sort-field codeLines --sort desc --output custom.json

# 按代码占比升序
npx proj-lysis --dir ./src --sort-field codePercentage --sort asc

# 不读取 .gitignore
npx proj-lysis --no-gitignore
```

### 编程方式

```ts
import { analyze, FRONTEND_PRESET } from "proj-lysis";

const result = analyze({
  directory: "./src",           // 要分析的目录
  preset: FRONTEND_PRESET,      // 预设排除（默认值，可覆盖）
  exclude: ["test", "mock"],    // 自定义排除（追加到预设之后）
  excludeExtensions: ["xml"],   // 额外排除的扩展名
  sortField: "codeLines",       // "files" | "codeLines" | "codePercentage"
  sortOrder: "desc",            // "desc" | "asc"
  outputPath: null,             // 自定义 JSON 路径
  respectGitignore: true,       // 是否读取 .gitignore
});

// result.ts = { files: 5, bytes: 27350, totalLines: 750, codeLines: 509, ... }
```

### Vite 插件集成

```ts
// vite.config.ts
import { defineConfig } from 'vite';

function projLysisPlugin() {
  return {
    name: 'proj-lysis',
    apply: 'build' as const,
    async buildStart() {
      const { analyze } = await import('proj-lysis');
      analyze({
        directory: '.',             // 分析整个项目，报告输出到 ./proj-lysis/
        sortField: 'codeLines',
        sortOrder: 'desc',
      });
    },
  };
}

export default defineConfig({
  plugins: [projLysisPlugin()],
});
```

> 💡 **`directory` 与输出目录的关系**：分析结果始终写入 `{directory}/proj-lysis/`。
>
> | `directory` | 分析范围 | 输出目录 |
> |-------------|----------|----------|
> | `"."` | 整个项目（推荐） | `./proj-lysis/` ← 项目根目录 |
> | `"./src"` | 仅 src 目录 | `./src/proj-lysis/` ← src 子目录 |

## 📋 分析结果

运行后，在**被分析目录**下生成 `proj-lysis/` 文件夹：

```
your-project/
└── proj-lysis/
    ├── analysis.json   ← JSON 数据（前端可直接 fetch）
    ├── report-zh.md    ← 代码统计报告（中文表头）
    ├── report-en.md    ← Code statistics report（English headers）
    ├── size-zh.md      ← 文件体积统计（中文，含单个文件明细）
    └── size-en.md      ← File size statistics（English, per-file details）
```

### analysis.json 示例

```json
{
  "ts": {
    "files": 5,
    "bytes": 27350,
    "totalLines": 750,
    "codeLines": 509,
    "commentLines": 133,
    "blankLines": 108,
    "filePercentage": "100.00%",
    "codePercentage": "100.00%",
    "sizePercentage": "100.00%"
  }
}
```

### 代码统计报告（report-*.md）

表格按 `sortField` 指定的维度排序，默认按文件数降序。

| 中文表头 | English Header |
|----------|---------------|
| 文件类型 | File Type |
| 文件数 | Files |
| 体积 | Size |
| 总行数 | Total Lines |
| 代码行 | Code Lines |
| 注释行 | Comment Lines |
| 空白行 | Blank Lines |
| 文件占比 | File % |
| 代码占比 | Code % |
| 体积占比 | Size % |

### 文件体积统计（size-*.md）

同样按 `sortField` 排序。包含两部分：

1. **同类文件体积汇总** — 按扩展名聚合，含文件数/总体积/平均体积/体积占比
2. **单个文件体积明细** — 按扩展名分组，列出每个文件的路径和体积（降序排列）

## ⚙️ 排除配置（两项）

### 1. preset — 预设排除

前端项目中常见的不参与统计的目录/文件，默认值如下：

`node_modules`, `.git`, `.svn`, `dist`, `build`, `.next`, `.nuxt`, `.output`, `out`, `public`, `static`, `assets`, `coverage`, `.nyc_output`, `.vscode`, `.idea`, `.DS_Store`, `Thumbs.db`, `.cache`, `.temp`, `tmp`, `.lock`, `.gitignore`, `.npmrc`, `.env`, `docker`, `__pycache__`,`.agents`,`.claude`, `proj-lysis`

- 传入自定义数组 → 完全覆盖默认预设
- 传入 `[]` → 不使用任何预设

### 2. exclude — 自定义排除

用户额外不想统计的目录/文件，**子串匹配**，始终追加在预设之后。

```ts
analyze({
  preset: ["node_modules", "dist"],  // 覆盖预设
  exclude: ["test", "mock"],         // 自定义追加
});
```

最终排除 = `(preset ?? FRONTEND_PRESET) + exclude + .gitignore`

## ⚙️ API

### analyze(options)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `directory` | `string` | **必填** | 要分析的目录路径 |
| `preset` | `string[]` | `FRONTEND_PRESET` | 预设排除项，覆盖默认值 |
| `exclude` | `string[]` | `[]` | 自定义排除项，追加到预设之后 |
| `excludeExtensions` | `string[]` | `[]` | 额外排除的文件扩展名 |
| `sortField` | `"files" \| "codeLines" \| "codePercentage"` | `"files"` | 排序维度 |
| `sortOrder` | `"asc" \| "desc"` | `"desc"` | 排序方向 |
| `outputPath` | `string \| null` | `null` | 自定义 JSON 路径 |
| `respectGitignore` | `boolean` | `true` | 是否读取 `.gitignore` |

### 默认跳过的文件类型

图片、字体、音视频、压缩包、二进制文件等约 40 种类型始终被跳过。可通过 `excludeExtensions` 追加。

### Windows 含中文路径注意事项

若项目路径含非 ASCII 字符（如中文），`npx proj-lysis` 可能因 pnpm 生成的 `.cmd` 文件编码问题而失败。使用以下方式替代：

```bash
# 方式一：直接调用 node（推荐）
node ./node_modules/proj-lysis/dist/cli.mjs --dir .

# 方式二：通过 bin 启动器
node ./node_modules/proj-lysis/bin/proj-lysis.mjs --dir .
```

## 🔧 开发

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发运行
pnpm build      # 构建（生成 .js + .d.ts）
pnpm test       # 运行测试（31 项）
pnpm typecheck  # 类型检查
```

技术栈：**TypeScript** + **rolldown** + **pnpm** + **Node.js 原生测试**

## 📝 更新日志

参见 [CHANGELOG.md](./CHANGELOG.md)

## 📄 License

MIT © newborn_calf
