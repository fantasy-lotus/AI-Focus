/**
 * @file 代码分析器
 * @description 实现代码分析功能的核心类
 * @module analyzer/analyzer
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/README.md} - 代码分析模块文档
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { promisify } from "util";

import TreeSitterParser, { ParseResult } from "./parser";
import { calculateCyclomaticComplexity } from "./metrics/cyclomatic-complexity";
import { calculateCognitiveComplexity } from "./metrics/cognitive-complexity";
import { calculateMaintainabilityIndex } from "./metrics/maintainability-index";
import { calculateStability, StabilityMetric } from "./metrics";
import { calculateAllRiskScores } from "./impact-analyzer";
import { analyzeFunctions } from "./structure/function-analyzer";
import { analyzeClasses } from "./structure/class-analyzer";
import { analyzeModuleDependencies } from "./structure/module-analyzer";
import DependencyGraphBuilder from "./structure/dependency-graph";
import { UnifiedNode } from "./unified-node";

import {
  IAnalyzer,
  FileAnalysisResult,
  Finding,
  Severity,
  AnalyzerConfig,
  DependencyGraph,
  FindingType,
  AnalysisResult,
} from "./types";

// 导入规则引擎
import { RuleEngine } from "../rules";

const readFileAsync = promisify(fs.readFile);

/**
 * 默认分析器配置
 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  includePaths: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.py"],
  excludePaths: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  rules: {
    "complexity.cyclomatic": {
      enabled: true,
      severity: "warning",
      threshold: 10,
    },
    "complexity.cognitive": {
      enabled: true,
      severity: "warning",
      threshold: 15,
    },
    maintainability: {
      enabled: true,
      severity: "info",
      threshold: 65,
    },
    "syntax.error": {
      enabled: true,
      severity: "error",
      threshold: 0.1, // 错误节点比例阈值
    },
  },
};

/**
 * 代码分析器实现类
 */
export class Analyzer implements IAnalyzer {
  private parser: TreeSitterParser;
  private config: AnalyzerConfig;
  private ruleEngine: RuleEngine | null = null; // 添加默认值避免空引用

  /**
   * 创建代码分析器
   * @param config 分析器配置
   */
  constructor(config?: Partial<AnalyzerConfig>) {
    this.parser = new TreeSitterParser();
    this.config = { ...DEFAULT_CONFIG, ...(config || {}) };

    // 初始化规则引擎
    if (this.config.rulesConfig) {
      this.ruleEngine = new RuleEngine(this.config.rulesConfig);
    }
  }

