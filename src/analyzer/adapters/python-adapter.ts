/**
 * @file Python语法树适配器
 * @description 将Tree-sitter Python AST转换为统一节点
 * @module analyzer/adapters/python-adapter
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/adapters/python-adapter.md} - Python适配器文档
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import Parser from "tree-sitter";
import { SourceLocation } from "../types";
import {
  NodeAdapter,
  UnifiedNode,
  UNodeType,
  FunctionNode,
  ClassNode,
  ImportNode,
  CallNode,
} from "../unified-node";

/**
 * Python节点类型到统一节点类型的映射
 */
const NODE_TYPE_MAP: Record<string, UNodeType | null> = {
  function_definition: UNodeType.Function,
  class_definition: UNodeType.Class,
  import_statement: UNodeType.Import,
  import_from_statement: UNodeType.Import,
  call: UNodeType.Call,
  // 其他可能的映射...
};

/**
 * Python语法树适配器
 * 将Tree-sitter Python AST转换为统一节点
 */
export class PythonAdapter implements NodeAdapter {
  /**
   * 转换整个Python语法树为统一节点数组
   * @param tree Python语法树
   * @param filePath 文件路径
   * @returns 统一节点数组
   */
  toUnifiedNodes(tree: Parser.Tree, filePath: string): UnifiedNode[] {
    const rootNode = tree.rootNode;
    const nodes: UnifiedNode[] = [];

    // 创建模块根节点
    const moduleNode: UnifiedNode = {
      type: UNodeType.Module,
      name: filePath.split("/").pop() || "",
      location: this.getNodeLocation(rootNode),
      children: [],
      properties: {
        description: `Python module from ${filePath}`,
      },
      originalNode: rootNode,
    };

    // 递归处理所有子节点
    this.processChildren(rootNode, moduleNode);

    // 返回模块节点
    nodes.push(moduleNode);
    return nodes;
  }

