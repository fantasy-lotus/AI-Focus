/**
 * @file 配置加载器
 * @description 加载AIFocus配置文件
 * @module config/loader
 * @see {@link /agentic-docs/.module-docs/AIFocus/config/loader.md} - 配置加载器文档
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { AIFocusConfig } from "./types";
import { getDefaultConfig } from "./default";

/**
 * Deep merges two objects.
 * @param target The target object.
 * @param source The source object.
 * @returns The merged object.
 */
function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

/**
 * 加载配置文件
 * @param configPath 配置文件路径
 * @returns 配置对象
 */
export async function loadConfig(configPath: string): Promise<AIFocusConfig> {
  try {
    // 解析路径
    const resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(process.cwd(), configPath);

    // 检查文件是否存在
    if (!fs.existsSync(resolvedPath)) {
      console.warn(`配置文件 ${resolvedPath} 不存在，将使用默认配置。`);
      return getDefaultConfig();
    }

    // 读取并解析配置文件
    const content = fs.readFileSync(resolvedPath, "utf8");
    let config: Partial<AIFocusConfig> = {};

    // 根据文件扩展名解析不同格式
    if (resolvedPath.endsWith(".yaml") || resolvedPath.endsWith(".yml")) {
      config = yaml.load(content) as Partial<AIFocusConfig>;
    } else if (resolvedPath.endsWith(".json")) {
      config = JSON.parse(content);
    } else {
      throw new Error(`不支持的配置文件格式: ${path.extname(resolvedPath)}`);
    }

    // 合并默认配置
    const merged = deepMerge(getDefaultConfig(), config);

    // 处理日志级别：
    // 1. 如果配置中直接指定了logLevel，这个值优先级最高
    // 2. 如果没有logLevel但有debugMode=true，则logLevel="debug"
    // 3. 否则默认为 "info"
    if (!config.logLevel && (config as any).debugMode === true) {
      merged.logLevel = "debug";
    }

    // 如果未显式指定 logLevel，则默认 "info"
    if (!merged.logLevel) {
      merged.logLevel = "info";
    }

    return merged;
  } catch (error) {
    console.error(`加载配置文件失败: ${error}`);
    return getDefaultConfig();
  }
}
