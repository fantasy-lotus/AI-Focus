/**
 * @file 文件监控服务实现
 * @description 实现基于chokidar的文件监控服务
 * @module watcher/file-watcher
 * @see {@link /agentic-docs/.module-docs/AIFocus/watcher/README.md} - 文件监控模块文档
 */

import { EventEmitter } from "events";
import * as chokidar from "chokidar";
import path from "path";
import { AIFocusConfig } from "../config";

/**
 * 文件变更事件类型
 */
export enum FileEventType {
  ADDED = "file:added",
  CHANGED = "file:changed",
  DELETED = "file:deleted",
}

/**
 * 文件变更事件载荷
 */
export interface FileEvent {
  type: FileEventType;
  path: string;
  extension: string;
  isSourceFile: boolean;
}

/**
 * 文件监控服务
 * 负责监控文件系统变更并发出事件
 */
export class FileWatcherService extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private config: AIFocusConfig;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelay = 300; // 防抖延迟（毫秒）

  /**
   * 创建文件监控服务实例
   * @param config AIFocus 配置
   */
  constructor(config: AIFocusConfig) {
    super();
    this.config = config;
  }

  /**
   * 启动文件监控
   * @param watchPath 要监控的路径，默认为当前工作目录
   */
  public start(watchPath?: string): void {
    const targetPath = watchPath || process.cwd();
    console.log(`开始监控文件变更: ${targetPath}`);

    // 构建忽略模式
    const ignored = this.buildIgnorePatterns();

    // 创建 chokidar 实例
    this.watcher = chokidar.watch(targetPath, {
      ignored,
      ignoreInitial: true,
      persistent: true,
    });

    // 绑定事件处理器
    this.watcher
      .on("add", (path) => this.handleFileEvent(path, FileEventType.ADDED))
      .on("change", (path) => this.handleFileEvent(path, FileEventType.CHANGED))
      .on("unlink", (path) =>
        this.handleFileEvent(path, FileEventType.DELETED)
      );

    // 监控就绪事件
    this.watcher.on("ready", () => {
      console.log("文件监控已就绪");
    });
  }

  /**
   * 停止文件监控
   */
  public stop(): Promise<void> {
    if (!this.watcher) {
      return Promise.resolve();
    }

    console.log("停止文件监控");
    return this.watcher.close();
  }

  /**
   * 处理文件事件
   * @param filePath 文件路径
   * @param eventType 事件类型
   */
  private handleFileEvent(filePath: string, eventType: FileEventType): void {
    // 应用防抖
    const key = `${filePath}:${eventType}`;
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        const extension = path.extname(filePath).toLowerCase();
        const isSourceFile = this.isSourceFile(extension);

        // 创建事件对象
        const event: FileEvent = {
          type: eventType,
          path: filePath,
          extension,
          isSourceFile,
        };

        // 发出事件
        this.emit(eventType, event);
        this.emit("any", event);

        // 清理防抖计时器
        this.debounceTimers.delete(key);
      }, this.debounceDelay)
    );
  }

  /**
   * 判断文件是否为源代码文件
   * @param extension 文件扩展名
   */
  private isSourceFile(extension: string): boolean {
    const sourceExtensions = [".ts", ".js", ".tsx", ".jsx", ".py"];
    return sourceExtensions.includes(extension);
  }

  /**
   * 构建忽略模式
   */
  private buildIgnorePatterns(): Array<string | RegExp> {
    const baseIgnores = ["**/node_modules/**", "**/dist/**", "**/.git/**"];

    // 添加配置中的排除模式
    const configIgnores =
      this.config.excludePaths?.map((pattern: string) => {
        // 转换为 chokidar 兼容的格式
        return pattern.includes("/") ? pattern : `**/${pattern}/**`;
      }) || [];

    return [...baseIgnores, ...configIgnores];
  }
}
