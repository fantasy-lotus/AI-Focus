/**
 * @file 监视命令
 * @description 文件监视命令实现 (全量分析+差异渲染)
 * @module cli/commands/watch
 * @see {@link /agentic-docs/.module-docs/AIFocus/cli/README.md}
 */

import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import { loadConfig } from "../../config";
import { FileWatcherService, FileEventType, FileEvent } from "../../watcher";
import { Orchestrator } from "../../orchestrator";
import { AnalysisResult } from "../../analyzer/types";
import { MarkdownGenerator, generateDiffSection } from "../../output";

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
    .action(async (options) => {
      try {
        console.log(chalk.blue("👀 AIFocus 文件监视器启动..."));

        // 解析路径 & 加载配置
        const rootPath: string = options.path;
        const configPath = path.resolve(rootPath, options.config);
        const config = await loadConfig(configPath);

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

          console.log(
            chalk.yellow(`📝 检测到文件变更: ${changedFiles.size} 个文件`)
          );

          // 执行全量分析 (性能优化留待下一阶段)
          const orchestrationOutput = await orchestrator.run(
            !config.ai.enabled
          );

          // 提取 AnalysisResult
          const currentResult: AnalysisResult =
            "analysisResult" in orchestrationOutput
              ? orchestrationOutput.analysisResult
              : (orchestrationOutput as AnalysisResult);

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

          console.log(chalk.green("✅ 分析完成并更新报告！"));

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
          }
        };

        // 注册事件监听
        watcher.on(FileEventType.CHANGED, handleFileEvent);
        watcher.on(FileEventType.ADDED, handleFileEvent);

        // 启动监视
        watcher.start(rootPath);

        console.log(
          chalk.green(`✅ 监视器已启动，去抖间隔: ${debounceSeconds} 秒`)
        );
        console.log(chalk.gray("按 Ctrl+C 停止监视"));

        // 退出处理
        process.on("SIGINT", async () => {
          console.log(chalk.blue("\n👋 停止监视..."));
          await watcher.stop();
          process.exit(0);
        });
      } catch (error) {
        console.error(
          chalk.red("❌ 监视失败:"),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
