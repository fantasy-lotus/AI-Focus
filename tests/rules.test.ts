/**
 * @file 规则引擎模块测试
 * @description 测试规则引擎模块的功能
 */

import { describe, it, expect } from "vitest";
import {
  RuleLevel,
  RuleEngine,
  MetricThresholdRule,
  CircularDependencyRule,
  RuleFactory,
  RuleConfig,
} from "../src/rules";
import { FileAnalysisResult, Finding, Severity } from "../src/analyzer/types";
import { AIFocusConfig } from "../src/config/types";

describe("规则引擎模块测试", () => {
  describe("MetricThresholdRule 测试", () => {
    it("当指标值超过阈值时应生成发现项", () => {
      // 创建规则实例
      const rule = new MetricThresholdRule({
        id: "test.complexity",
        enabled: true,
        severity: "warning" as Severity,
        threshold: 10,
        metric: "cyclomaticComplexity",
      });

      // 创建测试文件分析结果
      const fileResult: FileAnalysisResult = {
        filePath: "test.ts",
        language: "typescript",
        metrics: {
          cyclomaticComplexity: 15, // 超过阈值
        },
        findings: [],
        dependencies: [],
      };

      // 执行规则
      const findings = rule.evaluateFile!(fileResult);

      // 验证结果
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("test.complexity.exceeded");
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].details.metricName).toBe("cyclomaticComplexity");
      expect(findings[0].details.value).toBe(15);
      expect(findings[0].details.threshold).toBe(10);
    });

    it("当指标值不超过阈值时不应生成发现项", () => {
      // 创建规则实例
      const rule = new MetricThresholdRule({
        id: "test.complexity",
        enabled: true,
        severity: "warning" as Severity,
        threshold: 10,
        metric: "cyclomaticComplexity",
      });

      // 创建测试文件分析结果
      const fileResult: FileAnalysisResult = {
        filePath: "test.ts",
        language: "typescript",
        metrics: {
          cyclomaticComplexity: 5, // 不超过阈值
        },
        findings: [],
        dependencies: [],
      };

      // 执行规则
      const findings = rule.evaluateFile!(fileResult);

      // 验证结果
      expect(findings).toHaveLength(0);
    });
  });

  describe("CircularDependencyRule 测试", () => {
    it("应检测到循环依赖", () => {
      // 创建规则实例
      const rule = new CircularDependencyRule({
        id: "module.circularDependency",
        enabled: true,
        severity: "warning" as Severity,
      });

      // 创建循环依赖的测试项目分析结果
      const projectResults: FileAnalysisResult[] = [
        {
          filePath: "moduleA.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleB.ts"],
        },
        {
          filePath: "moduleB.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleC.ts"],
        },
        {
          filePath: "moduleC.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleA.ts"],
        },
      ];

      // 执行规则
      const findings = rule.evaluateProject!(projectResults);

      // 验证结果
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("module.circularDependency");
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].details.cycle).toContain("moduleA.ts");
      expect(findings[0].details.cycle).toContain("moduleB.ts");
      expect(findings[0].details.cycle).toContain("moduleC.ts");
    });

    it("不应检测到不存在的循环依赖", () => {
      // 创建规则实例
      const rule = new CircularDependencyRule({
        id: "module.circularDependency",
        enabled: true,
        severity: "warning" as Severity,
      });

      // 创建无循环依赖的测试项目分析结果
      const projectResults: FileAnalysisResult[] = [
        {
          filePath: "moduleA.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleB.ts"],
        },
        {
          filePath: "moduleB.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleC.ts"],
        },
        {
          filePath: "moduleC.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: [],
        },
      ];

      // 执行规则
      const findings = rule.evaluateProject!(projectResults);

      // 验证结果
      expect(findings).toHaveLength(0);
    });
  });

  describe("RuleFactory 测试", () => {
    it("应根据配置创建MetricThresholdRule实例", () => {
      const ruleConfig: RuleConfig = {
        id: "function.complexity",
        enabled: true,
        severity: "warning" as Severity,
        threshold: 10,
        metric: "cyclomaticComplexity",
      };

      const rule = RuleFactory.createRule("function.complexity", ruleConfig);

      expect(rule).toBeInstanceOf(MetricThresholdRule);
      expect(rule?.id).toBe("function.complexity");
      expect((rule as MetricThresholdRule).level).toBe(RuleLevel.FILE);
    });

    it("应根据ID创建CircularDependencyRule实例", () => {
      const ruleConfig: RuleConfig = {
        id: "module.circularDependency",
        enabled: true,
        severity: "warning" as Severity,
      };

      const rule = RuleFactory.createRule(
        "module.circularDependency",
        ruleConfig
      );

      expect(rule).toBeInstanceOf(CircularDependencyRule);
      expect(rule?.id).toBe("module.circularDependency");
      expect((rule as CircularDependencyRule).level).toBe(RuleLevel.PROJECT);
    });

    it("当规则未启用时应返回null", () => {
      const ruleConfig: RuleConfig = {
        id: "function.complexity",
        enabled: false,
        severity: "warning" as Severity,
        threshold: 10,
        metric: "cyclomaticComplexity",
      };

      const rule = RuleFactory.createRule("function.complexity", ruleConfig);

      expect(rule).toBeNull();
    });
  });

  describe("RuleEngine 测试", () => {
    it("应执行文件级规则", () => {
      // 创建配置
      const config: Partial<AIFocusConfig> = {
        project: {
          name: "test",
          type: "typescript",
        },
        analyzePaths: ["**/*.ts"],
        excludePaths: [],
        output: {
          reports: {
            directory: "./reports",
            focusFile: "focus.md",
            reviewFile: "review.md",
          },
        },
        rules: {
          "function.complexity": {
            enabled: true,
            severity: "warning" as Severity,
            threshold: 10,
            metric: "cyclomaticComplexity",
          },
        },
        ai: {
          enabled: true,
          provider: "gemini",
          model: "gemini-1.5-flash",
          temperature: 0.2,
          tokenLimit: 4096,
        },
      };

      // 创建规则引擎
      const engine = new RuleEngine(config as AIFocusConfig);

      // 创建测试文件分析结果
      const fileResult: FileAnalysisResult = {
        filePath: "test.ts",
        language: "typescript",
        metrics: {
          cyclomaticComplexity: 15, // 超过阈值
        },
        findings: [],
        dependencies: [],
      };

      // 执行规则
      const findings = engine.evaluateFile(fileResult);

      // 验证结果
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("function.complexity.exceeded");
      expect(findings[0].severity).toBe("warning");
    });

    it("应执行项目级规则", () => {
      // 创建配置
      const config: Partial<AIFocusConfig> = {
        project: {
          name: "test",
          type: "typescript",
        },
        analyzePaths: ["**/*.ts"],
        excludePaths: [],
        output: {
          reports: {
            directory: "./reports",
            focusFile: "focus.md",
            reviewFile: "review.md",
          },
        },
        rules: {
          "module.circularDependency": {
            enabled: true,
            severity: "warning" as Severity,
          },
        },
        ai: {
          enabled: true,
          provider: "gemini",
          model: "gemini-1.5-flash",
          temperature: 0.2,
          tokenLimit: 4096,
        },
      };

      // 创建规则引擎
      const engine = new RuleEngine(config as AIFocusConfig);

      // 创建循环依赖的测试项目分析结果
      const projectResults: FileAnalysisResult[] = [
        {
          filePath: "moduleA.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleB.ts"],
        },
        {
          filePath: "moduleB.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleC.ts"],
        },
        {
          filePath: "moduleC.ts",
          language: "typescript",
          metrics: {},
          findings: [],
          dependencies: ["moduleA.ts"],
        },
      ];

      // 执行规则
      const findings = engine.evaluateProject(projectResults);

      // 验证结果
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("module.circularDependency");
      expect(findings[0].severity).toBe("warning");
    });
  });
});
