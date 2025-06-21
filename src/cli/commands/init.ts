/**
 * @file 初始化命令
 * @description 项目初始化命令实现
 * @module cli/commands/init
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

/**
 * 注册初始化命令
 * @param program Commander程序实例
 */
export function initCommand(program: Command): void {
  program
    .command("init")
    .description("初始化AIFocus配置文件")
    .option("-p, --path <path>", "项目路径", process.cwd())
    .action(async (options) => {
      try {
        console.log(chalk.blue("🚀 正在初始化AIFocus..."));

        const configPath = path.join(options.path, "aifocus.config.yaml");

        // 检查配置文件是否已存在
        if (fs.existsSync(configPath)) {
          console.log(chalk.yellow("⚠️ 配置文件已存在，将被覆盖"));
        }

        // 创建默认配置
        const defaultConfig = `# AIFocus 配置文件

project:
  name: "项目名称"
  type: "typescript"

# 分析路径
analyzePaths:
  - "**/*.{ts,js,tsx,jsx}"

# 排除路径
excludePaths:
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/build/**"

# 输出配置
output:
  reports:
    directory: "./.aifocus"
    focusFile: "Focus.md"
    reviewFile: "CodeReview.md"

# 规则配置
rules:
  "function.complexityLimit":
    enabled: true
    severity: "warning"
    threshold: 10
  
  "function.lengthLimit":
    enabled: true
    severity: "warning"
    threshold: 30
  
  "class.methodCountLimit":
    enabled: true
    severity: "warning"
    threshold: 10
  
  "class.cohesion":
    enabled: true
    severity: "info"
    threshold: 0.5
  
  "module.circularDependency":
    enabled: true
    severity: "warning"

# AI配置
ai:
  enabled: true
  provider: "gemini"
  model: "gemini-pro"
  temperature: 0.2
  tokenLimit: 4096
`;

        // 写入配置文件
        fs.writeFileSync(configPath, defaultConfig, "utf-8");

        console.log(chalk.green("✅ AIFocus初始化成功！"));
        console.log(chalk.gray(`配置文件已创建: ${configPath}`));
        console.log(
          chalk.blue("现在可以使用 `aifocus analyze` 来分析您的代码")
        );
      } catch (error) {
        console.error(
          chalk.red("❌ 初始化失败:"),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
