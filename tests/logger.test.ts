import { describe, it, expect, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { loadConfig } from "../src/config";
import { createLogger } from "../src/utils/logger";

const TEMP_DIR = path.join(__dirname, "temp-logger-test");

describe("Logger & Config logLevel 测试", () => {
  it("默认配置应返回 logLevel=info", async () => {
    const configPath = path.join(TEMP_DIR, "non-exist.yaml");
    const config = await loadConfig(configPath);
    expect(config.logLevel).toBe("info");
  });

  it("旧 debugMode=true 应映射为 logLevel=debug", async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const cfgFile = path.join(TEMP_DIR, "config.yaml");
    const yamlStr = yaml.dump({ debugMode: true });
    await fs.writeFile(cfgFile, yamlStr);

    const config = await loadConfig(cfgFile);
    expect(config.logLevel).toBe("debug");
  });

  it("createLogger 在不同级别下应正确输出", () => {
    const spyInfo = vi.spyOn(console, "log").mockImplementation(() => {});
    const spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});

    // silent
    let logger = createLogger("silent");
    logger.info("info msg");
    logger.debug("debug msg");
    expect(spyInfo).not.toHaveBeenCalled();
    expect(spyDebug).not.toHaveBeenCalled();

    // info
    spyInfo.mockClear();
    spyDebug.mockClear();
    logger = createLogger("info");
    logger.info("info msg");
    logger.debug("debug msg");
    expect(spyInfo).toHaveBeenCalledTimes(1);
    expect(spyDebug).not.toHaveBeenCalled();

    // debug
    spyInfo.mockClear();
    spyDebug.mockClear();
    logger = createLogger("debug");
    logger.info("info msg");
    logger.debug("debug msg");
    expect(spyInfo).toHaveBeenCalledTimes(1);
    expect(spyDebug).toHaveBeenCalledTimes(1);

    spyInfo.mockRestore();
    spyDebug.mockRestore();
  });
});
