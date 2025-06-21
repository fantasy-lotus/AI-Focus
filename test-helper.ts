/**
 * 测试辅助文件 - 用于创建循环依赖
 */

import { Utility } from "./test-code";

export class Helper {
  static process(data: any): any {
    // 对数据进行一些处理
    if (typeof data === "string") {
      return data.trim();
    } else if (Array.isArray(data)) {
      return data.filter(Boolean);
    } else if (typeof data === "object" && data !== null) {
      return { ...data, processed: true };
    }
    return data;
  }

  static enhanceData(data: any): any {
    // 使用Utility类，形成循环依赖
    const formatted = Utility.formatData(data);
    return {
      original: data,
      formatted,
      timestamp: new Date().toISOString(),
    };
  }
}
