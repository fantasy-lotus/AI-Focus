/**
 * @file 依赖图构建器
 * @description 构建和分析代码之间的依赖关系图
 * @module analyzer/structure/dependency-graph
 * @see {@link /agentic-docs/.module-docs/AIFocus/analyzer/structure/README.md} - 代码结构分析文档
 */

import * as path from "path";
import {
  FileAnalysisResult,
  DependencyGraph,
  DependencyNode,
  AnalyzerConfig,
} from "../types";

/**
 * 依赖图实现类
 */
export class DependencyGraphImpl implements DependencyGraph {
  nodes: Map<string, DependencyNode> = new Map();
  private debugMode: boolean;

  constructor(debugMode: boolean) {
    this.debugMode = debugMode;
  }

  /**
   * 添加节点到依赖图中
   * @param filePath 文件路径
   * @param dependencies 依赖路径列表
   */
  addNode(filePath: string, dependencies: string[]): void {
    if (this.debugMode) {
      console.log(
        `[Debug][DependencyGraph] 添加节点: ${filePath}, 依赖: ${JSON.stringify(
          dependencies
        )}`
      );
    }
    // 确保节点存在
    if (!this.nodes.has(filePath)) {
      this.nodes.set(filePath, {
        filePath,
        imports: [],
        importedBy: [],
      });
      if (this.debugMode) {
        console.log(`[Debug][DependencyGraph] 新建节点: ${filePath}`);
      }
    }

    // 添加当前节点的依赖
    const node = this.nodes.get(filePath)!;
    node.imports = [...dependencies];

    // 更新被依赖文件的 importedBy 属性
    for (const depPath of dependencies) {
      if (!this.nodes.has(depPath)) {
        this.nodes.set(depPath, {
          filePath: depPath,
          imports: [],
          importedBy: [filePath],
        });
        if (this.debugMode) {
          console.log(
            `[Debug][DependencyGraph] 被依赖节点 ${depPath} 不存在，新建并添加反向依赖: ${filePath}`
          );
        }
      } else {
        const depNode = this.nodes.get(depPath)!;
        if (!depNode.importedBy.includes(filePath)) {
          depNode.importedBy.push(filePath);
          if (this.debugMode) {
            console.log(
              `[Debug][DependencyGraph] 被依赖节点 ${depPath} 已存在，添加反向依赖: ${filePath}`
            );
          }
        }
      }
    }
  }

  /**
   * 计算所有节点的不稳定指数
   * 不稳定指数 = 出度 / (出度 + 入度)
   * 0 表示完全稳定 (只被依赖，不依赖别人)
   * 1 表示完全不稳定 (只依赖别人，不被别人依赖)
   */
  calculateAllInstability(): void {
    if (this.debugMode) {
      console.log(`[Debug][DependencyGraph] 开始计算所有节点稳定性。`);
    }
    for (const [filePath] of this.nodes) {
      this.calculateInstability(filePath);
    }
  }

  /**
   * 计算指定节点的不稳定指数
   * @param filePath 文件路径
   * @returns 不稳定指数 (0-1)
   */
  calculateInstability(filePath: string): number {
    const node = this.nodes.get(filePath);
    if (!node) return 0;

    const outDegree = node.imports.length;
    const inDegree = node.importedBy.length;

    let instability = 0.5; // Default for isolated nodes
    if (outDegree + inDegree === 0) {
      // 孤立节点
      instability = 0; // 视为完全稳定，因为没有内部依赖和被依赖
    } else {
      instability = outDegree / (outDegree + inDegree);
    }

    node.instability = instability;

    if (this.debugMode) {
      console.log(
        `[Debug][DependencyGraph] 节点 ${filePath}: Ca=${inDegree}, Ce=${outDegree}, Stability=${instability.toFixed(
          2
        )}`
      );
    }

    return instability;
  }

