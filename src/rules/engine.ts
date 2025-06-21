/**
 * @file 规则引擎
 * @description 规则引擎核心类，负责加载、管理和执行规则
 * @module rules/engine
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/README.md} - 规则引擎模块文档
 */

import { FileAnalysisResult, Finding } from "../analyzer/types";
import { IRule, IRuleEngine, RuleLevel } from "./types";
import { RuleFactory } from "./rule-factory";
import { AIFocusConfig } from "../config/types";

/**
 * 规则引擎类
 * 负责加载、管理和执行规则
 */
export class RuleEngine implements IRuleEngine {
  /** 文件级规则 */
  private fileRules: IRule[] = [];
  /** 项目级规则 */
  private projectRules: IRule[] = [];

  /**
   * 创建规则引擎实例
   * @param config 项目配置
   */
  constructor(config: AIFocusConfig) {
    this.loadRules(config.rules);
  }

  /**
   * 从配置加载规则
   * @param rulesConfig 规则配置
   */
  private loadRules(rulesConfig: { [ruleId: string]: any }) {
    for (const ruleId in rulesConfig) {
      const rule = RuleFactory.createRule(ruleId, rulesConfig[ruleId]);

      if (rule) {
        if (rule.level === RuleLevel.FILE) {
          this.fileRules.push(rule);
        } else {
          this.projectRules.push(rule);
        }
      }
    }
  }

  /**
   * 评估单个文件的规则
   * @param fileResult 文件分析结果
   * @returns 发现的问题列表
   */
  evaluateFile(fileResult: FileAnalysisResult): Finding[] {
    let findings: Finding[] = [];

    for (const rule of this.fileRules) {
      if (rule.evaluateFile) {
        try {
          const ruleFindings = rule.evaluateFile(fileResult);
          findings = findings.concat(ruleFindings);
        } catch (error) {
          console.error(`规则 ${rule.id} 执行失败: ${error}`);
        }
      }
    }

    return findings;
  }

  /**
   * 评估整个项目的规则
   * @param projectResults 项目分析结果（所有文件）
   * @param dependencyGraph 可选的依赖图
   * @returns 发现的问题列表
   */
  evaluateProject(
    projectResults: FileAnalysisResult[],
    dependencyGraph?: any
  ): Finding[] {
    let findings: Finding[] = [];

    for (const rule of this.projectRules) {
      if (rule.evaluateProject) {
        try {
          const ruleFindings = rule.evaluateProject(
            projectResults,
            dependencyGraph
          );
          findings = findings.concat(ruleFindings);
        } catch (error) {
          console.error(`规则 ${rule.id} 执行失败: ${error}`);
        }
      }
    }

    return findings;
  }

  /**
   * 获取所有已加载的规则
   * @returns 规则列表
   */
  getRules(): IRule[] {
    return [...this.fileRules, ...this.projectRules];
  }

  /**
   * 获取规则数量
   * @returns 规则数量
   */
  getRuleCount(): { file: number; project: number; total: number } {
    return {
      file: this.fileRules.length,
      project: this.projectRules.length,
      total: this.fileRules.length + this.projectRules.length,
    };
  }
}
