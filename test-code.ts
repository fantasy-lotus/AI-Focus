/**
 * 测试文件 - 包含各种复杂度问题
 */

// 导入依赖
import * as fs from "fs";
import * as path from "path";

// 高圈复杂度函数
function calculateComplexValue(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
): number {
  let result = 0;

  if (a > 0) {
    if (b > 0) {
      result = a + b;
    } else if (c > 0) {
      result = a + c;
    } else {
      result = a;
    }
  } else if (b > 0) {
    if (c > 0) {
      if (d > 0) {
        result = b + c + d;
      } else {
        result = b + c;
      }
    } else {
      result = b;
    }
  } else if (c > 0) {
    switch (d) {
      case 1:
        result = c + 1;
        break;
      case 2:
        result = c + 2;
        break;
      case 3:
        if (e > 0) {
          result = c + e;
        } else {
          result = c;
        }
        break;
      default:
        result = c;
    }
  }

  return result;
}

// 高认知复杂度函数
function processData(data: any[]): any[] {
  const results = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    if (typeof item === "string") {
      results.push(item.toUpperCase());
    } else if (Array.isArray(item)) {
      const nestedResults = [];

      for (let j = 0; j < item.length; j++) {
        const nestedItem = item[j];

        if (typeof nestedItem === "number") {
          nestedResults.push(nestedItem * 2);
        } else if (typeof nestedItem === "string") {
          nestedResults.push(nestedItem.toLowerCase());
        } else {
          nestedResults.push(null);
        }
      }

      results.push(nestedResults);
    } else if (typeof item === "object" && item !== null) {
      const processedObject = {};

      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          const value = item[key];

          if (typeof value === "string") {
            processedObject[key] = value.trim();
          } else if (typeof value === "number") {
            processedObject[key] = value * 1.5;
          } else {
            processedObject[key] = value;
          }
        }
      }

      results.push(processedObject);
    } else {
      results.push(item);
    }
  }

  return results;
}

// 定义一个类
class DataProcessor {
  private data: any[];
  private options: any;
  private cache: Map<string, any>;
  private listeners: Function[];
  private isProcessing: boolean;
  private maxRetries: number;
  private retryCount: number;
  private logger: any;
  private static instance: DataProcessor;

  constructor(data: any[], options: any = {}) {
    this.data = data;
    this.options = options;
    this.cache = new Map();
    this.listeners = [];
    this.isProcessing = false;
    this.maxRetries = options.maxRetries || 3;
    this.retryCount = 0;
    this.logger = console;
  }

  static getInstance(data: any[], options: any = {}): DataProcessor {
    if (!DataProcessor.instance) {
      DataProcessor.instance = new DataProcessor(data, options);
    }
    return DataProcessor.instance;
  }

  public addListener(callback: Function): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: Function): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  public async process(): Promise<any[]> {
    if (this.isProcessing) {
      throw new Error("Already processing");
    }

    this.isProcessing = true;

    try {
      const results = [];

      for (const item of this.data) {
        const processedItem = await this.processItem(item);
        results.push(processedItem);
        this.notifyListeners(processedItem);
      }

      this.isProcessing = false;
      return results;
    } catch (error) {
      this.isProcessing = false;
      this.logger.error("Processing failed", error);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        return this.process();
      }

      throw error;
    }
  }

  private async processItem(item: any): Promise<any> {
    const cacheKey = this.getCacheKey(item);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let result;

    if (typeof item === "string") {
      result = this.processString(item);
    } else if (typeof item === "number") {
      result = this.processNumber(item);
    } else if (Array.isArray(item)) {
      result = this.processArray(item);
    } else if (typeof item === "object" && item !== null) {
      result = this.processObject(item);
    } else {
      result = item;
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  private processString(str: string): string {
    return str.toUpperCase();
  }

  private processNumber(num: number): number {
    return num * 2;
  }

  private processArray(arr: any[]): any[] {
    return arr.map((item) => {
      if (typeof item === "string") {
        return item.toLowerCase();
      } else if (typeof item === "number") {
        return item * 3;
      } else {
        return item;
      }
    });
  }

  private processObject(obj: any): any {
    const result = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        result[key] = value;
      }
    }

    return result;
  }

  private getCacheKey(item: any): string {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      return String(item);
    } else {
      return JSON.stringify(item);
    }
  }

  private notifyListeners(item: any): void {
    for (const listener of this.listeners) {
      listener(item);
    }
  }
}

// 创建循环依赖
import { Helper } from "./test-helper";

export class Utility {
  static formatData(data: any): string {
    if (typeof data === "string") {
      return `"${data}"`;
    } else if (Array.isArray(data)) {
      return `[${data.map((item) => Utility.formatData(item)).join(", ")}]`;
    } else if (typeof data === "object" && data !== null) {
      return JSON.stringify(data);
    }
    return String(data);
  }

  static processAndFormat(data: any): any {
    // 使用Helper类，形成循环依赖
    const processed = Helper.process(data);
    return Utility.formatData(processed);
  }
}

/**
 * 复杂函数示例 - 用于测试复杂度指标
 */
export function complexFunction(
  a: number,
  b: number,
  condition: boolean
): number {
  let result = 0;

  // 增加条件分支，提高复杂度
  if (condition) {
    if (a > b) {
      result = a * 2;
      if (a > 10) {
        result += 5;
      } else {
        result += 2;
      }
    } else {
      result = b * 2;
      if (b > 20) {
        result += 10;
      } else {
        result += 3;
      }
    }
  } else {
    for (let i = 0; i < a; i++) {
      result += i;
      if (i % 2 === 0) {
        result *= 2;
      } else {
        result -= 1;
      }
    }

    let i = 0;
    while (i < b) {
      result += i * 2;
      i++;
      if (i % 3 === 0) {
        result -= 3;
      }
    }
  }

  return result;
}

/**
 * 嵌套类示例 - 用于测试类结构分析
 */
export class OuterClass {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.value = value;
  }
}

/**
 * 内部类示例 - 改为单独的类避免语法错误
 */
export class InnerClass {
  private innerValue: string;

  constructor(innerValue: string) {
    this.innerValue = innerValue;
  }

  getInnerValue(): string {
    return this.innerValue;
  }

  combineValues(outer: OuterClass): string {
    return `${outer.getValue()}-${this.innerValue}`;
  }
}
