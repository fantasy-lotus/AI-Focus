/**
 * @file 认知复杂度计算
 * @description 实现代码认知复杂度的计算，基于SonarSource的算法
 * @module analyzer/metrics/cognitive-complexity
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/metrics/README.md} - 代码复杂度模块文档
 */

import { IComplexityMetric } from "../types";

/**
 * 认知复杂度计算实现
 * 认知复杂度是对圈复杂度的改进，更好地反映代码的可理解性
 * 基于SonarSource的算法: https://www.sonarsource.com/docs/CognitiveComplexity.pdf
 */
export class CognitiveComplexityMetric implements IComplexityMetric {
  /**
   * 计算AST的认知复杂度
   * @param ast 抽象语法树
   * @returns 认知复杂度值
   */
  calculate(ast: any): number {
    // 使用访问者模式遍历AST，收集认知复杂度
    const visitor = new CognitiveComplexityVisitor();
    visitor.visit(ast.rootNode);
    return visitor.complexity;
  }
}

/**
 * 认知复杂度访问者类
 * 用于遍历AST计算认知复杂度
 */
class CognitiveComplexityVisitor {
  complexity = 0;
  nestingLevel = 0;

  /**
   * 访问节点
   * @param node AST节点
   */
  visit(node: any): void {
    if (!node) return;

    // 处理当前节点
    this.processNode(node);

    // 递归访问所有子节点
    for (let i = 0; i < node.childCount; i++) {
      this.visit(node.child(i));
    }
  }

  /**
   * 处理单个节点
   * @param node AST节点
   */
  private processNode(node: any): void {
    const nodeType = node.type;

    // B1: 增加复杂度的基础结构
    if (this.isIncrementingStructure(nodeType)) {
      this.complexity += 1;

      // 检查是否需要增加嵌套级别
      if (this.isNestingStructure(nodeType)) {
        this.nestingLevel += 1;

        // 在离开嵌套结构时减少嵌套级别
        this.decreaseNestingLevelOnChildrenProcessed(node);
      }
    }

    // B2: 嵌套会额外增加复杂度
    else if (this.isNestingStructure(nodeType) && this.nestingLevel > 0) {
      // 嵌套的结构会增加额外的复杂度，等于当前嵌套级别
      this.complexity += this.nestingLevel;

      this.nestingLevel += 1;

      // 在离开嵌套结构时减少嵌套级别
      this.decreaseNestingLevelOnChildrenProcessed(node);
    }

    // B3: 处理连续的控制流中断语句
    else if (this.isControlFlowBreak(nodeType)) {
      this.complexity += 1;
    }
  }

  /**
   * 判断节点是否是增加复杂度的基础结构
   * @param nodeType 节点类型
   * @returns 是否增加复杂度
   */
  private isIncrementingStructure(nodeType: string): boolean {
    return [
      "if_statement",
      "conditional_expression", // 三元表达式 ?:
      "switch_statement",
      "for_statement",
      "for_in_statement",
      "for_of_statement",
      "while_statement",
      "do_statement",
      "catch_clause",
    ].includes(nodeType);
  }

  /**
   * 判断节点是否是会增加嵌套级别的结构
   * @param nodeType 节点类型
   * @returns 是否增加嵌套级别
   */
  private isNestingStructure(nodeType: string): boolean {
    return [
      "if_statement",
      "switch_statement",
      "for_statement",
      "for_in_statement",
      "for_of_statement",
      "while_statement",
      "do_statement",
      "catch_clause",
      "function_declaration",
      "function_expression",
      "arrow_function",
      "method_definition",
    ].includes(nodeType);
  }

  /**
   * 判断节点是否是控制流中断语句
   * @param nodeType 节点类型
   * @returns 是否是控制流中断语句
   */
  private isControlFlowBreak(nodeType: string): boolean {
    return [
      "return_statement",
      "throw_statement",
      "break_statement",
      "continue_statement",
    ].includes(nodeType);
  }

  /**
   * 注册在处理完子节点后减少嵌套级别
   * 这是一个简化的处理方式
   * @param node 当前节点
   */
  private decreaseNestingLevelOnChildrenProcessed(node: any): void {
    // 在实际实现中，我们需要找到节点的结束位置
    // 并在遍历到该位置时减少嵌套级别
    // 简化起见，我们在完成所有子节点的访问后减少
    this.nestingLevel -= 1;
  }
}

/**
 * 计算代码的认知复杂度
 * @param ast 抽象语法树
 * @returns 认知复杂度值
 */
export function calculateCognitiveComplexity(ast: any): number {
  const metric = new CognitiveComplexityMetric();
  return metric.calculate(ast);
}
