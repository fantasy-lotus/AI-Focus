/**
 * @file 代码分析模块入口
 * @description 导出代码分析模块的所有组件
 * @module analyzer
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

// 导出类型定义
export * from "./types";

// 导出主要功能
export { Analyzer, analyzeFile, analyzeProject } from "./analyzer";

// 导出解析器
export { default as Parser } from "./parser";

// 导出度量指标
export * from "./metrics";
