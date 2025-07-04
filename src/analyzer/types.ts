/**
 * @file 代码分析模块类型定义
 * @description 定义代码分析引擎相关的接口和类型
 * @module analyzer/types
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import { StabilityMetric } from "./metrics";

/**
 * 代码位置接口，表示代码在文件中的具体位置
 */
export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * 发现项类型
 */
export type FindingType =
  | "METRIC"
  | "RULE_VIOLATION"
  | "CODE_SMELL"
  | "ARCHITECTURE"
  | "SYNTAX_ERROR";

/**
 * 严重性级别
 */
export type Severity = "error" | "warning" | "info";

/**
 * 分析发现接口，表示代码分析中发现的问题或指标
 */
export interface Finding {
  /** 唯一标识符，如 'complexity.cognitive.high' */
  id: string;
  /** 发现类型 */
  type: FindingType;
  /** 人类可读的消息 */
  message: string;
  /** 严重性级别 */
  severity: Severity;
  /** 代码位置 */
  location: SourceLocation;
  /** 详细数据 */
  details: {
    /** 指标名称，如 'cognitiveComplexity' */
    metricName?: string;
    /** 指标值 */
    value?: number;
    /** 阈值 */
    threshold?: number;
    /** 其他自定义数据 */
    [key: string]: any;
  };
}

/**
 * 文件分析结果接口
 */
export interface FileAnalysisResult {
  /** 文件路径 */
  filePath: string;
  /** 编程语言 */
  language: string;
  /** 文件级指标 */
  metrics: {
    /** 圈复杂度 */
    cyclomaticComplexity?: number;
    /** 认知复杂度 */
    cognitiveComplexity?: number;
    /** 可维护性指数 */
    maintainabilityIndex?: number;
    /** 其他指标 */
    [key: string]: number | undefined;
  };
  /** 分析发现列表 */
  findings: Finding[];
  /** 文件依赖（导入的模块） */
  dependencies: string[];
}

/**
 * 依赖图节点类型
 */
export interface DependencyNode {
  /** 文件路径 */
  filePath: string;
  /** 导入的依赖 */
  imports: string[];
  /** 被导入次数 */
  importedBy: string[];
  /** 不稳定指数 (0-1)，0表示稳定，1表示不稳定 */
  instability?: number;
}

/**
 * 依赖图接口
 */
export interface DependencyGraph {
  /** 所有节点 */
  nodes: Map<string, DependencyNode>;
  /** 获取循环依赖 */
  getCircularDependencies(): string[][];
  /** 计算指定节点的不稳定指数 */
  calculateInstability(filePath: string): number;
}

/**
 * 分析器配置接口
 */
export interface AnalyzerConfig {
  /** 要分析的文件路径 */
  includePaths: string[];
  /** 要排除的文件路径 */
  excludePaths: string[];
  /** 自定义规则配置 */
  rules: {
    [ruleId: string]: {
      /** 是否启用规则 */
      enabled: boolean;
      /** 规则严重性 */
      severity: Severity;
      /** 规则阈值 */
      threshold?: number;
      /** 其他配置 */
      [key: string]: any;
    };
  };
  /** 完整配置对象，用于规则引擎 */
  rulesConfig?: any;
  /** 是否启用调试模式 */
  debugMode?: boolean;
}

/**
 * 分析器接口，定义代码分析引擎的核心功能
 */
export interface IAnalyzer {
  /**
   * 分析单个文件
   * @param filePath 文件路径
   * @param content 文件内容
   * @returns 分析结果
   */
  analyzeFile(filePath: string, content?: string): Promise<FileAnalysisResult>;

  /**
   * 分析整个项目
   * @param rootPath 项目根目录
   * @param exclude 排除的文件或目录
   * @returns 完整的分析结果
   */
  analyzeProject(rootPath: string, exclude?: string[]): Promise<AnalysisResult>;

  /**
   * 基于分析结果生成依赖图
   * @param results 分析结果数组
   * @returns 依赖图
   */
  generateDependencyGraph(results: FileAnalysisResult[]): DependencyGraph;

  /**
   * 增量分析多个文件，并在上一次结果基础上合并
   * @param filePaths 文件路径数组
   * @param prevResult 上一次分析结果
   * @returns 分析结果
   */
  analyzeFiles(
    filePaths: string[],
    prevResult: AnalysisResult
  ): Promise<AnalysisResult>;
}

/**
 * 代码解析器接口
 */
export interface IParser {
  /**
   * 解析代码内容
   * @param content 代码内容
   * @param language 编程语言
   * @returns 解析后的AST，使用any类型因为不同解析器的AST结构不同
   */
  parse(content: string, language: string): any;

  /**
   * 获取支持的语言列表
   * @returns 支持的语言列表
   */
  getSupportedLanguages(): string[];
}

/**
 * 复杂度计算接口
 */
export interface IComplexityMetric {
  /**
   * 计算给定AST的复杂度
   * @param ast 抽象语法树
   * @returns 复杂度值
   */
  calculate(ast: any): number;
}

/**
 * 规则接口
 */
export interface IRule {
  /**
   * 规则ID
   */
  id: string;

  /**
   * 规则名称
   */
  name: string;

  /**
   * 规则描述
   */
  description: string;

  /**
   * 默认严重性
   */
  defaultSeverity: Severity;

  /**
   * 检查代码
   * @param ast 抽象语法树
   * @param filePath 文件路径
   * @returns 发现的问题
   */
  check(ast: any, filePath: string): Finding[];
}

/**
 * 完整分析结果接口
 */
export interface AnalysisResult {
  files: FileAnalysisResult[];
  findings: Finding[];
  dependencyGraph?: DependencyGraph;
  stabilityMetrics?: Record<string, StabilityMetric>;
  riskScores?: Record<string, number>;
}
