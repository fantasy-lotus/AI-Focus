/**
 * @file 命令注册
 * @description 注册所有CLI命令
 * @module cli/commands
 */

import { Command } from "commander";
import { initCommand } from "./init";
import { watchCommand } from "./watch";
import { analyzeCommand } from "./analyze";

/**
 * 注册所有命令到CLI程序
 * @param program Commander程序实例
 */
export function registerCommands(program: Command): void {
  initCommand(program);
  watchCommand(program);
  analyzeCommand(program);
}

export { initCommand, watchCommand, analyzeCommand };