  /**
   * 分析单个文件
   * @param filePath 文件路径
   * @param content 文件内容，如果未提供则从文件系统读取
   * @returns 分析结果
   */
  async analyzeFile(
    filePath: string,
    content?: string
  ): Promise<FileAnalysisResult> {
    if (this.config.debugMode) {
      console.log(`[Debug] 开始分析文件: ${filePath}`);
    }
    try {
      // 获取文件内容
      if (!content) {
        content = await readFileAsync(filePath, "utf-8");
      }

      // 检测语言并解析
      const language = this.parser.detectLanguage(filePath);
      const parseResult = this.parser.parse(content, language, filePath);

      // 从解析结果中提取原始树和统一节点（如果有）
      const { tree, unified, hasErrors, errorRatio } = parseResult;
      const rootNode = tree.rootNode;

      if (this.config.debugMode) {
        console.log(`[Debug] 文件 ${filePath} 解析完成，语言: ${language}`);
        if (unified) {
          console.log(
            `[Debug] 文件 ${filePath} 生成统一节点: ${unified.length}个`
          );
        }
      }

      // 初始化结果
      const result: FileAnalysisResult = {
        filePath,
        language,
        metrics: {},
        findings: [],
        dependencies: [],
      };

      // 检查语法错误
      if (hasErrors && this.isRuleEnabled("syntax.error")) {
        result.findings.push(
          this.createSyntaxErrorFinding(filePath, errorRatio || 0)
        );
      }

      // 计算复杂度指标
      try {
        // 使用统一节点或原始AST计算复杂度
        const useUnified = unified && unified.length > 0;

        result.metrics.cyclomaticComplexity = calculateCyclomaticComplexity(
          useUnified ? { unifiedNodes: unified } : tree
        );

        result.metrics.cognitiveComplexity = calculateCognitiveComplexity(
          useUnified ? { unifiedNodes: unified } : tree
        );

        result.metrics.maintainabilityIndex = calculateMaintainabilityIndex(
          useUnified ? { unifiedNodes: unified } : tree,
          content
        );

        if (this.config.debugMode) {
          console.log(`[Debug] 文件 ${filePath} 复杂度指标计算完成。`);
        }
      } catch (error) {
        console.warn(`计算复杂度指标时出错: ${error}`);
      }

      // 分析函数和方法
      try {
        // 使用统一节点或原始AST分析函数
        const functions = analyzeFunctions(unified || tree);
        if (this.config.debugMode) {
          console.log(
            `[Debug] 文件 ${filePath} 分析到 ${functions.length} 个函数。`
          );
        }
        for (const func of functions) {
          if (
            func.cyclomaticComplexity >
            this.getThreshold("complexity.cyclomatic")
          ) {
            result.findings.push({
              id: "complexity.cyclomatic.high",
              type: "METRIC" as FindingType,
              message: `函数 '${func.name}' 的圈复杂度 (${
                func.cyclomaticComplexity
              }) 超过阈值 (${this.getThreshold("complexity.cyclomatic")})`,
              severity: this.getSeverity("complexity.cyclomatic"),
              location: func.location,
              details: {
                metricName: "cyclomaticComplexity",
                value: func.cyclomaticComplexity,
                threshold: this.getThreshold("complexity.cyclomatic"),
                functionName: func.name,
              },
            });
          }

          if (
            func.cognitiveComplexity > this.getThreshold("complexity.cognitive")
          ) {
            result.findings.push({
              id: "complexity.cognitive.high",
              type: "METRIC" as FindingType,
              message: `函数 '${func.name}' 的认知复杂度 (${
                func.cognitiveComplexity
              }) 超过阈值 (${this.getThreshold("complexity.cognitive")})`,
              severity: this.getSeverity("complexity.cognitive"),
              location: func.location,
              details: {
                metricName: "cognitiveComplexity",
                value: func.cognitiveComplexity,
                threshold: this.getThreshold("complexity.cognitive"),
                functionName: func.name,
              },
            });
          }
        }
      } catch (error) {
        console.warn(`分析函数时出错: ${error}`);
      }

      // 分析类
      try {
        const classes = analyzeClasses(tree);
        if (this.config.debugMode) {
          console.log(
            `[Debug] 文件 ${filePath} 分析到 ${classes.length} 个类。`
          );
        }
        for (const cls of classes) {
          if (cls.methods.length > 10) {
            result.findings.push({
              id: "class.too-many-methods",
              type: "CODE_SMELL" as FindingType,
              message: `类 '${cls.name}' 包含过多方法 (${cls.methods.length})`,
              severity: "warning" as Severity,
              location: cls.location,
              details: {
                className: cls.name,
                methodCount: cls.methods.length,
                threshold: 10,
              },
            });
          }
        }
      } catch (error) {
        console.warn(`分析类时出错: ${error}`);
      }

      // 分析模块依赖
      try {
        const dependencies = analyzeModuleDependencies(
          tree,
          filePath,
          this.config.debugMode ?? false
        );
        result.dependencies = dependencies;
        if (this.config.debugMode) {
          console.log(
            `[Debug] 文件 ${filePath} 检测到 ${
              dependencies.length
            } 个原始依赖: ${JSON.stringify(dependencies)}`
          );
        }
      } catch (error) {
        console.warn(`分析模块依赖时出错: ${error}`);
      }

      // 将原有的硬编码规则检查逻辑替换为规则引擎
      if (this.ruleEngine) {
        // 执行文件级规则
        const ruleFindings = this.ruleEngine.evaluateFile(result);
        result.findings = [...result.findings, ...ruleFindings];
        if (this.config.debugMode) {
          console.log(
            `[Debug] 文件 ${filePath} 规则引擎执行完毕，发现 ${ruleFindings.length} 个发现。`
          );
        }
      }

      if (this.config.debugMode) {
        console.log(`[Debug] 文件 ${filePath} 分析完成。`);
      }
      return result;
    } catch (error) {
      console.error(`分析文件 ${filePath} 时出错: ${error}`);
      throw error;
    }
  }

