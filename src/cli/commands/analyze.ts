/**
 * @file 分析命令
 * @description 代码分析命令实现
 * @module cli/commands/analyze
 */

import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import { loadConfig } from "../../config";
import { Orchestrator } from "../../orchestrator";
import { AnalysisResult } from "../../analyzer/types";

function printHealthSummary(analysisResult: AnalysisResult) {
  console.log(chalk.cyan.bold("\n--- 代码健康度摘要 ---\n"));

  // 打印最不稳定的模块
  if (analysisResult.stabilityMetrics) {
    const unstableModules = Object.entries(analysisResult.stabilityMetrics)
      .sort(([, a], [, b]) => b.stability - a.stability)
      .slice(0, 5);

    console.log(chalk.yellow("Top 5 最不稳定 (易变) 模块:"));
    unstableModules.forEach(([file, metric]) => {
      console.log(
        `  - ${path.basename(file)} ${chalk.gray(
          `(Stability: ${metric.stability.toFixed(2)})`
        )}`
      );
    });
    console.log("");
  }

  // 打印风险最高的模块
  if (analysisResult.riskScores) {
    const riskyModules = Object.entries(analysisResult.riskScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    console.log(chalk.red("Top 5 变更风险最高模块:"));
    riskyModules.forEach(([file, score]) => {
      console.log(
        `  - ${path.basename(file)} ${chalk.gray(
          `(Risk Score: ${score.toFixed(2)})`
        )}`
      );
    });
    console.log("");
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
    .action(async (options) => {
      try {
        console.log(chalk.blue("🚀 AIFocus Orchestrator 启动..."));

        // 加载配置
        const configPath = path.resolve(options.path, options.config);
        const config = await loadConfig(configPath);

        // 如果配置中启用了AI，则使用Orchestrator
        if (config.ai?.enabled) {
          // 创建并运行Orchestrator
          const orchestrator = new Orchestrator(config, options.path);
          const result = await orchestrator.run();
          printHealthSummary(result.analysisResult);
        } else {
          // 在此可以保留或实现旧的、不带AI的分析逻辑
          console.log(
            chalk.yellow("AI 功能未在配置中启用。跳过AI增强的分析。")
          );
          console.log(
            chalk.gray(
              "如需启用，请在 aifocus.config.yaml 中设置 'ai.enabled = true'"
            )
          );
        }

        console.log(chalk.green("✅ 操作完成！"));
      } catch (error) {
        console.error(
          chalk.red("❌ 操作失败:"),
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && options.verbose) {
          console.error(chalk.gray(error.stack));
        }
        process.exit(1);
      }
    });
}