  /**
   * 获取循环依赖
   * @returns 循环依赖的路径数组
   */
  getCircularDependencies(): string[][] {
    const circles: string[][] = [];

    // 使用深度优先搜索检测循环
    for (const [filePath] of this.nodes) {
      this.detectCircles(filePath, [], new Set(), circles);
    }

    return circles;
  }

  /**
   * 检测循环依赖
   * @param current 当前节点
   * @param path 当前路径
   * @param visited 已访问节点集合
   * @param circles 检测到的循环数组
   */
  private detectCircles(
    current: string,
    path: string[],
    visited: Set<string>,
    circles: string[][]
  ): void {
    if (visited.has(current)) {
      // 已经访问过该节点，检查是否形成循环
      const startIndex = path.indexOf(current);
      if (startIndex !== -1) {
        // 找到循环，提取循环路径
        const circle = path.slice(startIndex);

        // 标准化循环路径，使循环从最小的文件路径开始
        const minIndex = circle.indexOf(
          circle.reduce((min, p) => (p < min ? p : min), circle[0])
        );
        const normalizedCircle = [
          ...circle.slice(minIndex),
          ...circle.slice(0, minIndex),
          circle[minIndex], // 循环结束重复第一个节点
        ];

        // 检查是否已存在相同的循环
        const circleStr = normalizedCircle.join("->");
        if (!circles.some((c) => c.join("->") === circleStr)) {
          circles.push(normalizedCircle);
        }
      }
      return;
    }

    visited.add(current);
    path.push(current);

    const node = this.nodes.get(current);
    if (node) {
      for (const imp of node.imports) {
        this.detectCircles(imp, path, visited, circles);
      }
    }

    path.pop();
    visited.delete(current);
  }
}

/**
 * 依赖图构建器类
 */
export default class DependencyGraphBuilder {
  private debugMode: boolean;

  constructor(debugMode: boolean) {
    this.debugMode = debugMode;
  }

  /**
   * 构建依赖图
   * @param results 文件分析结果列表
   * @returns 构建的依赖图
   */
  buildGraph(results: FileAnalysisResult[]): DependencyGraph {
    if (this.debugMode) {
      console.log(`[Debug][DependencyGraphBuilder] 开始构建依赖图。`);
    }
    const graph = new DependencyGraphImpl(this.debugMode);

    // 第一遍：预先添加所有被分析的文件作为节点，确保它们存在于图中
    for (const result of results) {
      if (!graph.nodes.has(result.filePath)) {
        graph.nodes.set(result.filePath, {
          filePath: result.filePath,
          imports: [],
          importedBy: [],
        });
        if (this.debugMode) {
          console.log(
            `[Debug][DependencyGraphBuilder] 预添加节点: ${result.filePath}`
          );
        }
      }
    }
    if (this.debugMode) {
      console.log(
        `[Debug][DependencyGraphBuilder] 所有分析文件已预添加为节点。总节点数: ${graph.nodes.size}`
      );
    }

    // 统一依赖路径 - 将相对路径解析为绝对路径
    const resolvedDeps = this.resolveDependencies(results);

    // 添加节点和连接
    for (const [filePath, dependencies] of resolvedDeps) {
      graph.addNode(filePath, dependencies);
    }

    // 计算不稳定指数
    graph.calculateAllInstability();

    if (this.debugMode) {
      console.log(
        `[Debug][DependencyGraphBuilder] 依赖图构建完成。总节点数: ${graph.nodes.size}`
      );
    }
    return graph;
  }

