/**
 * @file 初始化命令
 * @description 项目初始化命令实现
 * @module cli/commands/init
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import * as yaml from "js-yaml";
import { getDefaultConfig } from "../../config/default";

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

        // 获取默认配置对象并转换为YAML字符串
        const defaultConfigObject = getDefaultConfig();
        const defaultConfigYaml = yaml.dump(defaultConfigObject);

        const fileHeader = `# AIFocus 默认配置文件
# 详细配置文档请参阅: https://github.com/your-repo/aifocus/docs/configuration.md
\n`;

        // 写入配置文件
        fs.writeFileSync(configPath, fileHeader + defaultConfigYaml, "utf-8");

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
