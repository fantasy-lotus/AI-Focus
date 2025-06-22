/**
 * @file Orchestrator
 * @description 协调分析、AI生成和报告产出的核心模块
 * @module orchestrator
 */

import { AIFocusConfig } from "../config";
import { Analyzer } from "../analyzer";
import { AiProviderFactory } from "../ai/factory";
import { IAiProvider, AITaskType } from "../ai/types";
import {
  FileAnalysisResult,
  AnalyzerConfig,
  AnalysisResult,
} from "../analyzer/types";
import { MarkdownGenerator, DocNode } from "../output/markdown-generator";
import { OrchestrationResult } from "./types";
import path from "path";
import micromatch from "micromatch";
import { createLogger, Logger } from "../utils/logger";

/**
 * AI 服务封装
 * @description 简单封装 IAiProvider，提供特定任务的调用方法
 */
class AIService {
  constructor(private aiProvider: IAiProvider) {}

  generateCodeReview(analysisResult: AnalysisResult) {
    return this.aiProvider.generate({
      taskType: AITaskType.CODE_REVIEW,
      context: {
        fileAnalysisResults: analysisResult.files,
        analysisResult: analysisResult,
      },
    });
  }

  generateDocumentation(analysisResult: AnalysisResult, projectStructure: any) {
    return this.aiProvider.generate({
      taskType: AITaskType.DOC_GENERATION,
      context: {
        fileAnalysisResults: analysisResult.files,
        analysisResult: analysisResult,
        projectStructure: projectStructure,
      },
    });
  }
}

/**
 * Orchestrator
 * @description 负责协调整个分析和生成流程
 */
export class Orchestrator {
  private analyzer: Analyzer;
  private aiService!: AIService;
  private outputGenerator: MarkdownGenerator;
  private docsOutputGenerator: MarkdownGenerator;
  private config: AIFocusConfig;
  private rootPath: string;
  private logger: Logger;

  constructor(config: AIFocusConfig, rootPath: string) {
    this.config = config;
    this.rootPath = rootPath;
    // 根据配置创建 logger
    this.logger = createLogger(this.config.logLevel ?? "info");
    const analyzerConfig: Partial<AnalyzerConfig> = {
      includePaths: config.analyzePaths,
      excludePaths: config.excludePaths,
      rules: config.rules,
      rulesConfig: config.rules,
      // 向下兼容 Analyzer 中的 debugMode 逻辑
      debugMode: (config.logLevel ?? "info") === "debug",
    };
    this.analyzer = new Analyzer(analyzerConfig);

    // 只有在AI启用时才创建AI服务
    if (this.config.ai.enabled) {
      const aiProvider = AiProviderFactory.create(config);
      this.aiService = new AIService(aiProvider);
    }

    const reportsDir = path.isAbsolute(this.config.output.reports.directory)
      ? this.config.output.reports.directory
      : path.join(this.rootPath, this.config.output.reports.directory);

    const docsDir = path.isAbsolute(this.config.output.docs.directory)
      ? this.config.output.docs.directory
      : path.join(this.rootPath, this.config.output.docs.directory);

    this.outputGenerator = new MarkdownGenerator(reportsDir);
    this.docsOutputGenerator = new MarkdownGenerator(docsDir);
  }

