/**
 * @file 语法树适配器索引
 * @description 导出所有语言的AST适配器
 * @module analyzer/adapters
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/adapters/index.md} - 适配器索引文档
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import { PythonAdapter } from "./python-adapter";
import { DefaultAdapter } from "./default-adapter";
import { TypeScriptAdapter } from "./typescript-adapter";

// 根据语言获取适配器的工厂函数
export function getAdapterForLanguage(language: string) {
  switch (language.toLowerCase()) {
    case "python":
      return new PythonAdapter();
    case "typescript":
      return new TypeScriptAdapter();
    case "javascript":
      return new DefaultAdapter();
    // 将来可以添加其他语言的适配器
    default:
      throw new Error(`不支持的语言适配器: ${language}`);
  }
}

// 导出所有适配器类型
export { PythonAdapter, DefaultAdapter, TypeScriptAdapter };