  /**
   * 解析所有文件的依赖关系，将相对路径转换为绝对路径
   * @param results 文件分析结果列表
   * @returns Map<文件路径, 依赖列表>
   */
  private resolveDependencies(
    results: FileAnalysisResult[]
  ): Map<string, string[]> {
    if (this.debugMode) {
      console.log(`[Debug][DependencyGraphBuilder] 开始解析依赖路径。`);
    }
    const resolvedDeps = new Map<string, string[]>();
    const filePathMap = new Map<string, string>();

    // 创建文件路径映射，用于后续依赖解析
    for (const result of results) {
      filePathMap.set(path.basename(result.filePath), result.filePath);

      // 添加目录级别的映射
      const dir = path.dirname(result.filePath);
      const dirParts = dir.split(path.sep);
      for (let i = 1; i <= dirParts.length; i++) {
        const subDir = dirParts.slice(-i).join(path.sep);
        filePathMap.set(subDir, dir);
      }
    }
    if (this.debugMode) {
      console.log(`[Debug][DependencyGraphBuilder] 文件路径映射创建完成。`);
    }

    // 解析每个文件的依赖关系
    for (const result of results) {
      const resolvedDependencies: string[] = [];
      if (this.debugMode) {
        console.log(
          `[Debug][DependencyGraphBuilder] 处理文件: ${result.filePath}`
        );
      }

      for (const dep of result.dependencies) {
        if (this.debugMode) {
          console.log(`[Debug][DependencyGraphBuilder] 原始依赖: ${dep}`);
        }
        if (this.isNodeModule(dep)) {
          if (this.debugMode) {
            console.log(
              `[Debug][DependencyGraphBuilder] 依赖 ${dep} 是外部模块，跳过。`
            );
          }
          // 外部依赖，不需要解析
          continue;
        }

        // 尝试解析相对路径
        try {
          let resolvedPath: string;

          if (dep.startsWith(".")) {
            // 相对路径，基于当前文件目录解析
            const basedir = path.dirname(result.filePath);
            resolvedPath = path.resolve(basedir, dep);
            if (this.debugMode) {
              console.log(
                `[Debug][DependencyGraphBuilder] 相对路径解析: ${dep} -> ${resolvedPath}`
              );
            }
          } else {
            // 绝对路径或别名，尝试在映射中查找
            // 简化实现：实际应该根据tsconfig或webpack配置处理别名
            resolvedPath = dep;
            if (this.debugMode) {
              console.log(
                `[Debug][DependencyGraphBuilder] 非相对路径: ${dep} (假定为绝对路径或别名)`
              );
            }
          }

          // 添加扩展名（如果缺失）
          if (!path.extname(resolvedPath)) {
            const inferredExtension = this.inferExtension(
              resolvedPath,
              result.language
            );
            resolvedPath += inferredExtension;
            if (this.debugMode) {
              console.log(
                `[Debug][DependencyGraphBuilder] 推断扩展名: ${resolvedPath}`
              );
            }
          }

          // 检查是否存在于分析结果中
          const exists = results.some((r) => r.filePath === resolvedPath);
          if (exists) {
            resolvedDependencies.push(resolvedPath);
            if (this.debugMode) {
              console.log(
                `[Debug][DependencyGraphBuilder] 依赖 ${resolvedPath} 存在于分析结果，添加。`
              );
            }
          } else {
            if (this.debugMode) {
              console.log(
                `[Debug][DependencyGraphBuilder] 依赖 ${resolvedPath} 不存在于分析结果，跳过。`
              );
            }
          }
        } catch (error) {
          if (this.debugMode) {
            console.error(
              `[Debug][DependencyGraphBuilder] 解析依赖 ${dep} 失败:`,
              error
            );
          }
        }
      }

      resolvedDeps.set(result.filePath, resolvedDependencies);
    }

    return resolvedDeps;
  }

  /**
   * 检查是否是node_modules中的模块
   * @param depPath 依赖路径
   * @returns 是否是node_module
   */
  private isNodeModule(depPath: string): boolean {
    return (
      !depPath.startsWith(".") &&
      !depPath.startsWith("/") &&
      !depPath.startsWith("~")
    );
  }

  /**
   * 根据语言推断扩展名
   * @param filePath 文件路径
   * @param language 语言类型
   * @returns 扩展名
   */
  private inferExtension(filePath: string, language: string): string {
    switch (language) {
      case "typescript":
        return filePath.endsWith(".d") ? ".d.ts" : ".ts";
      case "javascript":
        return ".js";
      default:
        return "";
    }
  }
}
