/**
 * 工具函数测试
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFileExt,
  isBinaryExt,
  countLines,
  isExcluded,
  parseGitignore,
  sortResult,
} from "../src/utils.js";

// ─── getFileExt ───────────────────────────────────────────────────

describe("getFileExt", () => {
  it("应正确提取普通扩展名", () => {
    assert.equal(getFileExt("src/app.ts"), "ts");
    assert.equal(getFileExt("file.js"), "js");
    assert.equal(getFileExt("style.CSS"), "css");
  });
  it("双扩展名应返回最后一个", () => {
    assert.equal(getFileExt("file.tar.gz"), "gz");
    assert.equal(getFileExt("component.vue.ts"), "ts");
  });
  it("无扩展名文件应返回空字符串", () => {
    assert.equal(getFileExt("Makefile"), "");
    assert.equal(getFileExt("Dockerfile"), "");
  });
  it("点文件应正确提取", () => {
    assert.equal(getFileExt(".env"), "env");
    assert.equal(getFileExt(".npmrc"), "npmrc");
    assert.equal(getFileExt(".gitignore"), "gitignore");
  });
});

// ─── isBinaryExt ──────────────────────────────────────────────────

describe("isBinaryExt", () => {
  it("图片/字体/压缩包应为二进制", () => {
    assert.equal(isBinaryExt("png", []), true);
    assert.equal(isBinaryExt("jpg", []), true);
    assert.equal(isBinaryExt("woff2", []), true);
    assert.equal(isBinaryExt("zip", []), true);
  });
  it("代码文件不应为二进制", () => {
    assert.equal(isBinaryExt("ts", []), false);
    assert.equal(isBinaryExt("js", []), false);
    assert.equal(isBinaryExt("py", []), false);
  });
  it("用户额外排除应生效", () => {
    assert.equal(isBinaryExt("xml", ["xml"]), true);
    assert.equal(isBinaryExt("xml", []), false);
  });
});

// ─── countLines ───────────────────────────────────────────────────

describe("countLines", () => {
  it("应正确统计 JS 代码行数", () => {
    const result = countLines(
      "// 注释\nconst a = 1;\n\n// 注释2\nconst b = 2;\n",
      "js",
    );
    assert.equal(result.totalLines, 5);
    assert.equal(result.codeLines, 2);
    assert.equal(result.commentLines, 2);
    assert.equal(result.blankLines, 1);
  });
  it("应正确统计 Python 代码行数", () => {
    const result = countLines("# 注释\nx = 1\n\ny = 2\n", "py");
    assert.equal(result.totalLines, 4);
    assert.equal(result.codeLines, 2);
    assert.equal(result.commentLines, 1);
    assert.equal(result.blankLines, 1);
  });
  it("空内容应全返回 0", () => {
    const result = countLines("", "ts");
    assert.equal(result.totalLines, 0);
    assert.equal(result.codeLines, 0);
  });
  it("应正确统计块注释", () => {
    const result = countLines(
      "/* 块注释\n   第二行\n   第三行 */\nconst x = 1;\n",
      "ts",
    );
    assert.equal(result.totalLines, 4);
    assert.equal(result.codeLines, 1);
    assert.equal(result.commentLines, 3);
  });
  it("末尾换行符不应多算一行", () => {
    const result = countLines("const a = 1;\n", "ts");
    assert.equal(result.totalLines, 1);
  });
});

// ─── isExcluded ───────────────────────────────────────────────────

describe("isExcluded", () => {
  it("子串匹配应正确", () => {
    assert.equal(isExcluded("project/node_modules/pkg", ["node_modules"]), true);
    assert.equal(isExcluded("project/src/app.ts", ["node_modules"]), false);
  });
  it("Windows 路径应正确标准化", () => {
    assert.equal(isExcluded("C:\\project\\node_modules\\pkg", ["node_modules"]), true);
  });
  it("空排除列表应不匹配", () => {
    assert.equal(isExcluded("any/file.ts", []), false);
  });
});

// ─── parseGitignore ───────────────────────────────────────────────

describe("parseGitignore", () => {
  it("应滤除注释和空行", () => {
    const result = parseGitignore("node_modules\ndist\n# 注释\n\n.env\n");
    assert.deepEqual(result, ["node_modules", "dist", ".env"]);
  });
});

// ─── sortResult ───────────────────────────────────────────────────

describe("sortResult", () => {
  it("按文件数降序", () => {
    const input = { js: { files: 5 }, ts: { files: 10 }, css: { files: 3 } };
    const result = sortResult(input as any, "files", "desc");
    assert.deepEqual(Object.keys(result), ["ts", "js", "css"]);
  });
  it("按文件数升序", () => {
    const input = { js: { files: 5 }, ts: { files: 10 } };
    const result = sortResult(input as any, "files", "asc");
    assert.deepEqual(Object.keys(result), ["js", "ts"]);
  });
  it("按代码行数降序", () => {
    const input = { js: { codeLines: 200 }, ts: { codeLines: 500 }, css: { codeLines: 100 } };
    const result = sortResult(input as any, "codeLines", "desc");
    assert.deepEqual(Object.keys(result), ["ts", "js", "css"]);
  });
  it("按代码占比降序", () => {
    const input = {
      js: { codePercentage: "20.00%" },
      ts: { codePercentage: "60.00%" },
      css: { codePercentage: "10.00%" },
    };
    const result = sortResult(input as any, "codePercentage", "desc");
    assert.deepEqual(Object.keys(result), ["ts", "js", "css"]);
  });
});