  /**
   * 递归处理节点的子节点
   * @param node Tree-sitter节点
   * @param parent 父统一节点
   */
  private processChildren(node: Parser.SyntaxNode, parent: UnifiedNode): void {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      const unifiedNode = this.convertNode(child, parent);
      if (unifiedNode) {
        parent.children.push(unifiedNode);
      } else {
        // 如果当前节点不是我们关注的类型，继续递归其子节点
        this.processChildren(child, parent);
      }
    }
  }

  /**
   * 将单个Python节点转换为统一节点
   * @param node Python AST节点
   * @param parent 父统一节点
   * @returns 统一节点，如果不是关注的节点类型则返回null
   */
  convertNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): UnifiedNode | null {
    const nodeType = NODE_TYPE_MAP[node.type];
    if (!nodeType) return null;

    let unifiedNode: UnifiedNode | null = null;

    switch (nodeType) {
      case UNodeType.Function:
        unifiedNode = this.convertFunctionNode(node, parent);
        break;
      case UNodeType.Class:
        unifiedNode = this.convertClassNode(node, parent);
        break;
      case UNodeType.Import:
        unifiedNode = this.convertImportNode(node, parent);
        break;
      case UNodeType.Call:
        unifiedNode = this.convertCallNode(node, parent);
        break;
      default:
        // 未处理的节点类型
        return null;
    }

    if (unifiedNode) {
      // 递归处理子节点
      this.processChildren(node, unifiedNode);
    }

    return unifiedNode;
  }

  /**
   * 转换函数定义节点
   * @param node Python函数定义节点
   * @param parent 父统一节点
   * @returns 函数统一节点
   */
  private convertFunctionNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): FunctionNode {
    // 获取函数名 - 找到identifier节点
    let name = "anonymous";
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "identifier") {
        name = child.text;
        break;
      }
    }

    // 获取参数列表
    const parameters = this.extractParameters(node);

    // 构建函数节点
    const functionNode: FunctionNode = {
      type: UNodeType.Function,
      name,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        parameters,
        isAsync: node.text.startsWith("async "),
        // 可以添加更多函数特有属性
      },
      originalNode: node,
    };

    return functionNode;
  }

  /**
   * 转换类定义节点
   * @param node Python类定义节点
   * @param parent 父统一节点
   * @returns 类统一节点
   */
  private convertClassNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): ClassNode {
    // 获取类名 - 找到identifier节点
    let name = "AnonymousClass";
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "identifier") {
        name = child.text;
        break;
      }
    }

    // 获取父类
    const superClasses = this.extractSuperClasses(node);

    // 构建类节点
    const classNode: ClassNode = {
      type: UNodeType.Class,
      name,
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        superClass: superClasses.length > 0 ? superClasses[0] : undefined,
        interfaces: superClasses.slice(1), // Python中没有明确的接口概念，但可以将额外的父类视为接口
      },
      originalNode: node,
    };

    return classNode;
  }

  /**
   * 转换导入节点
   * @param node Python导入节点
   * @param parent 父统一节点
   * @returns 导入统一节点
   */
  private convertImportNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): ImportNode {
    let source = "";
    let imported: string[] = [];
    let isNamespace = false;

    if (node.type === "import_statement") {
      // 处理 "import x, y, z" 形式
      const moduleNames = this.findNodesOfType(node, "dotted_name");

      if (moduleNames.length > 0) {
        source = moduleNames[0].text;
        imported = moduleNames.map((n) => n.text);
      }
    } else if (node.type === "import_from_statement") {
      // 处理 "from x import y, z" 形式
      // 查找模块名称 (from X import...)
      const moduleNodes = this.findNodesOfType(node, "dotted_name");
      if (moduleNodes.length > 0) {
        source = moduleNodes[0].text;
      }

      // 查找导入名称 (from x import Y, Z)
      const importedNames = this.findNodesOfType(node, "identifier");
      if (importedNames.length > 0) {
        imported = importedNames.map((n) => n.text);
      }

      // 检查是否有 import * 形式
      const starImport = this.findNodesOfType(node, "asterisk");
      if (starImport.length > 0) {
        isNamespace = true;
        imported = ["*"];
      }
    }

    const importNode: ImportNode = {
      type: UNodeType.Import,
      name: source || "unknown", // 使用源模块名作为节点名
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        source,
        imported,
        isNamespace,
      },
      originalNode: node,
    };

    return importNode;
  }

  /**
   * 转换函数调用节点
   * @param node Python调用节点
   * @param parent 父统一节点
   * @returns 调用统一节点
   */
  private convertCallNode(
    node: Parser.SyntaxNode,
    parent?: UnifiedNode
  ): CallNode {
    // 获取被调用函数名
    let name = "unknown";
    let target = undefined;

    // 查找函数部分
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type !== "argument_list") {
        name = child.text;
        target = child.text;
        break;
      }
    }

    // 获取参数
    const argArray: string[] = [];
    const argListNode = this.findFirstNodeOfType(node, "argument_list");

    if (argListNode) {
      for (let i = 0; i < argListNode.namedChildCount; i++) {
        const arg = argListNode.namedChild(i);
        if (arg) {
          argArray.push(arg.text);
        }
      }
    }

    const callNode: CallNode = {
      type: UNodeType.Call,
      name, // 使用函数名作为节点名
      location: this.getNodeLocation(node),
      parent,
      children: [],
      properties: {
        arguments: argArray,
        target,
      },
      originalNode: node,
    };

    return callNode;
  }

  /**
   * 从函数定义节点提取参数列表
   * @param node 函数定义节点
   * @returns 参数名称数组
   */
  private extractParameters(node: Parser.SyntaxNode): string[] {
    const parameters: string[] = [];
    const paramListNode = this.findFirstNodeOfType(node, "parameters");

    if (paramListNode) {
      const paramNodes = this.findNodesOfType(paramListNode, "identifier");

      for (const paramNode of paramNodes) {
        parameters.push(paramNode.text);
      }
    }

    return parameters;
  }

  /**
   * 从类定义节点提取父类列表
   * @param node 类定义节点
   * @returns 父类名称数组
   */
  private extractSuperClasses(node: Parser.SyntaxNode): string[] {
    const superClasses: string[] = [];
    const argListNode = this.findFirstNodeOfType(node, "argument_list");

    if (argListNode) {
      // 查找所有表达式作为基类
      const baseClassNodes = this.findNodesOfType(argListNode, "identifier");

      for (const baseClass of baseClassNodes) {
        superClasses.push(baseClass.text);
      }
    }

    return superClasses;
  }

  /**
   * 查找特定类型的第一个节点
   * @param node 父节点
   * @param nodeType 目标节点类型
   * @returns 找到的节点或null
   */
  private findFirstNodeOfType(
    node: Parser.SyntaxNode,
    nodeType: string
  ): Parser.SyntaxNode | null {
    if (node.type === nodeType) {
      return node;
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        const result = this.findFirstNodeOfType(child, nodeType);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * 查找特定类型的所有节点
   * @param node 父节点
   * @param nodeType 目标节点类型
   * @returns 匹配类型的节点数组
   */
  private findNodesOfType(
    node: Parser.SyntaxNode,
    nodeType: string
  ): Parser.SyntaxNode[] {
    const result: Parser.SyntaxNode[] = [];

    // 递归搜索所有匹配类型的节点
    this.findNodesByType(node, nodeType, result);

    return result;
  }

  /**
   * 递归查找特定类型的节点
   * @param node 当前节点
   * @param nodeType 目标节点类型
   * @param result 结果集合
   */
  private findNodesByType(
    node: Parser.SyntaxNode,
    nodeType: string,
    result: Parser.SyntaxNode[]
  ): void {
    if (node.type === nodeType) {
      result.push(node);
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.findNodesByType(child, nodeType, result);
      }
    }
  }

  /**
   * 从Tree-sitter节点获取源代码位置
   * @param node Tree-sitter节点
   * @returns 源代码位置
   */
  private getNodeLocation(node: Parser.SyntaxNode): SourceLocation {
    return {
      startLine: node.startPosition.row + 1, // Tree-sitter是0-based，转换为1-based
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };
  }

  /**
   * 计算语法树中错误节点的比例
   * @param tree 语法树
   * @returns 错误节点比例(0-1)
   */
  getErrorRatio(tree: Parser.Tree): number {
    const rootNode = tree.rootNode;
    const stats = this.countErrorNodes(rootNode);

    // 避免除以0
    if (stats.total === 0) return 0;

    return stats.errors / stats.total;
  }

  /**
   * 递归计算错误节点数量
   * @param node 当前节点
   * @returns 错误节点统计
   */
  private countErrorNodes(node: Parser.SyntaxNode): {
    errors: number;
    total: number;
  } {
    let errors = node.type === "ERROR" ? 1 : 0;
    let total = 1;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        const childStats = this.countErrorNodes(child);
        errors += childStats.errors;
        total += childStats.total;
      }
    }

    return { errors, total };
  }
}
