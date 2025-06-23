/**
 * @file 分析命令
 * @description 代码分析命令实现
 * @module cli/commands/analyze
 * @see {@link /agentic-docs/.module-docs/AIFocus/cli/commands/analyze.md} - analyze 命令文档
 */

import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import { loadConfig } from "../../config";
import { Orchestrator } from "../../orchestrator";
import { AnalysisResult } from "../../analyzer/types";
import { createLogger } from "../../utils/logger";

function printHealthSummary(
  analysisResult: AnalysisResult,
  logger: ReturnType<typeof createLogger>
) {
  logger.info(chalk.cyan.bold("\n--- 代码健康度摘要 ---\n"));

  // 打印最不稳定的模块
  if (analysisResult.stabilityMetrics) {
    const unstableModules = Object.entries(analysisResult.stabilityMetrics)
      .sort(([, a], [, b]) => b.stability - a.stability)
      .slice(0, 5);

    logger.info(chalk.yellow("Top 5 最不稳定 (易变) 模块:"));
    unstableModules.forEach(([file, metric]) => {
      logger.info(
        `  - ${path.basename(file)} ${chalk.gray(
          `(Stability: ${metric.stability.toFixed(2)})`
        )}`
      );
    });
    logger.info("");
  }

  // 打印风险最高的模块
  if (analysisResult.riskScores) {
    const riskyModules = Object.entries(analysisResult.riskScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    logger.info(chalk.red("Top 5 变更风险最高模块:"));
    riskyModules.forEach(([file, score]) => {
      logger.info(
        `  - ${path.basename(file)} ${chalk.gray(
          `(Risk Score: ${score.toFixed(2)})`
        )}`
      );
    });
    logger.info("");
  }
}

/**
 * 注册分析命令
 * @param program Commander程序实例
 */
export function analyzeCommand(program: Command): void {
  program
    .command("analyze")
    .description("使用AI增强的Orchestrator分析项目代码并生成审查和文档报告")
    .option("-p, --path <path>", "项目路径", process.cwd())
    .option("-c, --config <config>", "配置文件路径", "./aifocus.config.yaml")
    .option("-v, --verbose", "显示详细信息")
    .option("-q, --quiet", "静默模式，仅输出错误")
    .option("-d, --debug", "调试模式，输出详细信息")
    .action(async (options) => {
      try {
        // 加载配置
        const configPath = path.resolve(options.path, options.config);
        const config = await loadConfig(configPath);

        // 根据 CLI 参数覆盖 logLevel
        if (options.quiet) {
          config.logLevel = "silent";
        } else if (options.debug) {
          config.logLevel = "debug";
        }

        const logger = createLogger(config.logLevel);

        logger.info(chalk.blue("🚀 AIFocus Orchestrator 启动..."));

        // 创建Orchestrator实例
        const orchestrator = new Orchestrator(config, options.path);

        // 根据AI配置决定执行路径
        if (config.ai?.enabled) {
          logger.info(
            chalk.cyan("正在执行完整分析 (包含AI代码审查和文档生成)...")
          );
          const result = await orchestrator.run();
          if ("analysisResult" in result) {
            printHealthSummary(result.analysisResult, logger);
          }
        } else {
          logger.warn(chalk.yellow("AI 功能未在配置中启用。"));
          logger.info(chalk.cyan("正在执行静态分析并生成Focus报告..."));
          // 仅运行分析和报告生成，跳过AI部分
          const result = await orchestrator.run(true); // 传入一个标志跳过AI
          printHealthSummary(result as AnalysisResult, logger);
        }

        logger.info(chalk.green("✅ 操作完成！"));
      } catch (error) {
        const logger = createLogger(options.quiet ? "silent" : "info");
        logger.error(
          chalk.red("❌ 操作失败:"),
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && options.verbose) {
          logger.debug(chalk.gray(error.stack));
        }
        process.exit(1);
      }
    });
}
