/**
 * @file 规则基类
 * @description 实现IRule接口的抽象基类，为所有规则提供通用功能
 * @module rules/base-rule
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/README.md} - 规则引擎模块文档
 */

import { FileAnalysisResult, Finding } from "../analyzer/types";
import { IRule, RuleConfig, RuleLevel } from "./types";

/**
 * 规则抽象基类
 * 实现IRule接口的基本功能，具体规则类需要继承此类
 */
export abstract class BaseRule implements IRule {
  /** 规则唯一标识符 */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 规则级别 */
  level: RuleLevel;

  /**
   * 创建规则实例
   * @param config 规则配置
   */
  constructor(config: RuleConfig) {
    this.id = config.id;
    this.name = config.name || this.id;
    this.description = config.description || "";
    this.level = RuleLevel.FILE; // 默认为文件级规则
  }

  /**
   * 评估文件级规则（默认实现）
   * 子类应该覆盖此方法以提供实际实现
   * @param fileResult 文件分析结果
   * @returns 发现的问题列表
   */
  evaluateFile?(fileResult: FileAnalysisResult): Finding[] {
    return [];
  }

  /**
   * 评估项目级规则（默认实现）
   * 子类应该覆盖此方法以提供实际实现
   * @param projectResults 项目分析结果（所有文件）
   * @returns 发现的问题列表
   */
  evaluateProject?(projectResults: FileAnalysisResult[]): Finding[] {
    return [];
  }
}
