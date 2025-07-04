/**
 * @file 代码解析器
 * @description 使用tree-sitter库实现代码解析
 * @module analyzer/parser
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import Parser from "tree-sitter";
// 使用require方式导入模块，避免TypeScript类型检查问题
// @ts-ignore
const TypeScript = require("tree-sitter-typescript").typescript;
// @ts-ignore
const JavaScript = require("tree-sitter-typescript").tsx;
// @ts-ignore
const Python = require("tree-sitter-python");
import * as path from "path";
import { IParser } from "./types";
import { UnifiedNode } from "./unified-node";
import { getAdapterForLanguage } from "./adapters";

/**
 * 支持的语言配置
 */
const LANGUAGE_CONFIGS: {
  [key: string]: {
    grammar: any;
    fileExtensions: string[];
  };
} = {
  typescript: {
    grammar: TypeScript,
    fileExtensions: [".ts", ".tsx"],
  },
  javascript: {
    grammar: JavaScript,
    fileExtensions: [".js", ".jsx"],
  },
  python: {
    grammar: Python,
    fileExtensions: [".py"],
  },
};

/**
 * 解析结果接口，包含原始树和统一节点
 */
export interface ParseResult {
  /** 原始语法树 */
  tree: Parser.Tree;
  /** 统一节点表示（如果支持） */
  unified?: UnifiedNode[];
  /** 是否存在语法错误 */
  hasErrors?: boolean;
  /** 错误节点比例 (0-1) */
  errorRatio?: number;
}

/**
 * 代码解析器实现类
 * 使用tree-sitter库解析代码为AST
 */
class TreeSitterParser implements IParser {
  private parser: Parser;

  /**
   * 创建代码解析器
   */
  constructor() {
    this.parser = new Parser();
  }

  /**
   * 根据文件路径检测语言类型
   * @param filePath 文件路径
   * @returns 语言类型，如 'typescript', 'javascript', 'python'
   */
  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.fileExtensions.includes(ext)) {
        return language;
      }
    }

    // 默认返回javascript
    return "javascript";
  }

  /**
   * 解析代码
   * @param content 代码内容
   * @param language 语言类型
   * @param filePath 可选，文件路径（用于生成统一节点）
   * @returns 解析后的结果（包含AST和可选的统一节点）
   * @throws 如果不支持指定语言或解析失败
   */
  parse(content: string, language: string, filePath?: string): ParseResult {
    if (!this.isLanguageSupported(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    const langConfig = LANGUAGE_CONFIGS[language];
    this.parser.setLanguage(langConfig.grammar);

    try {
      const tree = this.parser.parse(content);
      const result: ParseResult = { tree };

      // 检查语法错误 - 搜索ERROR节点
      result.errorRatio = this.calculateErrorRatio(tree);
      result.hasErrors = result.errorRatio > 0;

      // 如果提供了文件路径，尝试生成统一节点
      if (filePath) {
        try {
          const adapter = getAdapterForLanguage(language);
          result.unified = adapter.toUnifiedNodes(tree, filePath);
        } catch (adapterError) {
          console.warn(`生成统一节点失败: ${adapterError}`);
          // 适配器错误不影响返回原始树
        }
      }

      return result;
    } catch (error) {
      console.error(`解析代码失败: ${error}`);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`解析代码失败: ${errorMessage}`);
    }
  }

  /**
   * 增量解析代码
   * @param previousTree 先前的语法树
   * @param content 新的代码内容
   * @param language 语言类型
   * @param filePath 可选，文件路径
   * @returns 解析结果
   */
  parseIncremental(
    previousTree: Parser.Tree,
    content: string,
    language: string,
    filePath?: string
  ): ParseResult {
    if (!this.isLanguageSupported(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    const langConfig = LANGUAGE_CONFIGS[language];
    this.parser.setLanguage(langConfig.grammar);

    try {
      // 使用增量解析
      const tree = this.parser.parse(content, previousTree);
      const result: ParseResult = { tree };

      // 检查语法错误
      result.errorRatio = this.calculateErrorRatio(tree);
      result.hasErrors = result.errorRatio > 0;

      // 如果提供了文件路径，尝试生成统一节点
      if (filePath) {
        try {
          const adapter = getAdapterForLanguage(language);
          result.unified = adapter.toUnifiedNodes(tree, filePath);
        } catch (adapterError) {
          console.warn(`生成统一节点失败: ${adapterError}`);
        }
      }

      return result;
    } catch (error) {
      console.error(`增量解析失败，回退到全量解析: ${error}`);
      // 增量解析失败时回退到全量解析
      return this.parse(content, language, filePath);
    }
  }

  /**
   * 兼容旧版本接口的解析方法
   * @deprecated 使用 parse() 代替，该方法仅为向后兼容
   */
  parseLegacy(content: string, language: string): Parser.Tree {
    if (!this.isLanguageSupported(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    const langConfig = LANGUAGE_CONFIGS[language];
    this.parser.setLanguage(langConfig.grammar);

    try {
      return this.parser.parse(content);
    } catch (error) {
      console.error(`解析代码失败: ${error}`);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`解析代码失败: ${errorMessage}`);
    }
  }

  /**
   * 计算语法树中错误节点的比例
   * @param tree 语法树
   * @returns 错误节点比例(0-1)
   */
  private calculateErrorRatio(tree: Parser.Tree): number {
    const rootNode = tree.rootNode;
    let errorCount = 0;
    let totalCount = 0;

    // 递归遍历树查找ERROR节点
    const countErrors = (node: Parser.SyntaxNode) => {
      totalCount++;

      if (node.type === "ERROR" || node.hasError()) {
        errorCount++;
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          countErrors(child);
        }
      }
    };

    countErrors(rootNode);

    // 避免除以零
    if (totalCount === 0) return 0;

    return errorCount / totalCount;
  }

  /**
   * 获取解析器支持的所有语言
   * @returns 支持的语言列表
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_CONFIGS);
  }

  /**
   * 检查是否支持指定的语言
   * @param language 语言类型
   * @returns 是否支持
   */
  private isLanguageSupported(language: string): boolean {
    return Object.keys(LANGUAGE_CONFIGS).includes(language);
  }
}

export default TreeSitterParser;
