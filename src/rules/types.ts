/**
 * @file 规则引擎类型定义
 * @description 定义规则引擎相关的接口和类型
 * @module rules/types
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/README.md} - 规则引擎模块文档
 */

import { FileAnalysisResult, Finding, Severity } from "../analyzer/types";
import { DependencyGraph } from "../analyzer/types";

/**
 * 规则配置接口
 */
export interface RuleConfig {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name?: string;
  /** 规则描述 */
  description?: string;
  /** 是否启用规则 */
  enabled: boolean;
  /** 规则严重性 */
  severity: Severity;
  /** 规则阈值（如适用） */
  threshold?: number;
  /** 指标名称（用于MetricThresholdRule） */
  metric?: string;
  /** 其他配置（如适用） */
  [key: string]: any;
}

/**
 * 规则执行级别
 */
export enum RuleLevel {
  FILE = "file", // 文件级规则
  PROJECT = "project", // 项目级规则
}

/**
 * 规则接口
 */
export interface IRule {
  /** 规则唯一标识符 */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 规则级别 */
  level: RuleLevel;

  /**
   * 评估文件级规则
   * @param fileResult 文件分析结果
   * @returns 发现的问题列表
   */
  evaluateFile?(fileResult: FileAnalysisResult): Finding[];

  /**
   * 评估项目级规则
   * @param projectResults 项目分析结果（所有文件）
   * @param dependencyGraph 依赖图 (可选)
   * @returns 发现的问题列表
   */
  evaluateProject?(
    projectResults: FileAnalysisResult[],
    dependencyGraph?: DependencyGraph
  ): Finding[];
}

/**
 * 规则引擎接口
 */
export interface IRuleEngine {
  /**
   * 评估单个文件的规则
   * @param fileResult 文件分析结果
   * @returns 发现的问题列表
   */
  evaluateFile(fileResult: FileAnalysisResult): Finding[];

  /**
   * 评估整个项目的规则
   * @param projectResults 项目分析结果（所有文件）
   * @param dependencyGraph 依赖图 (可选)
   * @returns 发现的问题列表
   */
  evaluateProject(
    projectResults: FileAnalysisResult[],
    dependencyGraph?: DependencyGraph
  ): Finding[];
}
