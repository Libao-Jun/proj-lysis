#!/usr/bin/env node
/**
 * proj-lysis 启动器
 * 使用 import.meta.url 相对路径加载真正的 CLI，减少中文路径编码问题的影响范围
 */
import { main } from "../dist/cli.mjs";
main(process.argv.slice(2));
