/**
 * @file 增量分析性能测试
 * @description 测试增量分析相较于全量分析的性能提升
 * @module tests/watch_incremental_performance
 */

import { describe, it, expect, beforeAll } from "vitest";
import { join, resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
import { Analyzer } from "../src/analyzer";
import { AIFocusConfig } from "../src/config/types";
import { getDefaultConfig } from "../src/config/default";
import { AnalysisResult } from "../src/analyzer/types";

// 创建临时目录与文件
const TEST_DIR = resolve(__dirname, "temp-watch-test");
const SRC_DIR = join(TEST_DIR, "src");
const COMPONENT_DIR = join(SRC_DIR, "components");
const UTIL_DIR = join(SRC_DIR, "utils");

// 测试文件列表
const TEST_FILES: Record<string, string> = {
  "components/Button.ts": `
/**
 * 按钮组件
 */
import { formatText } from '../utils/format';
import { validate } from '../utils/validate';

export interface ButtonProps {
  text: string;
  onClick: () => void;
}

export function Button(props: ButtonProps) {
  const { text, onClick } = props;
  
  const handleClick = () => {
    if (validate(text)) {
      onClick();
    }
  };
  
  return {
    text: formatText(text),
    handleClick
  };
}
`,
  "components/Card.ts": `
/**
 * 卡片组件
 */
import { formatText } from '../utils/format';
import { Button } from './Button';

export interface CardProps {
  title: string;
  content: string;
  onAction?: () => void;
}

export function Card(props: CardProps) {
  const { title, content, onAction } = props;
  
  const button = onAction ? Button({
    text: 'Action',
    onClick: onAction
  }) : null;
  
  return {
    title: formatText(title),
    content,
    button
  };
}
`,
  "utils/format.ts": `
/**
 * 文本格式化工具
 */
export function formatText(text: string): string {
  return text.trim();
}

export function capitalizeText(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
`,
  "utils/validate.ts": `
/**
 * 验证工具
 */
import { formatText } from './format';

export function validate(text: string): boolean {
  const formatted = formatText(text);
  return formatted.length > 0;
}
`,
  "index.ts": `
/**
 * 主入口
 */
import { Card } from './components/Card';
import { Button } from './components/Button';

export { Card, Button };
`,
};

/**
 * 创建测试文件
 */
async function createTestFiles(): Promise<string[]> {
  // 创建目录
  await mkdir(COMPONENT_DIR, { recursive: true });
  await mkdir(UTIL_DIR, { recursive: true });

  // 创建文件
  const filePaths: string[] = [];
  for (const [relativePath, content] of Object.entries(TEST_FILES)) {
    const fullPath = join(TEST_DIR, "src", relativePath);
    await writeFile(fullPath, content);
    filePaths.push(fullPath);
  }

  return filePaths;
}

/**
 * 测试帮助函数
 */
function getTestConfig(): AIFocusConfig {
  const config = getDefaultConfig();
  config.analyzePaths = [`${TEST_DIR}/**/*.ts`];
  config.excludePaths = [];
  return config;
}

describe("增量分析性能测试", () => {
  let testFiles: string[] = [];
  let analyzer: Analyzer;
  let fullAnalysisResult: AnalysisResult;

  beforeAll(async () => {
    // 创建测试文件
    testFiles = await createTestFiles();
    analyzer = new Analyzer(getTestConfig());

    // 全量分析一次构建基础数据
    fullAnalysisResult = await analyzer.analyzeProject(TEST_DIR);
  });

  it("修改单文件时，增量分析应显著快于全量分析", async () => {
    // 获取单个文件作为变更
    const formatFilePath = join(TEST_DIR, "src", "utils/format.ts");
    const changedFiles = new Set([formatFilePath]);

    // 测量全量分析时间
    const fullStartTime = performance.now();
    const fullResult = await analyzer.analyzeProject(TEST_DIR);
    const fullAnalysisTime = performance.now() - fullStartTime;

    // 测量增量分析时间
    const incrementalStartTime = performance.now();
    const incrementalResult = await analyzer.analyzeFiles(
      Array.from(changedFiles),
      fullAnalysisResult
    );
    const incrementalAnalysisTime = performance.now() - incrementalStartTime;

    // 验证结果
    expect(incrementalAnalysisTime).toBeLessThan(fullAnalysisTime);

    // 记录加速比
    console.log(`全量分析: ${fullAnalysisTime.toFixed(2)}ms`);
    console.log(`增量分析: ${incrementalAnalysisTime.toFixed(2)}ms`);
    console.log(
      `加速比: ${(fullAnalysisTime / incrementalAnalysisTime).toFixed(2)}x`
    );

    // 验证增量结果包含所有节点
    expect(incrementalResult.files.length).toBeGreaterThan(0);
    expect(incrementalResult.dependencyGraph?.nodes.size).toBe(
      fullResult.dependencyGraph?.nodes.size
    );
  });
});
