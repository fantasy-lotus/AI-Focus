/**
 * @file CLI入口
 * @description 命令行工具的入口点
 * @module cli
 * @see {@link /agentic-docs/.module-docs/AIFocus/cli/README.md} - CLI模块文档
 */

import { Command } from "commander";
import { registerCommands } from "./commands";

/**
 * 创建CLI程序
 * @returns CLI程序实例
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name("aifocus")
    .description("AIFocus - 智能代码分析工具")
    .version("0.1.0");

  // 注册所有命令
  registerCommands(program);

  return program;
}

/**
 * 启动CLI
 */
export function startCLI(): void {
  const program = createCLI();
  program.parse(process.argv);
}

// 如果直接运行此文件，则启动CLI
if (require.main === module) {
  startCLI();
}
