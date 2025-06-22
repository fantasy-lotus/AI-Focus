/**
 * @file 配置类型定义
 * @description 定义AIFocus配置文件的类型
 * @module config/types
 * @see {@link /agentic-docs/.module-docs/AIFocus/config/README.md} - 配置模块文档
 */

/**
 * 严重性级别
 */
export type Severity = "error" | "warning" | "info";

/**
 * 规则配置
 */
export interface RuleConfig {
  /** 是否启用规则 */
  enabled: boolean;
  /** 规则严重性 */
  severity: Severity;
  /** 规则阈值（如适用） */
  threshold?: number;
  /** 其他配置（如适用） */
  [key: string]: any;
}

/**
 * 项目配置
 */
export interface ProjectConfig {
  /** 项目名称 */
  name: string;
  /** 项目类型 */
  type: "typescript" | "javascript" | "mixed";
}

/**
 * 输出配置
 */
export interface OutputConfig {
  /** 报告配置 */
  reports: {
    /** 报告输出目录 */
    directory: string;
    /** Focus 报告文件名 */
    focusFile: string;
    /** 代码审查报告文件名 */
    reviewFile: string;
  };
  docs: {
    directory: string;
  };
}

/**
 * AI配置
 */
export interface AIConfig {
  /** 是否启用AI分析 */
  enabled: boolean;
  /** AI服务提供商 */
  provider: "openai" | "gemini" | "anthropic";
  /** Gemini 配置 */
  gemini?: {
    model: string;
    apiKey?: string;
    apikey?: string;
  };
  /** OpenAI 配置 */
  openai?: {
    model: string;
    apiKey?: string;
  };
  /** 通用温度参数 (0-1) */
  temperature?: number;
}

/**
 * 文档作用域配置
 */
export interface DocScopingConfig {
  /**
   * 从文档生成中排除的文件/目录 (Glob 模式)
   * 这些文件仍会被分析
   */
  excludeFromDocs: string[];
  /**
   * 模块级文档配置
   */
  moduleLevel: {
    /**
     * 触发模块级文档的文件数量阈值
     * @default 4
     */
    threshold: number;
  };
}

/**
 * 增量分析配置
 */
export interface IncrementalConfig {
  /** 是否启用增量分析 */
  enabled: boolean;
  /** 去抖间隔（秒） */
  debounceSeconds: number;
}

/**
 * AIFocus完整配置
 */
export interface AIFocusConfig {
  /** 项目配置 */
  project: ProjectConfig;
  /** 分析路径模式 */
  analyzePaths: string[];
  /** 排除路径模式 */
  excludePaths: string[];
  /** 输出配置 */
  output: OutputConfig;
  /** 规则配置 */
  rules: {
    [ruleId: string]: RuleConfig;
  };
  /** 新增: 文档作用域配置 */
  docScoping?: DocScopingConfig;
  /** 新增: 增量分析配置 */
  incremental?: IncrementalConfig;
  /** AI配置 */
  ai: AIConfig;
  /** 新增: 调试模式 */
  debugMode?: boolean;
}
