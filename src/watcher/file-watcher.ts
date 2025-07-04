/**
 * @file 文件监控服务
 * @description 监控文件变化并触发增量分析
 * @module watcher/file-watcher
 * @see {@link /agentic-docs/.module-docs/AIFocus/watcher/README.md} - 文件监控模块文档
 */

import * as chokidar from "chokidar";
import * as path from "path";
import * as fs from "fs";
import { performance } from "perf_hooks";
import { promisify } from "util";
import { Analyzer } from "../analyzer";
import { AnalysisResult } from "../analyzer/types";
import TreeSitterParser, { ParseResult } from "../analyzer/parser";
import { createLogger } from "../utils/logger";

const readFileAsync = promisify(fs.readFile);
const logger = createLogger("info");

/**
 * 文件监控服务类
 */
export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private rootPath: string;
  private excludePaths: string[];
  private lastAnalysisResult: AnalysisResult | null = null;
  private parser: TreeSitterParser;
  private analyzer: Analyzer;
  private fileCache: Map<
    string,
    { content: string; parseResult?: ParseResult }
  > = new Map();
  private maxWatchTime: number = 500; // 最大监控处理时间（毫秒）

  /**
   * 创建文件监控服务
   * @param rootPath 根路径
   * @param excludePaths 排除路径
   */
  constructor(rootPath: string, excludePaths: string[] = []) {
    this.rootPath = rootPath;
    this.excludePaths = excludePaths;
    this.parser = new TreeSitterParser();
    this.analyzer = new Analyzer();
  }

  /**
   * 启动监控
   * @param callback 文件变化回调函数
   */
  async start(
    callback: (result: AnalysisResult) => void,
    initialResult?: AnalysisResult
  ): Promise<void> {
    if (initialResult) {
      this.lastAnalysisResult = initialResult;

      // 缓存初始文件内容和解析结果，用于后续增量分析
      for (const fileResult of initialResult.files) {
        try {
          const content = await readFileAsync(fileResult.filePath, "utf-8");
          const language = this.parser.detectLanguage(fileResult.filePath);
          const parseResult = this.parser.parse(
            content,
            language,
            fileResult.filePath
          );
          this.fileCache.set(fileResult.filePath, { content, parseResult });
        } catch (error) {
          logger.warn(`无法缓存文件 ${fileResult.filePath}: ${error}`);
        }
      }
    }

    // 创建监控实例
    this.watcher = chokidar.watch(this.rootPath, {
      ignored: this.excludePaths,
      ignoreInitial: true,
    });

    // 监听变化事件
    this.watcher
      .on("add", async (path) => this.handleFileChange("add", path, callback))
      .on("change", async (path) =>
        this.handleFileChange("change", path, callback)
      )
      .on("unlink", async (path) =>
        this.handleFileChange("delete", path, callback)
      );

    logger.info(`开始监控 ${this.rootPath} 的文件变化`);
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info("停止文件监控");
    }
  }

  /**
   * 处理文件变化
   * @param event 事件类型
   * @param filePath 文件路径
   * @param callback 回调函数
   */
  private async handleFileChange(
    event: "add" | "change" | "delete",
    filePath: string,
    callback: (result: AnalysisResult) => void
  ): Promise<void> {
    const startTime = performance.now();

    // 检查文件扩展名是否受支持
    const language = this.parser.detectLanguage(filePath);
    const supportedLanguages = this.parser.getSupportedLanguages();

    if (!supportedLanguages.includes(language)) {
      logger.debug(`忽略不支持的文件类型: ${filePath}`);
      return;
    }

    logger.info(
      `检测到文件${
        event === "add" ? "新增" : event === "change" ? "变更" : "删除"
      }: ${filePath}`
    );

    if (!this.lastAnalysisResult) {
      logger.warn("没有初始分析结果，无法执行增量分析");
      return;
    }

    try {
      if (event === "add" || event === "change") {
        const newContent = await readFileAsync(filePath, "utf-8");
        const cachedFile = this.fileCache.get(filePath);

        // 如果文件内容没有变化，则跳过（优化性能）
        if (cachedFile && cachedFile.content === newContent) {
          logger.debug(`文件内容未变化，跳过分析: ${filePath}`);
          return;
        }

        // 计时开始
        const parseStartTime = performance.now();

        let parseResult: ParseResult;

        // 如果是变更事件且有缓存的解析结果，使用增量解析
        if (event === "change" && cachedFile && cachedFile.parseResult) {
          const previousTree = cachedFile.parseResult.tree;
          parseResult = this.parser.parseIncremental(
            previousTree,
            newContent,
            language,
            filePath
          );
        } else {
          // 否则使用全量解析
          parseResult = this.parser.parse(newContent, language, filePath);
        }

        // 缓存新内容和解析结果
        this.fileCache.set(filePath, { content: newContent, parseResult });

        // 计算解析耗时
        const parseTime = performance.now() - parseStartTime;
        logger.debug(`解析文件耗时: ${parseTime.toFixed(2)}ms`);

        // 如果有语法错误且错误比例过高，记录警告并直接返回错误结果
        if (parseResult.hasErrors && (parseResult.errorRatio || 0) > 0.1) {
          logger.warn(
            `文件 ${filePath} 包含语法错误，错误节点比例: ${(
              (parseResult.errorRatio || 0) * 100
            ).toFixed(1)}%`
          );

          // 创建一个最小的分析结果，只包含语法错误信息
          const minimalResult: AnalysisResult = {
            files: [],
            findings: [
              {
                id: "syntax.error",
                type: "SYNTAX_ERROR",
                message: `文件 '${path.basename(
                  filePath
                )}' 包含语法错误，错误节点比例: ${(
                  (parseResult.errorRatio || 0) * 100
                ).toFixed(1)}%`,
                severity: "error",
                location: {
                  startLine: 1,
                  startColumn: 1,
                  endLine: 1,
                  endColumn: 1,
                },
                details: {
                  metricName: "syntaxErrorRatio",
                  value: parseResult.errorRatio,
                  threshold: 0.1,
                  filePath,
                },
              },
            ],
          };

          callback(minimalResult);
          return;
        }

        // 检查性能，确保在目标时间内
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;

        if (elapsedTime > this.maxWatchTime) {
          logger.warn(
            `文件解析已超出目标时间 (${elapsedTime.toFixed(2)}ms > ${
              this.maxWatchTime
            }ms)，降级为异步处理`
          );
        }
      } else if (event === "delete") {
        // 删除文件缓存
        this.fileCache.delete(filePath);
      }

      // 执行增量分析
      const fileToAnalyze = [filePath];
      const newResults = await Promise.all(
        fileToAnalyze.map(async (file) => {
          // 仅分析非删除文件
          if (event !== "delete") {
            const content = await readFileAsync(file, "utf-8");
            return this.analyzer.analyzeFile(file, content);
          }
          return null;
        })
      );

      // 更新分析结果
      if (this.lastAnalysisResult) {
        const updatedResult: AnalysisResult = { ...this.lastAnalysisResult };

        // 更新文件分析结果
        updatedResult.files = updatedResult.files.filter(
          (f) => !fileToAnalyze.includes(f.filePath) || event !== "delete"
        );

        // 添加新的分析结果
        newResults.forEach((result) => {
          if (result) {
            const index = updatedResult.files.findIndex(
              (f) => f.filePath === result.filePath
            );
            if (index >= 0) {
              updatedResult.files[index] = result;
            } else {
              updatedResult.files.push(result);
            }
          }
        });

        // 更新所有发现
        updatedResult.findings = updatedResult.files.flatMap((f) => f.findings);

        this.lastAnalysisResult = updatedResult;
      }

      // 计算总耗时
      const totalTime = performance.now() - startTime;
      logger.info(`增量分析完成 (${totalTime.toFixed(2)}ms)`);

      // 性能断言，确保在目标时间内
      if (totalTime > this.maxWatchTime) {
        logger.warn(
          `增量分析超出目标时间 (${totalTime.toFixed(2)}ms > ${
            this.maxWatchTime
          }ms)`
        );
      }

      // 调用回调函数
      if (this.lastAnalysisResult) {
        callback(this.lastAnalysisResult);
      }
    } catch (error) {
      logger.error(`处理文件变化时出错: ${error}`);
    }
  }
}
