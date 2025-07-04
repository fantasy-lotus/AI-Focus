/**
 * @file 循环依赖规则
 * @description 检测项目中的模块循环依赖
 * @module rules/rules/circular-dependency-rule
 * @see {@link /agentic-docs/.module-docs/AIFocus/rules/rules/circular-dependency-rule.md} - 循环依赖规则文档
 */

import DependencyGraphBuilder from "../../analyzer/structure/dependency-graph";
import {
  FileAnalysisResult,
  Finding,
  FindingType,
  Severity,
  SourceLocation,
  DependencyGraph,
} from "../../analyzer/types";
import { BaseRule } from "../base-rule";
import { RuleConfig, RuleLevel } from "../types";

/**
 * 循环依赖规则
 * 用于检测项目中的模块循环依赖
 */
export class CircularDependencyRule extends BaseRule {
  /** 严重性 */
  private severity: Severity;

  /**
   * 创建循环依赖规则实例
   * @param config 规则配置
   */
  constructor(config: RuleConfig) {
    super(config);
    this.level = RuleLevel.PROJECT; // 设置为项目级规则
    this.severity = config.severity || "warning";
  }

  /**
   * 评估项目中的循环依赖
   * @param projectResults 项目分析结果（所有文件）
   * @param dependencyGraph 依赖图
   * @returns 发现的问题列表
   */
  evaluateProject(
    projectResults: FileAnalysisResult[],
    dependencyGraph?: DependencyGraph
  ): Finding[] {
    // 如果调用方未提供依赖图，基于 projectResults 构建一次依赖图
    if (!dependencyGraph) {
      try {
        const builder = new DependencyGraphBuilder(false);
        dependencyGraph = builder.buildGraph(projectResults);
      } catch (err) {
        console.warn(
          "[CircularDependencyRule] 无法构建依赖图，跳过循环检测:",
          err
        );
      }
    }

    const findings: Finding[] = [];

    if (!dependencyGraph) {
      return findings;
    }

    // 从依赖图中直接获取循环依赖
    let cycles = dependencyGraph.getCircularDependencies();

    // 如果依赖图未检测到循环（可能因依赖解析失败），使用简易算法基于原始dependencies检测
    if (cycles.length === 0) {
      const depMap = new Map<string, string[]>(
        projectResults.map((r) => [r.filePath, r.dependencies])
      );

      const visited = new Set<string>();
      const stack = new Set<string>();

      const dfs = (node: string, path: string[]): void => {
        if (stack.has(node)) {
          const cycleStart = path.indexOf(node);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), node]);
          }
          return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        stack.add(node);
        const deps = depMap.get(node) || [];
        for (const dep of deps) {
          if (!depMap.has(dep)) continue; // 仅考虑项目内文件
          dfs(dep, [...path, dep]);
        }
        stack.delete(node);
      };

      for (const node of depMap.keys()) {
        dfs(node, [node]);
      }
    }

    // 为每个循环依赖创建一个Finding
    for (const cycle of cycles) {
      if (cycle.length === 0) continue;

      // 找到循环中第一个文件的索引
      const firstFileInCycle = cycle[0];
      const fileResult = projectResults.find(
        (result) => result.filePath === firstFileInCycle
      );

      // 使用循环的最后一个元素来闭合显示
      const loopEnd = cycle.length > 1 ? cycle[0] : "";

      if (fileResult) {
        // 创建标准位置信息（指向文件开头）
        const location: SourceLocation = {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 1,
        };

        // 添加发现
        findings.push({
          id: "module.circularDependency",
          type: "ARCHITECTURE" as FindingType,
          message: `发现循环依赖: ${cycle.join(" -> ")} -> ${loopEnd}`,
          severity: this.severity,
          location,
          details: {
            cycle,
            filePath: fileResult.filePath,
          },
        });
      }
    }

    return findings;
  }
}
