/**
 * @file 类分析器
 * @description 分析代码中的类结构和特性
 * @module analyzer/structure/class-analyzer
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/structure/README.md} - 代码结构分析文档
 */

import { Finding, SourceLocation, Severity } from "../types";

/**
 * 类信息接口
 */
export interface ClassInfo {
  name: string;
  location: SourceLocation;
  methodCount: number;
  propertyCount: number;
  staticMemberCount: number;
  superClass?: string;
  interfaces?: string[];
  methods: MethodInfo[];
}

/**
 * 方法信息接口
 */
export interface MethodInfo {
  name: string;
  location: SourceLocation;
  isStatic: boolean;
  isPrivate: boolean;
  isAsync: boolean;
  parameterCount: number;
}

/**
 * 分析AST中的类结构
 * @param ast 抽象语法树
 * @returns 类信息列表
 */
export function analyzeClasses(ast: any): ClassInfo[] {
  return extractClasses(ast.rootNode);
}

/**
 * 从AST中提取类信息
 * @param node AST节点
 * @returns 类信息列表
 */
function extractClasses(node: any): ClassInfo[] {
  if (!node) return [];

  const classes: ClassInfo[] = [];

  // 检查当前节点是否是类声明
  if (isClassNode(node)) {
    const classInfo = extractClassInfo(node);
    if (classInfo) {
      classes.push(classInfo);
    }
  }

  // 递归遍历子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    classes.push(...extractClasses(child));
  }

  return classes;
}

/**
 * 判断节点是否是类声明
 * @param node AST节点
 * @returns 是否是类声明
 */
function isClassNode(node: any): boolean {
  const type = node.type;
  return (
    type === "class_declaration" ||
    type === "class" ||
    type === "class_expression"
  );
}

/**
 * 从类节点提取类信息
 * @param node 类节点
 * @returns 类信息
 */
function extractClassInfo(node: any): ClassInfo | null {
  try {
    // 尝试获取类名
    let name = "anonymous";
    const nameNode =
      findChildByType(node, "identifier") || findChildByFieldName(node, "name");
    if (nameNode) {
      name = nameNode.text;
    }

    // 获取类主体
    const classBody =
      findChildByType(node, "class_body") || findChildByFieldName(node, "body");

    // 提取方法和属性信息
    const methods: MethodInfo[] = [];
    let propertyCount = 0;
    let staticMemberCount = 0;

    if (classBody) {
      for (let i = 0; i < classBody.childCount; i++) {
        const child = classBody.child(i);

        if (child.type === "method_definition") {
          const methodInfo = extractMethodInfo(child);
          if (methodInfo) {
            methods.push(methodInfo);
            if (methodInfo.isStatic) {
              staticMemberCount++;
            }
          }
        } else if (
          child.type === "public_field_definition" ||
          child.type === "private_field_definition"
        ) {
          propertyCount++;
          if (isStaticNode(child)) {
            staticMemberCount++;
          }
        }
      }
    }

    // 尝试获取父类信息
    let superClass = undefined;
    const extendsClause =
      findChildByType(node, "extends_clause") ||
      findChildByFieldName(node, "extends");
    if (extendsClause) {
      const superClassNode =
        findChildByType(extendsClause, "identifier") ||
        findChildByFieldName(extendsClause, "name");
      if (superClassNode) {
        superClass = superClassNode.text;
      }
    }

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
      methodCount: methods.length,
      propertyCount,
      staticMemberCount,
      superClass,
      methods,
    };
  } catch (error) {
    console.error("提取类信息失败:", error);
    return null;
  }
}

/**
 * 从方法节点提取方法信息
 * @param node 方法节点
 * @returns 方法信息
 */
function extractMethodInfo(node: any): MethodInfo | null {
  try {
    // 获取方法名
    let name = "anonymous";
    const nameNode = findChildByFieldName(node, "name");
    if (nameNode) {
      name = nameNode.text;
    }

    // 检查修饰符
    const isStatic = isStaticNode(node);
    const isPrivate = isPrivateNode(node);
    const isAsync = isAsyncNode(node);

    // 获取参数列表
    const parameterList =
      findChildByType(node, "formal_parameters") ||
      findChildByFieldName(node, "parameters");
    const parameterCount = parameterList ? countParameters(parameterList) : 0;

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
      isStatic,
      isPrivate,
      isAsync,
      parameterCount,
    };
  } catch (error) {
    console.error("提取方法信息失败:", error);
    return null;
  }
}

/**
 * 计算类内聚性
 * 简化实现，基于方法之间的相互调用和共享属性访问
 * @param classInfo 类信息
 * @returns 内聚性评分 (0-1)，1表示高度内聚
 */
function calculateCohesion(classInfo: ClassInfo): number {
  // 在实际实现中，应该分析方法之间的相互调用和属性访问
  // 这里简化为一个经验公式
  const methodCount = classInfo.methodCount;
  const propertyCount = classInfo.propertyCount;

  if (methodCount <= 1 || propertyCount === 0) {
    return 1; // 方法太少或没有属性，默认为完全内聚
  }

  // 一个简单的经验公式，方法数量越多，内聚性可能越低
  // 属性数量如果适中，内聚性可能较高
  // 这只是一个粗略估计，实际应分析代码间的依赖关系
  let cohesion = 1.0 - methodCount / 20.0;

  // 属性与方法的比例适中时内聚性通常较好
  const ratio = propertyCount / methodCount;
  if (ratio > 0.2 && ratio < 2) {
    cohesion += 0.2;
  }

  return Math.max(0, Math.min(1, cohesion));
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
 * 检查节点是否是静态成员
 * @param node AST节点
 * @returns 是否是静态成员
 */
function isStaticNode(node: any): boolean {
  // 遍历节点和子节点，查找static关键字
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type === "static" || child.type === "static_keyword") {
      return true;
    }
  }
  return false;
}

/**
 * 检查节点是否是私有成员
 * @param node AST节点
 * @returns 是否是私有成员
 */
function isPrivateNode(node: any): boolean {
  // 遍历节点和子节点，查找private关键字或#开头的名称
  const nameNode = findChildByFieldName(node, "name");
  if (nameNode && nameNode.text.startsWith("#")) {
    return true;
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type === "private" || child.type === "private_keyword") {
      return true;
    }
  }
  return false;
}

/**
 * 检查节点是否是异步方法
 * @param node AST节点
 * @returns 是否是异步方法
 */
function isAsyncNode(node: any): boolean {
  // 遍历节点和子节点，查找async关键字
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type === "async" || child.type === "async_keyword") {
      return true;
    }
  }
  return false;
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
