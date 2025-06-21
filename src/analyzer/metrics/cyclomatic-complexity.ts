/**
 * @file 圈复杂度计算
 * @description 实现代码圈复杂度的计算
 * @module analyzer/metrics/cyclomatic-complexity
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/metrics/README.md} - 代码复杂度模块文档
 */

import { IComplexityMetric } from "../types";

/**
 * 圈复杂度计算实现
 * 圈复杂度基于代码中的控制流分支数量计算
 */
export class CyclomaticComplexityMetric implements IComplexityMetric {
  /**
   * 计算AST的圈复杂度
   * @param ast 抽象语法树
   * @returns 圈复杂度值
   */
  calculate(ast: any): number {
    // 基础复杂度为1
    let complexity = 1;

    // 递归遍历AST
    complexity += this.traverseNode(ast.rootNode);

    return complexity;
  }

  /**
   * 递归遍历AST节点计算圈复杂度
   * @param node AST节点
   * @returns 该节点及其子节点贡献的圈复杂度
   */
  private traverseNode(node: any): number {
    if (!node) return 0;

    let complexity = 0;

    // 检查节点类型，这些结构会增加圈复杂度
    const nodeType = node.type;

    // 控制语句: if, switch-case, for, while, do-while, catch, conditional (?:), logical &&, logical ||
    if (
      nodeType === "if_statement" ||
      nodeType === "switch_case" ||
      nodeType === "for_statement" ||
      nodeType === "for_in_statement" ||
      nodeType === "while_statement" ||
      nodeType === "do_statement" ||
      nodeType === "catch_clause" ||
      nodeType === "conditional_expression" ||
      (nodeType === "binary_expression" &&
        (node.operatorType === "&&" || node.operatorType === "||"))
    ) {
      // 每个控制流分支增加1的复杂度
      complexity += 1;
    }

    // 递归遍历所有子节点
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      complexity += this.traverseNode(child);
    }

    return complexity;
  }
}

/**
 * 计算代码的圈复杂度
 * @param ast 抽象语法树
 * @returns 圈复杂度值
 */
export function calculateCyclomaticComplexity(ast: any): number {
  const metric = new CyclomaticComplexityMetric();
  return metric.calculate(ast);
}
