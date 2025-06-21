/**
 * @file 函数分析器
 * @description 分析代码中的函数和方法
 * @module analyzer/structure/function-analyzer
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/structure/README.md} - 代码结构分析文档
 */

import { Finding, SourceLocation, Severity } from "../types";
import { calculateCyclomaticComplexity } from "../metrics/cyclomatic-complexity";
import { calculateCognitiveComplexity } from "../metrics/cognitive-complexity";

/**
 * 函数信息接口
 */
export interface FunctionInfo {
  name: string;
  location: SourceLocation;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  parameterCount: number;
}

/**
 * 分析AST中的函数和方法
 * @param ast 抽象语法树
 * @returns 函数信息列表
 */
export function analyzeFunctions(ast: any): FunctionInfo[] {
  return extractFunctions(ast.rootNode);
}

/**
 * 从AST中提取函数信息
 * @param node AST节点
 * @returns 函数信息列表
 */
function extractFunctions(node: any): FunctionInfo[] {
  if (!node) return [];

  const functions: FunctionInfo[] = [];

  // 检查当前节点是否是函数
  if (isFunctionNode(node)) {
    const functionInfo = extractFunctionInfo(node);
    if (functionInfo) {
      functions.push(functionInfo);
    }
  }

  // 递归遍历子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    functions.push(...extractFunctions(child));
  }

  return functions;
}

/**
 * 判断节点是否是函数定义
 * @param node AST节点
 * @returns 是否是函数定义
 */
function isFunctionNode(node: any): boolean {
  const type = node.type;
  return (
    type === "function_declaration" ||
    type === "function_expression" ||
    type === "arrow_function" ||
    type === "method_definition"
  );
}

/**
 * 从函数节点提取函数信息
 * @param node 函数节点
 * @returns 函数信息
 */
function extractFunctionInfo(node: any): FunctionInfo | null {
  try {
    // 尝试获取函数名
    let name = "anonymous";
    if (node.type === "function_declaration") {
      const nameNode = findChildByType(node, "identifier");
      if (nameNode) {
        name = nameNode.text;
      }
    } else if (node.type === "method_definition") {
      const nameNode = findChildByFieldName(node, "name");
      if (nameNode) {
        name = nameNode.text;
      }
    }

    // 获取参数列表
    const parameterList =
      findChildByType(node, "formal_parameters") ||
      findChildByFieldName(node, "parameters");
    const parameterCount = parameterList ? countParameters(parameterList) : 0;

    // 获取函数体
    const body =
      findChildByType(node, "statement_block") ||
      findChildByFieldName(node, "body");

    // 计算复杂度
    const cyclomaticComplexity = calculateCyclomaticComplexity({
      rootNode: node,
    });
    const cognitiveComplexity = calculateCognitiveComplexity({
      rootNode: node,
    });

    // 获取位置信息
    const location: SourceLocation = {
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };

    return {
      name,
      location,
      cyclomaticComplexity,
      cognitiveComplexity,
      parameterCount,
    };
  } catch (error) {
    console.error("提取函数信息失败:", error);
    return null;
  }
}

/**
 * 计算参数数量
 * @param parameterListNode 参数列表节点
 * @returns 参数数量
 */
function countParameters(parameterListNode: any): number {
  let count = 0;

  // 遍历参数列表中的子节点，计算参数数量
  for (let i = 0; i < parameterListNode.childCount; i++) {
    const child = parameterListNode.child(i);
    if (
      child.type === "identifier" ||
      child.type === "required_parameter" ||
      child.type === "optional_parameter" ||
      child.type === "rest_parameter"
    ) {
      count++;
    }
  }

  return count;
}

/**
 * 根据类型查找子节点
 * @param node 父节点
 * @param type 要查找的类型
 * @returns 找到的节点或null
 */
function findChildByType(node: any, type: string): any {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type === type) {
      return child;
    }
  }
  return null;
}

/**
 * 根据字段名查找子节点
 * @param node 父节点
 * @param fieldName 字段名
 * @returns 找到的节点或null
 */
function findChildByFieldName(node: any, fieldName: string): any {
  try {
    // 使用tree-sitter的childForFieldName方法
    if (typeof node.childForFieldName === "function") {
      return node.childForFieldName(fieldName);
    }
  } catch (error) {
    console.warn(`字段名查找失败，回退到遍历: ${error}`);
  }

  // 回退到遍历所有子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (
      child.type === fieldName ||
      (child.type === "property_identifier" && child.text === fieldName)
    ) {
      return child;
    }
  }
  return null;
}

/**
 * 根据圈复杂度确定严重性
 * @param complexity 圈复杂度值
 * @returns 严重性级别
 */
function getSeverityForCyclomaticComplexity(complexity: number): Severity {
  if (complexity > 25) return "error";
  if (complexity > 15) return "warning";
  return "info";
}

/**
 * 根据认知复杂度确定严重性
 * @param complexity 认知复杂度值
 * @returns 严重性级别
 */
function getSeverityForCognitiveComplexity(complexity: number): Severity {
  if (complexity > 30) return "error";
  if (complexity > 20) return "warning";
  return "info";
}
