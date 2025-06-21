/**
 * @file 规则工厂
 * @description 根据配置动态创建规则实例
 * @module rules/rule-factory
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/README.md} - 规则引擎模块文档
 */

import { IRule, RuleConfig } from "./types";
import { MetricThresholdRule } from "./rules/metric-threshold-rule";
import { CircularDependencyRule } from "./rules/circular-dependency-rule";

/**
 * 规则工厂类
 * 负责根据配置创建对应的规则实例
 */
export class RuleFactory {
  /**
   * 根据配置创建规则实例
   * @param ruleId 规则ID
   * @param ruleConfig 规则配置
   * @returns 规则实例或null（如果规则未启用或未识别）
   */
  static createRule(ruleId: string, ruleConfig: RuleConfig): IRule | null {
    // 检查配置是否启用了该规则
    if (!ruleConfig.enabled) {
      return null;
    }

    // 添加ID到配置中，确保规则实例拥有正确的ID
    const config: RuleConfig = {
      ...ruleConfig,
      id: ruleId,
    };

    // 根据规则ID或配置特征创建对应规则
    if (ruleConfig.metric && ruleConfig.threshold !== undefined) {
      // 创建指标阈值规则
      return new MetricThresholdRule(config);
    } else if (ruleId === "module.circularDependency") {
      // 创建循环依赖规则
      return new CircularDependencyRule(config);
    }

    // 未识别的规则类型
    console.warn(`未知规则类型: ${ruleId}`);
    return null;
  }
}