  /**
   * 分析整个项目
   * @param rootPath 项目根目录
   * @param exclude 排除的文件或目录
   * @returns 完整的分析结果，包括文件详情、规则发现、依赖图和稳定性指标
   */
  async analyzeProject(
    rootPath: string,
    exclude: string[] = []
  ): Promise<AnalysisResult> {
    const allFiles = await glob(this.config.includePaths, {
      cwd: rootPath,
      ignore: [...this.config.excludePaths, ...exclude],
      nodir: true,
    });

    const results: FileAnalysisResult[] = [];
    // 将rootPath转换为绝对路径
    const absoluteRootPath = path.resolve(process.cwd(), rootPath);

    for (const file of allFiles) {
      const filePath = path.join(absoluteRootPath, file);
      if (this.config.debugMode) {
        console.log(`[Debug] 正在分析文件: ${filePath}`);
      }
      try {
        const result = await this.analyzeFile(filePath);
        results.push(result);
      } catch (error) {
        console.error(`分析文件 ${filePath} 时出错:`, error);
      }
    }

    // 生成依赖图
    const dependencyGraph = this.generateDependencyGraph(results);

    // 计算稳定性指标
    const stabilityMetrics = calculateStability(dependencyGraph);

    // 计算风险评分
    const riskScores = calculateAllRiskScores(
      dependencyGraph,
      stabilityMetrics
    );

    // 聚合所有发现
    const allFindings = results.reduce(
      (acc, result) => [...acc, ...result.findings],
      [] as Finding[]
    );

    // 运行项目级规则
    if (this.ruleEngine) {
      const projectFindings = this.ruleEngine.evaluateProject(
        results,
        dependencyGraph
      );
      allFindings.push(...projectFindings);
    }

    return {
      files: results,
      findings: allFindings,
      dependencyGraph,
      stabilityMetrics,
      riskScores,
    };
  }

  /**
   * 基于分析结果生成依赖图
   * @param results 分析结果数组
   * @returns 依赖图
   */
  generateDependencyGraph(results: FileAnalysisResult[]): DependencyGraph {
    try {
      const builder = new DependencyGraphBuilder(
        this.config.debugMode ?? false
      );
      const graph = builder.buildGraph(results);
      return graph;
    } catch (error) {
      console.error(`生成依赖图时出错: ${error}`);
      throw error;
    }
  }

  /**
   * 获取规则阈值
   * @param ruleId 规则ID
   * @returns 阈值，如果未配置则返回默认值
   */
  private getThreshold(ruleId: string): number {
    const rule = this.config.rules[ruleId];
    return rule?.threshold ?? DEFAULT_CONFIG.rules[ruleId]?.threshold ?? 0;
  }

  /**
   * 获取规则严重性
   * @param ruleId 规则ID
   * @returns 严重性级别
   */
  private getSeverity(ruleId: string): Severity {
    const rule = this.config.rules[ruleId];
    return (rule?.severity ??
      DEFAULT_CONFIG.rules[ruleId]?.severity ??
      "info") as Severity;
  }

