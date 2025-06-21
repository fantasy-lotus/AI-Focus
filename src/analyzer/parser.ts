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
import * as path from "path";
import { IParser } from "./types";

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
};

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
   * @returns 语言类型，如 'typescript', 'javascript'
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
   * @returns 解析后的AST
   * @throws 如果不支持指定语言或解析失败
   */
  parse(content: string, language: string): any {
    if (!this.isLanguageSupported(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    const langConfig = LANGUAGE_CONFIGS[language];
    this.parser.setLanguage(langConfig.grammar);

    try {
      const tree = this.parser.parse(content);
      return tree;
    } catch (error) {
      console.error(`解析代码失败: ${error}`);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`解析代码失败: ${errorMessage}`);
    }
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
