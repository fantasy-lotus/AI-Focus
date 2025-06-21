/**
 * @file 可维护性指数计算
 * @description 实现代码可维护性指数的计算，这是一个综合性指标
 * @module analyzer/metrics/maintainability-index
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/metrics/README.md} - 代码复杂度模块文档
 */

import { IComplexityMetric } from "../types";
import { calculateCyclomaticComplexity } from "./cyclomatic-complexity";

/**
 * 可维护性指数计算实现
 * 基于代码的圈复杂度、代码行数和Halstead复杂度计算
 * 注意：这个实现需要源代码文本，不仅仅是AST
 */
export class MaintainabilityIndexMetric {
  /**
   * 计算AST的可维护性指数
   * @param ast 抽象语法树
   * @param sourceCode 源代码文本
   * @returns 可维护性指数值 (0-100)
   */
  calculate(ast: any, sourceCode: string): number {
    // 获取圈复杂度
    const cyclomaticComplexity = calculateCyclomaticComplexity(ast);

    // 计算代码行数
    const linesOfCode = this.countLinesOfCode(sourceCode);

    // 计算霍尔斯特德复杂度（简化实现）
    const halsteadVolume = this.calculateHalsteadVolume(sourceCode);

    // 计算可维护性指数
    // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
    let mi = 171;
    mi -= 5.2 * Math.log(halsteadVolume);
    mi -= 0.23 * cyclomaticComplexity;
    mi -= 16.2 * Math.log(linesOfCode);

    // 归一化到0-100范围
    mi = Math.max(0, Math.min(100, mi));

    return Math.round(mi);
  }

  /**
   * 计算代码行数
   * @param sourceCode 源代码文本
   * @returns 代码行数（忽略空行和注释）
   */
  private countLinesOfCode(sourceCode: string): number {
    if (!sourceCode) return 0;

    // 分割成行
    const lines = sourceCode.split("\n");

    // 过滤掉空行和纯注释行（简化实现）
    const codeLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed === "") return false; // 忽略空行
      if (trimmed.startsWith("//")) return false; // 忽略单行注释
      if (trimmed.startsWith("/*") && trimmed.endsWith("*/")) return false; // 忽略单行多行注释
      return true;
    });

    return codeLines.length || 1; // 至少返回1，避免对数计算问题
  }

  /**
   * 计算霍尔斯特德复杂度（简化实现）
   * @param sourceCode 源代码文本
   * @returns 霍尔斯特德体积
   */
  private calculateHalsteadVolume(sourceCode: string): number {
    if (!sourceCode) return 1;

    // 霍尔斯特德体积的简化计算
    // 实际应计算唯一操作数和运算符的数量

    // 提取所有标识符和操作符（简化）
    const tokens = sourceCode
      .replace(/\/\/.*$/gm, "") // 移除单行注释
      .replace(/\/\*[\s\S]*?\*\//gm, "") // 移除多行注释
      .replace(/\s+/g, " ") // 标准化空白
      .replace(/["'`].*?["'`]/g, '"string"') // 将所有字符串替换为"string"
      .split(/([{}()\[\];,.<>~\-+*/%&|^!=?:])/) // 按照分隔符分割
      .filter(Boolean); // 移除空字符串

    // 唯一操作数和运算符
    const uniqueOperators = new Set();
    const uniqueOperands = new Set();

    // 分类操作符和操作数（简化）
    const operators = [
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      ".",
      ",",
      ";",
      "+",
      "-",
      "*",
      "/",
      "%",
      "&",
      "|",
      "^",
      "!",
      "=",
      "<",
      ">",
      "?",
      ":",
      "~",
    ];
    for (const token of tokens) {
      if (operators.includes(token)) {
        uniqueOperators.add(token);
      } else if (token.trim() !== "") {
        uniqueOperands.add(token);
      }
    }

    const n1 = uniqueOperators.size || 1;
    const n2 = uniqueOperands.size || 1;
    const N1 = tokens.filter((t) => operators.includes(t)).length || 1;
    const N2 =
      tokens.filter((t) => !operators.includes(t) && t.trim() !== "").length ||
      1;

    // 计算程序长度和词汇量
    const programLength = N1 + N2;
    const vocabulary = n1 + n2;

    // 计算体积
    const volume = programLength * Math.log2(vocabulary);

    return Math.max(1, volume); // 保证至少为1
  }
}

/**
 * 计算代码的可维护性指数
 * @param ast 抽象语法树
 * @param sourceCode 源代码文本
 * @returns 可维护性指数值 (0-100)
 */
export function calculateMaintainabilityIndex(
  ast: any,
  sourceCode: string
): number {
  const metric = new MaintainabilityIndexMetric();
  return metric.calculate(ast, sourceCode);
}
