import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import fs from "fs/promises";
import yaml from "js-yaml";
import { Orchestrator } from "../../src/orchestrator";
import { AIFocusConfig, loadConfig } from "../../src/config";

// --- 测试配置 ---
const TEST_TIMEOUT = 60000; // 60s
const TEST_PROJECT_DIR = path.join(__dirname, "temp-project");
const TEST_CONFIG_PATH = path.join(TEST_PROJECT_DIR, "aifocus.config.yaml");
const REPORTS_DIR = path.join(TEST_PROJECT_DIR, "reports");

// --- 模拟项目文件 ---
const MOCK_FILES = {
  "src/index.ts": `
    import { helper } from './utils';
    console.log(helper('world'));
  `,
  "src/utils.ts": `
    export function helper(name: string): string {
      return \`Hello, \${name}!\`;
    }
  `,
};

// --- 模拟配置文件 ---
const MOCK_CONFIG: Partial<AIFocusConfig> = {
  project: {
    name: "Test Project",
    type: "typescript",
  },
  analyzePaths: ["src/**/*.ts"],
  excludePaths: ["**/node_modules/**"],
  output: {
    reports: {
      directory: REPORTS_DIR,
      focusFile: "focus.md",
      reviewFile: "review.md",
    },
  },
  ai: {
    enabled: true,
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    tokenLimit: 2048,
  },
};

describe(
  "Orchestrator Integration Test",
  () => {
    // --- 设置: 创建临时项目和配置 ---
    beforeAll(async () => {
      // 检查 API Key
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("测试中止: 请设置 GEMINI_API_KEY 环境变量");
      }

      // 创建目录
      await fs.mkdir(REPORTS_DIR, { recursive: true });
      for (const filePath in MOCK_FILES) {
        const fullPath = path.join(TEST_PROJECT_DIR, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, MOCK_FILES[filePath]);
      }

      // 创建配置文件
      await fs.writeFile(TEST_CONFIG_PATH, yaml.dump(MOCK_CONFIG));
    });

    // --- 清理: 删除临时文件 ---
    afterAll(async () => {
      await fs.rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    });

    // --- 测试用例 ---
    it("应该成功运行并生成AI代码审查和文档报告", async () => {
      // 1. 加载配置
      const config = await loadConfig(TEST_CONFIG_PATH);

      // 2. 创建并运行 Orchestrator
      const orchestrator = new Orchestrator(config, TEST_PROJECT_DIR);
      const result = await orchestrator.run();

      // 3. 断言结果
      expect(result).toBeDefined();
      expect(result.reviewReportPath).toBeDefined();
      expect(result.docsReportPath).toBeDefined();

      // 4. 检查文件是否存在
      const reviewReportExists = await fs
        .access(result.reviewReportPath!)
        .then(() => true)
        .catch(() => false);
      const docsReportExists = await fs
        .access(result.docsReportPath!)
        .then(() => true)
        .catch(() => false);

      expect(reviewReportExists).toBe(true);
      expect(docsReportExists).toBe(true);

      // 5. 检查文件内容是否非空
      const reviewContent = await fs.readFile(
        result.reviewReportPath!,
        "utf-8"
      );
      const docsContent = await fs.readFile(result.docsReportPath!, "utf-8");

      expect(reviewContent.length).toBeGreaterThan(50);
      expect(docsContent.length).toBeGreaterThan(50);

      console.log(
        "✅ AI Code Review Report 内容预览:",
        reviewContent.substring(0, 200)
      );
      console.log("✅ AI Docs Report 内容预览:", docsContent.substring(0, 200));
    });
  },
  TEST_TIMEOUT
);
