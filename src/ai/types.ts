/**
 * @file AI服务模块类型定义
 * @description 定义AI服务相关的接口和类型
 * @module ai/types
 * @see {@link /agentic-docs/.module-docs/AIFocus/ai/README.md} - AI服务模块文档
 */

import { FileAnalysisResult } from "../analyzer/types";

/**
 * AI 任务类型
 */
export enum AITaskType {
  CODE_REVIEW = "CODE_REVIEW",
  DOC_GENERATION = "DOC_GENERATION",
}

/**
 * AI 生成参数
 */
export interface AIGenerateParams {
  taskType: AITaskType;
  context: {
    fileAnalysisResults: FileAnalysisResult[];
    [key: string]: any;
  };
}

/**
 * AI 提示结构
 */
export interface AiPrompt {
  systemMessage: string;
  userMessage: string;
  context?: any;
}

/**
 * AI 响应结构
 */
export interface AiResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * AI 提供商接口
 */
export interface IAiProvider {
  /**
   * 生成内容
   * @param params - 生成参数
   * @returns 生成的响应
   */
  generate(params: AIGenerateParams): Promise<AiResponse>;
}
