/**
 * @file 模块依赖分析器
 * @description 分析代码中的模块依赖关系
 * @module analyzer/structure/module-analyzer
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/structure/README.md} - 代码结构分析文档
 */

import * as path from "path";
import { Finding, SourceLocation } from "../types";

/**
 * 导入信息接口
 */
interface ImportInfo {
  /** 导入的模块路径 */
  path: string;
  /** 导入的位置 */
  location: SourceLocation;
  /** 导入方式：'import', 'require', 'dynamic' */
  type: "import" | "require" | "dynamic";
  /** 是否是相对路径 */
  isRelative: boolean;
}

/**
 * 分析AST中的模块依赖
 * @param ast 抽象语法树
 * @param filePath 当前文件路径
 * @param debugMode 是否开启调试模式
 * @returns 依赖模块路径数组
 */
export function analyzeModuleDependencies(
  ast: any,
  filePath: string,
  debugMode: boolean
): string[] {
  if (debugMode) {
    console.log(`[Debug][ModuleAnalyzer] 开始分析文件依赖: ${filePath}`);
  }
  // 提取所有导入语句
  const imports = extractImports(ast.rootNode, debugMode);

  if (debugMode) {
    console.log(
      `[Debug][ModuleAnalyzer] 文件 ${filePath} 提取到 ${imports.length} 个原始导入。`
    );
  }

  // 返回依赖路径数组
  return imports.map((importInfo) => importInfo.path);
}

/**
 * 从AST中提取导入语句
 * @param node AST节点
 * @param debugMode 是否开启调试模式
 * @returns 导入信息列表
 */
function extractImports(node: any, debugMode: boolean): ImportInfo[] {
  const imports: ImportInfo[] = [];

  if (!node) return imports;

  // 如果当前节点是导入语句
  if (isImportNode(node)) {
    if (debugMode) {
      console.log(
        `[Debug][ModuleAnalyzer] 发现导入节点，类型: ${node.type}, 文本: ${node.text}`
      );
    }
    const importInfo = extractImportInfo(node, debugMode);
    if (importInfo) {
      imports.push(importInfo);
    }
  }

  // 递归查找所有子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    imports.push(...extractImports(child, debugMode));
  }

  return imports;
}

/**
 * 判断节点是否是导入语句
 * @param node AST节点
 * @returns 是否是导入语句
 */
function isImportNode(node: any): boolean {
  const type = node.type;
  return (
    type === "import_statement" ||
    type === "import_declaration" ||
    (type === "call_expression" && isRequireCallNode(node)) ||
    (type === "await_expression" && isDynamicImportNode(node.child(0)))
  );
}

/**
 * 判断节点是否是require调用
 * @param node AST节点
 * @returns 是否是require调用
 */
function isRequireCallNode(node: any): boolean {
  try {
    const funcName = node.child(0)?.text;
    return funcName === "require";
  } catch (error) {
    return false;
  }
}

/**
 * 判断节点是否是动态导入
 * @param node AST节点
 * @returns 是否是动态导入
 */
function isDynamicImportNode(node: any): boolean {
  try {
    return node.type === "import";
  } catch (error) {
    return false;
  }
}

/**
 * 从导入节点提取导入信息
 * @param node 导入节点
 * @param debugMode 是否开启调试模式
 * @returns 导入信息
 */
function extractImportInfo(node: any, debugMode: boolean): ImportInfo | null {
  try {
    let importPath = "";
    let importType: "import" | "require" | "dynamic" = "import";

    if (
      node.type === "import_statement" ||
      node.type === "import_declaration"
    ) {
      // 处理 import ... from '...' 语句
      const stringNode = findStringLiteral(node);
      if (stringNode) {
        importPath = extractStringLiteralValue(stringNode);
      }
      importType = "import";
    } else if (node.type === "call_expression" && isRequireCallNode(node)) {
      // 处理 require('...') 调用
      const args = findChildByType(node, "arguments");
      if (args && args.childCount > 0) {
        const stringNode = findStringLiteral(args.child(0));
        if (stringNode) {
          importPath = extractStringLiteralValue(stringNode);
        }
      }
      importType = "require";
    } else if (node.type === "await_expression") {
      // 处理 await import('...') 语句
      const importCall = node.child(0);
      if (importCall && importCall.type === "import") {
        const args = findChildByType(importCall, "arguments");
        if (args && args.childCount > 0) {
          const stringNode = findStringLiteral(args.child(0));
          if (stringNode) {
            importPath = extractStringLiteralValue(stringNode);
          }
        }
      }
      importType = "dynamic";
    }

    if (!importPath) {
      return null;
    }

    // 判断是否是相对路径
    const isRelative = importPath.startsWith(".") || importPath.startsWith("/");

    // 获取位置信息
    const location: SourceLocation = {
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };

    return {
      path: importPath,
      location,
      type: importType,
      isRelative,
    };
  } catch (error) {
    console.error("提取导入信息失败:", error);
    return null;
  }
}

/**
 * 在节点中查找字符串字面量
 * @param node AST节点
 * @returns 字符串字面量节点或null
 */
function findStringLiteral(node: any): any {
  if (!node) return null;

  if (node.type === "string" || node.type === "string_literal") {
    return node;
  }

  // 递归查找所有子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    const result = findStringLiteral(child);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 提取字符串字面量的值
 * @param node 字符串字面量节点
 * @returns 字符串值
 */
function extractStringLiteralValue(node: any): string {
  const text = node.text || "";
  // 去除引号
  return text.replace(/^['"]|['"]$/g, "");
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
