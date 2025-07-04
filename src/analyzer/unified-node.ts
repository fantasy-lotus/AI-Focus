/**
 * @file 统一抽象语法树节点
 * @description 定义多语言统一的抽象语法树节点类型
 * @module analyzer/unified-node
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/unified-node.md} - 统一节点文档
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import { SourceLocation } from "./types";

/**
 * 统一节点类型枚举
 * 定义跨语言的通用节点类型
 */
export enum UNodeType {
  Module = "Module",
  Function = "Function",
  Class = "Class",
  Method = "Method",
  Import = "Import",
  Call = "Call",
  Variable = "Variable",
  Interface = "Interface",
  TypeAlias = "TypeAlias",
  Enum = "Enum",
  // 可根据需要扩展更多通用节点类型
}

/**
 * 统一节点接口
 * 提供跨语言统一的AST节点表示
 */
export interface UnifiedNode {
  /** 节点类型，使用统一的枚举值 */
  type: UNodeType;

  /** 节点名称，如函数名、类名等 */
  name: string;

  /** 代码位置信息 */
  location: SourceLocation;

  /** 父节点引用 */
  parent?: UnifiedNode;

  /** 子节点 */
  children: UnifiedNode[];

  /** 节点特有属性 */
  properties: {
    /** 节点描述（如函数签名、参数列表等）*/
    description?: string;
    /** 其他特定于节点类型的属性 */
    [key: string]: any;
  };

  /** 原始AST节点引用，便于在需要时访问完整的语言特定信息 */
  originalNode: any;
}

/**
 * 函数节点接口
 */
export interface FunctionNode extends UnifiedNode {
  type: UNodeType.Function;
  properties: {
    parameters: string[];
    returnType?: string;
    isAsync?: boolean;
    isGenerator?: boolean;
    [key: string]: any;
  };
}

/**
 * 类节点接口
 */
export interface ClassNode extends UnifiedNode {
  type: UNodeType.Class;
  properties: {
    superClass?: string;
    interfaces?: string[];
    decorators?: string[];
    [key: string]: any;
  };
}

/**
 * 方法节点接口
 */
export interface MethodNode extends UnifiedNode {
  type: UNodeType.Method;
  properties: {
    parameters: string[];
    returnType?: string;
    isAsync?: boolean;
    isGenerator?: boolean;
    isStatic?: boolean;
    visibility?: "public" | "private" | "protected";
    [key: string]: any;
  };
}

/**
 * 导入节点接口
 */
export interface ImportNode extends UnifiedNode {
  type: UNodeType.Import;
  properties: {
    source: string;
    imported: string[];
    isDefault?: boolean;
    isNamespace?: boolean;
    [key: string]: any;
  };
}

/**
 * 函数调用节点接口
 */
export interface CallNode extends UnifiedNode {
  type: UNodeType.Call;
  properties: {
    arguments: string[];
    target?: string;
    [key: string]: any;
  };
}

/**
 * 变量节点接口
 */
export interface VariableNode extends UnifiedNode {
  type: UNodeType.Variable;
  properties: {
    valueType?: string;
    initialValue?: string;
    isConst?: boolean;
    [key: string]: any;
  };
}

/**
 * 接口节点
 */
export interface InterfaceNode extends UnifiedNode {
  type: UNodeType.Interface;
  properties: {
    extends?: string[];
    [key: string]: any;
  };
}

/**
 * 类型别名节点
 */
export interface TypeAliasNode extends UnifiedNode {
  type: UNodeType.TypeAlias;
  properties: {
    typeDefinition: string;
    [key: string]: any;
  };
}

/**
 * 枚举节点
 */
export interface EnumNode extends UnifiedNode {
  type: UNodeType.Enum;
  properties: {
    members: string[];
    [key: string]: any;
  };
}

/**
 * 适配器接口，定义从特定语言AST到统一节点的转换方法
 */
export interface NodeAdapter {
  /**
   * 将语言特定的AST转换为统一节点数组
   * @param tree 语言特定的语法树
   * @param filePath 文件路径，用于错误报告
   * @returns 统一节点数组
   */
  toUnifiedNodes(tree: any, filePath: string): UnifiedNode[];

  /**
   * 将单个语言特定节点转换为统一节点
   * @param node 语言特定的AST节点
   * @param parent 可选的父节点
   * @returns 转换后的统一节点，如果不是关注的节点类型则返回null
   */
  convertNode(node: any, parent?: UnifiedNode): UnifiedNode | null;

  /**
   * 检查AST中错误节点的比例
   * @param tree 语言特定的语法树
   * @returns 错误节点比例(0-1)
   */
  getErrorRatio(tree: any): number;
}
