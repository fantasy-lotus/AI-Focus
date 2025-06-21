/**
 * @file 监视命令
 * @description 文件监视命令实现
 * @module cli/commands/watch
 */

import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import { loadConfig } from "../../config";
import { FileWatcherService, FileEventType, FileEvent } from "../../watcher";
import { Analyzer } from "../../analyzer";
// import { generateMarkdownReport } from "../../output";

/**
 * 注册监视命令
 * @param program Commander程序实例
 */
export function watchCommand(program: Command): void {
  program
    .command("watch")
    .description("监视项目文件变更并自动分析")
    .option("-p, --path <path>", "项目路径", process.cwd())
    .option("-c, --config <config>", "配置文件路径", "./aifocus.config.yaml")
    .option("-i, --interval <interval>", "监视间隔（秒）", "60")
    .action(async (options) => {
      try {
        console.log(chalk.blue("👀 AIFocus 文件监视器启动..."));

        // 加载配置
        const configPath = path.resolve(options.path, options.config);
        const config = await loadConfig(configPath);

        // 创建分析器
        const analyzer = new Analyzer(config);

        // 创建文件监视器
        const watcher = new FileWatcherService(config);

        // 收集变更的文件
        const changedFiles: Set<string> = new Set();
        let analysisTimer: NodeJS.Timeout | null = null;
        const interval = parseInt(options.interval, 10) * 1000;

        // 处理文件变更事件
        const handleFileEvent = (event: FileEvent) => {
          if (
            event.type === FileEventType.CHANGED ||
            event.type === FileEventType.ADDED
          ) {
            changedFiles.add(event.path);

            // 清除现有定时器
            if (analysisTimer) {
              clearTimeout(analysisTimer);
            }

            // 设置新定时器
            analysisTimer = setTimeout(async () => {
              if (changedFiles.size > 0) {
                console.log(
                  chalk.yellow(`📝 检测到文件变更: ${changedFiles.size} 个文件`)
                );

                // 执行分析
                const analysisResult = await analyzer.analyzeProject(
                  options.path
                );

                // // 输出目录
                // const outputDir =
                //   config.output?.reports?.directory || "./.aifocus";

                // // 生成报告
                // await generateMarkdownReport(analysisResult, {
                //   projectPath: options.path,
                //   outputDir,
                //   focusFile: config.output?.reports?.focusFile || "Focus.md",
                //   reviewFile:
                //     config.output?.reports?.reviewFile || "CodeReview.md",
                // });

                console.log(
                  chalk.green("✅ 分析完成！") // 报告生成部分已临时禁用
                );

                // 清空变更文件集合
                changedFiles.clear();
              }
            }, interval);
          }
        };

        // 注册事件处理器
        watcher.on(FileEventType.CHANGED, handleFileEvent);
        watcher.on(FileEventType.ADDED, handleFileEvent);

        // 启动监视
        watcher.start(options.path);

        console.log(
          chalk.green(`✅ 监视器已启动，间隔: ${options.interval}秒`)
        );
        console.log(chalk.gray("按 Ctrl+C 停止监视"));

        // 处理退出信号
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
