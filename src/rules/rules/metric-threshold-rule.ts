/**
 * @file 指标阈值规则
 * @description 通用的指标阈值规则实现，用于检查指标值是否超过阈值
 * @module rules/rules/metric-threshold-rule
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/rules/metric-threshold-rule.md} - 指标阈值规则文档
 */

import {
  FileAnalysisResult,
  Finding,
  FindingType,
  Severity,
  SourceLocation,
} from "../../analyzer/types";
import { BaseRule } from "../base-rule";
import { RuleConfig } from "../types";

/**
 * 通用指标阈值规则
 * 用于检查指标值是否超过配置的阈值
 */
export class MetricThresholdRule extends BaseRule {
  /** 指标名称 */
  private metricName: string;
  /** 阈值 */
  private threshold: number;
  /** 严重性 */
  private severity: Severity;

  /**
   * 创建指标阈值规则实例
   * @param config 规则配置
   */
  constructor(config: RuleConfig) {
    super(config);
    this.metricName = config.metric || "";
    this.threshold = config.threshold || 0;
    this.severity = config.severity || "warning";

    if (!this.metricName) {
      throw new Error(`MetricThresholdRule ${this.id} 缺少必要的 metric 配置`);
    }
  }

  /**
   * 评估文件级指标
   * @param fileResult 文件分析结果
   * @returns 发现的问题列表
   */
  evaluateFile(fileResult: FileAnalysisResult): Finding[] {
    const findings: Finding[] = [];
    const metricValue = fileResult.metrics[this.metricName];

    // 检查指标是否存在且为数字
    if (typeof metricValue === "number" && metricValue > this.threshold) {
      // 创建标准位置信息（指向文件开头）
      const location: SourceLocation = {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
      };

      // 添加发现
      findings.push({
        id: `${this.id}.exceeded`,
        type: "RULE_VIOLATION" as FindingType,
        message: `${this.name}: ${this.metricName} (${metricValue}) 超过阈值 (${this.threshold})`,
        severity: this.severity,
        location,
        details: {
          metricName: this.metricName,
          value: metricValue,
          threshold: this.threshold,
          filePath: fileResult.filePath,
        },
      });
    }

    return findings;
  }
}
