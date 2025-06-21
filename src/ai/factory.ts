/**
 * @file AI提供商工厂
 * @description 根据配置创建适当的AI提供商实例
 * @module ai/factory
 * @see {@link /agentic-docs/.module-docs/AIFocus/ai/README.md} - AI服务模块文档
 */

import { AIFocusConfig } from "../config";
import { IAiProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";

/**
 * AI提供商工厂
 * 负责根据配置创建适当的AI提供商实例
 */
export class AiProviderFactory {
  /**
   * 创建AI提供商实例
   * @param config AIFocus配置
   * @returns AI提供商实例
   */
  public static create(config: AIFocusConfig): IAiProvider {
    const { provider } = config.ai;

    let apiKey: string | undefined;
    let model: string;

    switch (provider) {
      case "gemini":
        apiKey =
          process.env.GEMINI_API_KEY ||
          config.ai.gemini?.apiKey ||
          config.ai.gemini?.apikey;
        model = config.ai.gemini?.model || "gemini-1.5-pro-latest";
        break;
      // case 'openai':
      //   apiKey = process.env.OPENAI_API_KEY || config.ai.openai?.apiKey;
      //   model = config.ai.openai?.model || 'gpt-4';
      //   break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    if (!apiKey) {
      throw new Error(
        "AI API Key not found. Please set it in config or as an environment variable."
      );
    }

    // 根据配置的提供商创建实例
    switch (provider) {
      case "gemini":
        return new GeminiProvider({ model, apiKey });
      // case 'openai':
      //   return new OpenAiProvider({ model, apiKey });
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