  // 新增: 增量分析指定文件集合，并基于上一轮结果合并
  async analyzeFiles(
    filePaths: string[],
    prevResult: AnalysisResult
  ): Promise<AnalysisResult> {
    const impactedSet = new Set<string>(filePaths.map((p) => path.resolve(p)));

    // 1. 过滤出未受影响的旧结果
    const retainedResults: FileAnalysisResult[] = prevResult.files.filter(
      (res) => !impactedSet.has(path.resolve(res.filePath))
    );

    // 2. 重新分析受影响文件（若仍存在）
    const reAnalyzed: FileAnalysisResult[] = [];
    for (const filePath of impactedSet) {
      if (!fs.existsSync(filePath)) {
        // 文件已删除，跳过分析
        continue;
      }
      try {
        const result = await this.analyzeFile(filePath);
        reAnalyzed.push(result);
      } catch (error) {
        console.error(`增量分析文件 ${filePath} 失败:`, error);
      }
    }

    const mergedResults = [...retainedResults, ...reAnalyzed];

    // 3. 重新生成依赖图与相关指标
    const dependencyGraph = this.generateDependencyGraph(mergedResults);
    const stabilityMetrics = calculateStability(dependencyGraph);
    const riskScores = calculateAllRiskScores(
      dependencyGraph,
      stabilityMetrics
    );

    // 4. 汇总发现
    const allFindings = mergedResults.reduce(
      (acc, r) => [...acc, ...r.findings],
      [] as Finding[]
    );
    if (this.ruleEngine) {
      const projectFindings = this.ruleEngine.evaluateProject(
        mergedResults,
        dependencyGraph
      );
      allFindings.push(...projectFindings);
    }

    return {
      files: mergedResults,
      findings: allFindings,
      dependencyGraph,
      stabilityMetrics,
      riskScores,
    };
  }

  /**
   * 创建语法错误Finding
   * @param filePath 文件路径
   * @param errorRatio 错误节点比例
   * @returns 语法错误Finding
   */
  private createSyntaxErrorFinding(
    filePath: string,
    errorRatio: number
  ): Finding {
    return {
      id: "syntax.error",
      type: "SYNTAX_ERROR" as FindingType,
      message: `文件 '${path.basename(
        filePath
      )}' 包含语法错误，错误节点比例: ${(errorRatio * 100).toFixed(1)}%`,
      severity: this.getSeverity("syntax.error"),
      location: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
      },
      details: {
        metricName: "syntaxErrorRatio",
        value: errorRatio,
        threshold: this.getThreshold("syntax.error"),
        filePath,
      },
    };
  }

  /**
   * 检查规则是否启用
   * @param ruleId 规则ID
   * @returns 是否启用
   */
  private isRuleEnabled(ruleId: string): boolean {
    return (
      this.config.rules[ruleId] !== undefined &&
      this.config.rules[ruleId].enabled
    );
  }
}

/**
 * 分析单个文件的便捷函数
 * @param filePath 文件路径
 * @param content 文件内容，如果未提供则从文件系统读取
 * @returns 分析结果
 */
export async function analyzeFile(
  filePath: string,
  content?: string
): Promise<FileAnalysisResult> {
  const analyzer = new Analyzer();
  return analyzer.analyzeFile(filePath, content);
}

/**
 * 分析整个项目的便捷函数
 * @param rootPath 项目根目录
 * @param exclude 排除的文件或目录
 * @returns 所有文件的分析结果
 */
export async function analyzeProject(
  rootPath: string,
  exclude: string[] = []
): Promise<AnalysisResult> {
  const analyzer = new Analyzer();
  return analyzer.analyzeProject(rootPath, exclude);
}

// 新增: 增量分析便捷函数
export async function analyzeFiles(
  filePaths: string[],
  prevResult: AnalysisResult
): Promise<AnalysisResult> {
  const analyzer = new Analyzer();
  return analyzer.analyzeFiles(filePaths, prevResult);
}
