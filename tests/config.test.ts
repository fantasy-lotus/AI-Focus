/**
 * @file 配置加载测试
 * @description 测试配置的默认值和加载机制
 * @module tests/config
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { loadConfig } from "../src/config";

const TEMP_DIR = path.join(__dirname, "temp-config-test");

describe("配置加载", () => {
  // 每个测试后清理临时文件
  afterEach(async () => {
    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch (e) {
      // 忽略不存在的目录
    }
  });

  it("默认配置应包含所有必要字段", async () => {
    const configPath = path.join(TEMP_DIR, "non-exist.yaml");
    const config = await loadConfig(configPath);

    // 检查默认值
    expect(config.output).toBeDefined();
    expect(config.excludePaths).toBeInstanceOf(Array);
    expect(config.logLevel).toBe("info"); // 默认日志级别应为info
  });

  it("旧 debugMode=true 应映射为 logLevel=debug", async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const cfgFile = path.join(TEMP_DIR, "config.yaml");
    const yamlStr = yaml.dump({ debugMode: true });
    await fs.writeFile(cfgFile, yamlStr);

    const config = await loadConfig(cfgFile);
    expect(config.logLevel).toBe("debug");
  });

  it("旧 debugMode=false 应映射为 logLevel=info", async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const cfgFile = path.join(TEMP_DIR, "config.yaml");
    const yamlStr = yaml.dump({ debugMode: false });
    await fs.writeFile(cfgFile, yamlStr);

    const config = await loadConfig(cfgFile);
    expect(config.logLevel).toBe("info");
  });

  it("指定 logLevel 应优先于旧 debugMode", async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const cfgFile = path.join(TEMP_DIR, "config.yaml");
    const yamlStr = yaml.dump({
      debugMode: true,
      logLevel: "warn",
    });
    await fs.writeFile(cfgFile, yamlStr);

    const config = await loadConfig(cfgFile);
    expect(config.logLevel).toBe("warn");
  });
});
