export type LogLevel = "silent" | "info" | "debug";

export interface Logger {
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * 创建简单的 logger 实例，根据 logLevel 决定输出级别
 */
export function createLogger(level: LogLevel = "info"): Logger {
  const shouldLogInfo = level === "info" || level === "debug";
  const shouldLogDebug = level === "debug";

  return {
    info: (...args: any[]) => {
      if (shouldLogInfo) {
        console.log(...args);
      }
    },
    debug: (...args: any[]) => {
      if (shouldLogDebug) {
        console.debug(...args);
      }
    },
    error: (...args: any[]) => {
      // error 始终输出
      console.error(...args);
    },
  };
}
