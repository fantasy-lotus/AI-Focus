/**
 * @file 默认配置
 * @description 提供AIFocus的默认配置对象
 * @module config/default
 */

import { AIFocusConfig } from "./types";

/**
 * 获取默认配置
 * @returns 默认配置对象
 */
export function getDefaultConfig(): AIFocusConfig {
  return {
    project: {
      name: "AIFocus Project",
      type: "typescript",
    },
    analyzePaths: ["**/*.{ts,js,tsx,jsx}"],
    excludePaths: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    output: {
      reports: {
        directory: "./aifocus-reports",
        focusFile: "focus.md",
        reviewFile: "review.md",
      },
      docs: {
        directory: "./aifocus-docs",
      },
    },
    rules: {
      "function.complexityLimit": {
        enabled: true,
        severity: "warning",
        threshold: 10,
      },
      "function.lengthLimit": {
        enabled: true,
        severity: "warning",
        threshold: 30,
      },
      "class.methodCountLimit": {
        enabled: true,
        severity: "warning",
        threshold: 10,
      },
      "module.circularDependency": {
        enabled: true,
        severity: "warning",
      },
    },
    ai: {
      enabled: true,
      provider: "gemini",
      gemini: {
        model: "gemini-1.5-flash",
      },
      temperature: 0.7,
    },
    docScoping: {
      excludeFromDocs: [],
      moduleLevel: {
        threshold: 4,
      },
    },
    incremental: {
      enabled: true,
      debounceSeconds: 5,
    },
    debugMode: false,
  };
}
