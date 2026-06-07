// JavaScript 测试文件
// 用于测试 .js 文件的统计

/**
 * 乘法函数
 */
function multiply(a, b) {
  return a * b;
}

// 单行注释
const VERSION = "1.0.0";

/**
 * 类示例
 */
class Calculator {
  constructor() {
    this.value = 0;
  }

  add(n) {
    this.value += n;
    return this;
  }
}

module.exports = { multiply, Calculator };
