/**
 * @file 监视命令
 * @description 文件监视命令实现 (全量分析+差异渲染)
 * @module cli/commands/watch
 * @see {@link /agentic-docs/.module-docs/AIFocus/cli/commands/watch.md} - watch 命令文档
 */

import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import { loadConfig } from "../../config";
import { FileWatcherService, FileEventType, FileEvent } from "../../watcher";
import { Orchestrator } from "../../orchestrator";
import { AnalysisResult } from "../../analyzer/types";
import { MarkdownGenerator, generateDiffSection } from "../../output";
import { createLogger } from "../../utils/logger";

/**
 * 注册监视命令
 * @param program Commander实例
 */
export function watchCommand(program: Command): void {
  program
    .command("watch")
    .description("监视项目文件变更并自动分析")
    .option("-p, --path <path>", "项目路径", process.cwd())
    .option("-c, --config <config>", "配置文件路径", "./aifocus.config.yaml")
    .option("-q, --quiet", "静默模式，仅输出错误")
    .option("-d, --debug", "调试模式，输出详细信息")
    .action(async (options) => {
      try {
        // 解析路径 & 加载配置
        const rootPath: string = options.path;
        const configPath = path.resolve(rootPath, options.config);
        const config = await loadConfig(configPath);

        // 根据 CLI 参数覆盖 logLevel
        if (options.quiet) {
          config.logLevel = "silent";
        } else if (options.debug) {
          config.logLevel = "debug";
        }

        const logger = createLogger(config.logLevel);

        logger.info(chalk.blue("👀 AIFocus 文件监视器启动..."));

        // 增量分析配置
        const debounceSeconds = config.incremental?.debounceSeconds ?? 5;
        const debounceMs = debounceSeconds * 1000;

        // 初始化 Orchestrator 与辅助工具
        const orchestrator = new Orchestrator(config, rootPath);
        const mdGenerator = new MarkdownGenerator(
          config.output.reports.directory
        );

        // 文件监视器
        const watcher = new FileWatcherService(config);

        // 运行状态
        const changedFiles: Set<string> = new Set();
        let analysisTimer: NodeJS.Timeout | null = null;
        let prevResult: AnalysisResult | null = null;

        // 触发分析
        const triggerAnalysis = async () => {
          if (changedFiles.size === 0) return;

          logger.info(
            chalk.yellow(`📝 检测到文件变更: ${changedFiles.size} 个文件`)
          );

          let currentResult: AnalysisResult;

          // 判断是否启用增量
          const useIncremental =
            config.incremental?.enabled && prevResult !== null;

          if (useIncremental) {
            logger.debug(
              `使用增量分析模式，上一次结果节点数: ${
                prevResult?.dependencyGraph?.nodes.size || 0
              }`
            );
            currentResult = await orchestrator.runIncremental(
              new Set(changedFiles),
              prevResult as AnalysisResult
            );
          } else {
            logger.info("首次运行或增量已禁用，使用全量分析...");
            const orchestrationOutput = await orchestrator.run(
              !config.ai.enabled
            );

            // 提取 AnalysisResult
            currentResult =
              "analysisResult" in orchestrationOutput
                ? orchestrationOutput.analysisResult
                : (orchestrationOutput as AnalysisResult);
          }

          // 生成 Markdown diff 区块
          const diffSection = generateDiffSection(
            prevResult,
            currentResult,
            new Set(changedFiles)
          );

          // 更新 Focus 报告
          const focusReportPath = path.join(
            config.output.reports.directory,
            config.output.reports.focusFile
          );
          await mdGenerator.appendOrUpdateSection(
            focusReportPath,
            "INCREMENTAL_CHANGES",
            diffSection
          );

          // 若 AI 启用，尝试在最新 review 报告顶部插入相同区块
          if (config.ai.enabled) {
            const reviewReportPath = path.join(
              config.output.reports.directory,
              "ai-code-review-latest.md"
            );
            await mdGenerator.appendOrUpdateSection(
              reviewReportPath,
              "INCREMENTAL_CHANGES",
              diffSection
            );
          }

          logger.info(chalk.green("✅ 分析完成并更新报告！"));

          // 更新状态
          prevResult = currentResult;
          changedFiles.clear();
        };

        // 文件事件处理器
        const handleFileEvent = (event: FileEvent) => {
          if (
            event.type === FileEventType.CHANGED ||
            event.type === FileEventType.ADDED
          ) {
            changedFiles.add(event.path);
            if (analysisTimer) clearTimeout(analysisTimer);
            analysisTimer = setTimeout(triggerAnalysis, debounceMs);
            logger.debug(
              `文件 ${event.path} ${
                event.type === FileEventType.CHANGED ? "已更改" : "已添加"
              }`
            );
          }
        };

        // 注册事件监听
        watcher.on(FileEventType.CHANGED, handleFileEvent);
        watcher.on(FileEventType.ADDED, handleFileEvent);

        // 启动监视
        watcher.start(rootPath);

        logger.info(
          chalk.green(`✅ 监视器已启动，去抖间隔: ${debounceSeconds} 秒`)
        );
        logger.info(chalk.gray("按 Ctrl+C 停止监视"));

        // 退出处理
        process.on("SIGINT", async () => {
          logger.info(chalk.blue("\n👋 停止监视..."));
          await watcher.stop();
          process.exit(0);
        });
      } catch (error) {
        const logger = createLogger(options.quiet ? "silent" : "info");
        logger.error(
          chalk.red("❌ 监视失败:"),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
