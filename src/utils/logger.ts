/**
 * @file 日志工具
 * @description 提供统一的日志记录接口，根据配置的 logLevel 决定输出级别。
 * @module utils/logger
 * @see {@link /agentic-docs/.module-docs/AIFocus/utils/logger.md} - 日志工具文档
 */

/**
 * 日志级别类型
 * - silent: 不输出任何日志
 * - info: 输出常规信息、警告和错误（默认）
 * - warn: 只输出警告和错误
 * - debug: 输出详尽调试信息
 */
export type LogLevel = "silent" | "info" | "warn" | "debug";

/**
 * 日志接口
 */
export interface Logger {
  /** 输出普通信息 */
  info: (...args: any[]) => void;
  /** 输出警告信息 */
  warn: (...args: any[]) => void;
  /** 输出调试信息 */
  debug: (...args: any[]) => void;
  /** 输出错误信息 */
  error: (...args: any[]) => void;
}

/**
 * 创建日志实例，根据 logLevel 决定输出级别
 * @param level 日志级别
 * @returns 日志接口实例
 */
export function createLogger(level: LogLevel = "info"): Logger {
  return {
    info: (...args: any[]) => {
      // 只有 info 和 debug 级别显示 info 日志
      if (level === "info" || level === "debug") {
        console.log(...args);
      }
    },
    warn: (...args: any[]) => {
      // silent 级别不显示任何日志，info/warn/debug 都显示警告
      if (level !== "silent") {
        console.warn(...args);
      }
    },
    debug: (...args: any[]) => {
      // 仅 debug 级别显示 debug 日志
      if (level === "debug") {
        console.debug(...args);
      }
    },
    error: (...args: any[]) => {
      // silent 级别不显示任何日志，其他级别都显示错误
      if (level !== "silent") {
        console.error(...args);
      }
    },
  };
}
