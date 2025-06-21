/**
 * @file 规则引擎模块入口
 * @description 导出规则引擎模块的所有公共API
 * @module rules
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/README.md} - 规则引擎模块文档
 */

// 导出类型定义
export * from "./types";

// 导出规则基类和具体规则
export * from "./base-rule";
export * from "./rules/metric-threshold-rule";
export * from "./rules/circular-dependency-rule";

// 导出规则工厂和引擎
export * from "./rule-factory";
export * from "./engine";

// 提供便捷函数
export { RuleEngine } from "./engine";
