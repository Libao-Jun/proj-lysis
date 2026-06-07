/**
 * 核心分析引擎测试
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, FRONTEND_PRESET } from "../src/core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

function cleanup() {
  for (const f of ["test-output.json", "analyzer.json"]) {
    const p = path.resolve(f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const outDir = path.join(fixtures, "proj-lysis");
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
}
after(cleanup);

describe("analyze", () => {
  it("使用默认预设 + 自定义排除应正确分析", () => {
    const result = analyze({
      directory: fixtures,
      exclude: [],                // 自定义排除（空）
      respectGitignore: false,
    });

    assert.ok(result.ts != null);
    assert.ok(result.js != null);
    assert.ok(result.json != null);
    assert.equal(result.ts!.files, 1);
    assert.equal(result.js!.files, 1);
  });

  it("百分比之和应为 100%", () => {
    const result = analyze({
      directory: fixtures,
      respectGitignore: false,
    });

    let fps = 0, cps = 0;
    for (const s of Object.values(result)) {
      fps += parseFloat(s.filePercentage);
      cps += parseFloat(s.codePercentage);
    }
    assert.ok(Math.abs(fps - 100) < 0.1, `文件占比和=${fps}`);
    assert.ok(Math.abs(cps - 100) < 0.1, `代码占比和=${cps}`);
  });

  it("按代码行数降序排序应正确", () => {
    const result = analyze({
      directory: fixtures,
      sortField: "codeLines",
      sortOrder: "desc",
      respectGitignore: false,
    });
    const counts = Object.values(result).map((s) => s.codeLines);
    for (let i = 1; i < counts.length; i++) {
      assert.ok(counts[i - 1]! >= counts[i]!);
    }
  });

  it("按代码占比升序排序应正确", () => {
    const result = analyze({
      directory: fixtures,
      sortField: "codePercentage",
      sortOrder: "asc",
      respectGitignore: false,
    });
    const pcts = Object.values(result).map((s) => parseFloat(s.codePercentage));
    for (let i = 1; i < pcts.length; i++) {
      assert.ok(pcts[i - 1]! <= pcts[i]!);
    }
  });

  it("升序排序应正确", () => {
    const result = analyze({
      directory: fixtures,
      sortOrder: "asc",
      respectGitignore: false,
    });
    const counts = Object.values(result).map((s) => s.files);
    for (let i = 1; i < counts.length; i++) {
      assert.ok(counts[i - 1]! <= counts[i]!);
    }
  });

  it("预设排除 + 自定义排除应同时生效", () => {
    const result = analyze({
      directory: fixtures,
      preset: ["node_modules"],           // 覆盖默认预设
      exclude: ["fixtures"],              // 自定义追加
      respectGitignore: false,
    });
    const total = Object.values(result).reduce((s, v) => s + v.files, 0);
    assert.equal(total, 0, "fixtures 应被自定义排除拦截");
  });

  it("空预设 [] 应不使用任何默认排除", () => {
    const result = analyze({
      directory: fixtures,
      preset: [],                        // 空预设
      exclude: [],
      respectGitignore: false,
    });
    // fixtures 不应被排除，所以应有文件
    assert.ok(Object.keys(result).length > 0);
  });

  it("应生成 proj-lysis/ 目录下的 JSON 和中英 Markdown", () => {
    analyze({ directory: fixtures, respectGitignore: false });

    const jsonPath = path.join(fixtures, "proj-lysis", "analysis.json");
    const zhPath = path.join(fixtures, "proj-lysis", "report-zh.md");
    const enPath = path.join(fixtures, "proj-lysis", "report-en.md");

    assert.ok(fs.existsSync(jsonPath), "analysis.json 应存在");
    assert.ok(fs.existsSync(zhPath), "report-zh.md 应存在");
    assert.ok(fs.existsSync(enPath), "report-en.md 应存在");

    // 验证中文表头
    const zh = fs.readFileSync(zhPath, "utf8");
    assert.ok(zh.includes("文件类型"));
    assert.ok(zh.includes("代码统计报告"));

    // 验证英文表头
    const en = fs.readFileSync(enPath, "utf8");
    assert.ok(en.includes("File Type"));
    assert.ok(en.includes("Code Statistics Report"));
  });

  it("无全局状态污染（多次调用独立）", () => {
    cleanup();
    const r1 = analyze({ directory: fixtures, respectGitignore: false });
    const r2 = analyze({ directory: fixtures, respectGitignore: false });
    assert.deepEqual(r1, r2);
  });

  it("FRONTEND_PRESET 应包含常见前端排除项", () => {
    assert.ok(FRONTEND_PRESET.includes("node_modules"));
    assert.ok(FRONTEND_PRESET.includes(".git"));
    assert.ok(FRONTEND_PRESET.includes("dist"));
    assert.ok(FRONTEND_PRESET.includes(".lock"));
    assert.ok(FRONTEND_PRESET.includes(".env"));
    assert.ok(FRONTEND_PRESET.includes("coverage"));
  });

  it("应正确统计文件体积（bytes）", () => {
    const result = analyze({ directory: fixtures, respectGitignore: false });

    // 每种类型都应有体积
    for (const s of Object.values(result)) {
      assert.ok(s.bytes > 0, `bytes 应大于 0: ${s.bytes}`);
    }

    // 体积百分比之和应接近 100%
    let sps = 0;
    for (const s of Object.values(result)) {
      sps += parseFloat(s.sizePercentage);
    }
    assert.ok(Math.abs(sps - 100) < 0.2, `体积占比和=${sps}`);
  });
});
