/**
 * @file 代码结构分析模块入口
 * @description 导出代码结构分析相关的功能
 * @module analyzer/structure
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/structure/README.md} - 代码结构分析文档
 */

// 导出函数分析器
export * from "./function-analyzer";

// 导出类分析器
export * from "./class-analyzer";

// 导出模块依赖分析器
export * from "./module-analyzer";

// 导出依赖图构建器
export { default as DependencyGraphBuilder } from "./dependency-graph";
export { DependencyGraphImpl } from "./dependency-graph";
