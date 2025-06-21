/**
 * @file Orchestrator模块类型定义
 * @description 定义Orchestrator的配置和返回值类型
 * @module orchestrator/types
 */

import { AIFocusConfig } from "../config";
import { AnalysisResult } from "../analyzer/types";

/**
 * Orchestrator 配置
 */
export interface OrchestratorConfig {
  config: AIFocusConfig;
}

/**
 * Orchestrator 运行结果
 */
export interface OrchestrationResult {
  reviewReportPath?: string;
  docsReportPath?: string;
  analysisResult: AnalysisResult;
}
