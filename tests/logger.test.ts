/**
 * @file 日志工具测试
 * @description 测试日志系统的不同级别和输出行为
 * @module tests/logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LogLevel, createLogger } from "../src/utils/logger";

describe("Logger 测试", () => {
  // 保存原始的控制台方法
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };

  // 控制台方法的模拟
  const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  // 每个测试前设置模拟
  beforeEach(() => {
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.debug = mockConsole.debug;

    // 重置模拟
    vi.resetAllMocks();
  });

  // 每个测试后恢复原始方法
  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  });

  it("silent 级别不应输出任何日志", () => {
    const logger = createLogger("silent");

    logger.info("测试信息");
    logger.warn("测试警告");
    logger.error("测试错误");
    logger.debug("测试调试");

    expect(mockConsole.log).not.toHaveBeenCalled();
    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.error).not.toHaveBeenCalled();
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });

  it("info 级别应输出 info 和 error，但不输出 debug", () => {
    const logger = createLogger("info");

    logger.info("测试信息");
    logger.warn("测试警告");
    logger.error("测试错误");
    logger.debug("测试调试");

    expect(mockConsole.log).toHaveBeenCalledWith("测试信息");
    expect(mockConsole.warn).toHaveBeenCalledWith("测试警告");
    expect(mockConsole.error).toHaveBeenCalledWith("测试错误");
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });

  it("warn 级别应只输出 warn 和 error", () => {
    const logger = createLogger("warn");

    logger.info("测试信息");
    logger.warn("测试警告");
    logger.error("测试错误");
    logger.debug("测试调试");

    expect(mockConsole.log).not.toHaveBeenCalled();
    expect(mockConsole.warn).toHaveBeenCalledWith("测试警告");
    expect(mockConsole.error).toHaveBeenCalledWith("测试错误");
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });

  it("debug 级别应输出所有日志", () => {
    const logger = createLogger("debug");

    logger.info("测试信息");
    logger.warn("测试警告");
    logger.error("测试错误");
    logger.debug("测试调试");

    expect(mockConsole.log).toHaveBeenCalledWith("测试信息");
    expect(mockConsole.warn).toHaveBeenCalledWith("测试警告");
    expect(mockConsole.error).toHaveBeenCalledWith("测试错误");
    expect(mockConsole.debug).toHaveBeenCalledWith("测试调试");
  });

  it("默认级别应为 info", () => {
    const logger = createLogger(); // 未指定级别

    logger.info("测试信息");
    logger.warn("测试警告");
    logger.error("测试错误");
    logger.debug("测试调试");

    expect(mockConsole.log).toHaveBeenCalledWith("测试信息");
    expect(mockConsole.warn).toHaveBeenCalledWith("测试警告");
    expect(mockConsole.error).toHaveBeenCalledWith("测试错误");
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });

  it("应正确传递多个参数", () => {
    const logger = createLogger("info");

    logger.info("测试", 123, { a: 1 });

    expect(mockConsole.log).toHaveBeenCalledWith("测试", 123, { a: 1 });
  });
});