  public async run(
    skipAI: boolean = false
  ): Promise<OrchestrationResult | AnalysisResult> {
    this.logger.info("🚀 AIFocus Orchestrator 启动...");
    this.logger.info("开始执行AIFocus协调流程...");

    // 1. 运行分析器
    this.logger.info("步骤 1/3: 正在分析项目...");
    const analysisResult = await this.analyzer.analyzeProject(this.rootPath);
    this.logger.info(
      `分析完成，共分析 ${analysisResult.files.length} 个文件。`
    );

    // 如果跳过AI或AI未启用，则只生成Focus报告并返回
    if (skipAI || !this.config.ai.enabled) {
      this.logger.info("步骤 2/3: 跳过AI分析。");
      this.logger.info("步骤 3/3: 正在生成静态分析报告...");
      const focusReportPath = await this.outputGenerator.generateFile(
        this.generateFocusReport(analysisResult),
        this.config.output.reports.focusFile
      );
      this.logger.info(`静态分析报告已生成: ${focusReportPath}`);
      return analysisResult;
    }

    // --- AI 完整流程 ---

    // 2.1 应用文档作用域策略
    const docGenerationPayload = this.prepareDocGenerationPayload(
      analysisResult.files
    );

    // 2.2 调用 AI 生成
    this.logger.info("步骤 2/3: 正在调用 AI 生成代码审查和文档...");
    const [reviewResponse, docsResponse] = await Promise.all([
      this.aiService.generateCodeReview(analysisResult),
      // 传递新的 payload
      this.aiService.generateDocumentation(
        analysisResult,
        docGenerationPayload
      ),
    ]);
    this.logger.info("AI 生成成功。");

    // 3. 生成报告
    this.logger.info("步骤 3/3: 正在生成报告...");

    // 生成带时间戳的文件名以区分不同时间的review
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${now
      .getHours()
      .toString()
      .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
    const reviewReportFileName = `ai-code-review-${timestamp}.md`;

    // 3.1 生成传统的代码审查报告
    const reviewReportPath = await this.outputGenerator.generateFile(
      reviewResponse.text,
      reviewReportFileName
    );

    // 3.2 生成新的结构化文档
    let docsReportPath: string | undefined;
    try {
      // 清理AI可能返回的Markdown代码块标记
      const cleanedJson = docsResponse.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const docTree: DocNode = JSON.parse(cleanedJson);

      // 根据AI返回的文档树结构，动态确定文档入口路径
      if (docTree.type === "dir" && docTree.name) {
        // 新的结构，AI返回以项目名为根目录的文档树
        docsReportPath = path.join(
          this.config.output.docs.directory,
          docTree.name,
          "README.md"
        );
      } else {
        // 兼容旧格式或AI未返回预期根目录的情况
        docsReportPath = path.join(
          this.config.output.docs.directory,
          "README.md"
        );
      }

      await this.docsOutputGenerator.generate(docTree);

      // 若 docsReportPath 是相对路径，转换成绝对路径以便外部使用
      if (!path.isAbsolute(docsReportPath)) {
        docsReportPath = path.join(this.rootPath, docsReportPath);
      }

      this.logger.info(`镜像文档已生成在: ${path.dirname(docsReportPath)}`);
    } catch (error) {
      this.logger.error("解析AI返回的文档结构或生成结构化文档失败:", error);
      this.logger.error("AI返回的原始文本:", docsResponse.text);
    }

    this.logger.info(`报告已生成:`);
    this.logger.info(`  - 代码审查报告: ${reviewReportPath}`);
    if (docsReportPath) {
      this.logger.info(`  - 文档报告: ${docsReportPath}`);
    }
    this.logger.info("AIFocus协调流程执行完毕。");

    return {
      reviewReportPath: reviewReportPath,
      docsReportPath: docsReportPath,
      analysisResult: analysisResult,
    };
  }

  // 新增: 增量分析入口
  public async runIncremental(
    changedFiles: Set<string>,
    prevResult: AnalysisResult
  ): Promise<AnalysisResult> {
    this.logger.info("📈 AIFocus 增量分析启动...");

    // 1. 计算受影响文件
    const impacted = new Set<string>(changedFiles);

    if (prevResult.dependencyGraph) {
      for (const filePath of changedFiles) {
        const node = prevResult.dependencyGraph.nodes.get(filePath);
        if (node) {
          node.imports.forEach((p) => impacted.add(p));
          node.importedBy.forEach((p) => impacted.add(p));
        }
      }
    }

    this.logger.info(
      `增量分析: 共 ${impacted.size} 个文件需要重新分析 (变更 + 相邻依赖)`
    );

    try {
      const analysisResult = await this.analyzer.analyzeFiles(
        Array.from(impacted),
        prevResult
      );
      this.logger.info("增量分析完成。");
      return analysisResult;
    } catch (error) {
      this.logger.error("增量分析失败，将回退至全量分析", error as Error);
      // 回退到全量分析
      return this.analyzer.analyzeProject(this.rootPath);
    }
  }

  private generateFocusReport(analysisResult: AnalysisResult): string {
    let report = `# AIFocus - 静态分析报告\n\n`;
    report += `分析时间: ${new Date().toLocaleString()}\n`;
    report += `总文件数: ${analysisResult.files.length}\n`;
    report += `发现问题总数: ${analysisResult.findings.length}\n\n`;

    report += `## 按文件分类的问题列表\n\n`;

    if (analysisResult.files.length === 0) {
      report += "未分析任何文件。\n\n";
    } else {
      analysisResult.files.forEach((fileResult) => {
        if (fileResult.findings.length > 0) {
          report += `### 📄 \`${fileResult.filePath}\` (${fileResult.findings.length} 个问题)\n\n`;
          fileResult.findings.forEach((finding) => {
            report += `- **[${finding.severity.toUpperCase()}]**: ${
              finding.message
            }\n`;
            if (finding.location) {
              report += `  - **位置**: 行 ${finding.location.startLine}\n`;
            }
            report += "\n";
          });
        }
      });
    }

    if (analysisResult.findings.length === 0) {
      report += "✅ 未发现任何问题。\n";
    }

    return report;
  }

  private prepareDocGenerationPayload(results: FileAnalysisResult[]): {
    structure: any;
    filesToDocument: FileAnalysisResult[];
  } {
    const config = this.config.docScoping;
    const excludePatterns = config?.excludeFromDocs ?? [];

    // 1. 过滤掉被排除的文档
    const includedResults = results.filter((result) => {
      const relativePath = path.relative(this.rootPath, result.filePath);
      return !micromatch.isMatch(relativePath, excludePatterns);
    });

    const structure =
      this.buildProjectStructureWithDocStrategy(includedResults);

    return {
      structure,
      filesToDocument: includedResults,
    };
  }

  private buildProjectStructureWithDocStrategy(
    results: FileAnalysisResult[]
  ): any {
    const root: any = {
      name: path.basename(this.rootPath),
      type: "dir",
      strategy: "file-level", // default strategy
      children: [],
      files: [],
    };

    const threshold = this.config.docScoping?.moduleLevel?.threshold ?? 4;

    const directories = new Map<
      string,
      { node: any; files: FileAnalysisResult[] }
    >();
    directories.set(".", { node: root, files: [] });

    for (const result of results) {
      const relativeFilePath = path.relative(this.rootPath, result.filePath);
      const dir = path.dirname(relativeFilePath);

      // Ensure all parent directories exist
      let parentPath = ".";
      const parts = dir.split(path.sep);
      if (dir === ".") continue;

      let currentNode = root;
      for (const part of parts) {
        const currentPath =
          parentPath === "." ? part : `${parentPath}${path.sep}${part}`;
        let childDir = directories.get(currentPath);
        if (!childDir) {
          const newNode = {
            name: part,
            type: "dir",
            strategy: "file-level",
            children: [],
            files: [],
          };
          currentNode.children.push(newNode);
          childDir = { node: newNode, files: [] };
          directories.set(currentPath, childDir);
        }
        currentNode = childDir.node;
        parentPath = currentPath;
      }

      // Add file to its directory
      const dirData = directories.get(dir);
      if (dirData) {
        dirData.files.push(result);
        dirData.node.files.push(relativeFilePath);
      }
    }

    // Determine strategy for each directory
    for (const [_, dirData] of directories) {
      if (dirData.files.length > threshold) {
        dirData.node.strategy = "module-level";
      }
    }

    return root;
  }

  /**
   * 从扁平的文件分析结果构建项目结构树
   * @param results 文件分析结果
   * @returns 项目结构树
   */
  private buildProjectStructure(results: FileAnalysisResult[]): any {
    const root: any = {
      name: path.basename(this.rootPath),
      type: "dir",
      children: [],
    };

    const directories = new Set<string>();
    for (const result of results) {
      const dir = path.dirname(path.relative(this.rootPath, result.filePath));
      if (dir !== ".") {
        directories.add(dir);
      }
    }

    const sortedDirs = Array.from(directories).sort();

    for (const dir of sortedDirs) {
      const parts = dir.split(path.sep);
      let currentNode = root;

      for (const part of parts) {
        let childNode = currentNode.children.find(
          (child: any) => child.name === part && child.type === "dir"
        );
        if (!childNode) {
          childNode = { name: part, type: "dir", children: [] };
          currentNode.children.push(childNode);
        }
        currentNode = childNode;
      }
    }
    return root;
  }
}
