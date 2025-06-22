import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { Analyzer } from "../src/analyzer";

// 临时测试目录
const TEMP_DIR = path.join(os.tmpdir(), "aifocus-incremental-test");
const FILE_A = path.join(TEMP_DIR, "a.ts");
const FILE_B = path.join(TEMP_DIR, "b.ts");

const INITIAL_B_CONTENT = `export function bar(): number {\n  return 1;\n}`;
const UPDATED_B_CONTENT = `export function bar(): number {\n  if (Math.random() > 0.5) {\n    return 1;\n  } else {\n    return 2;\n  }\n}`;

describe("Analyzer.incremental", () => {
  let analyzer: Analyzer;
  let fullResult: any;

  beforeAll(async () => {
    // 创建临时目录与文件
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.writeFile(
      FILE_A,
      `import { bar } from './b';\nexport function foo() {\n  return bar();\n}`
    );
    await fs.writeFile(FILE_B, INITIAL_B_CONTENT);

    analyzer = new Analyzer({ includePaths: ["**/*.ts"], excludePaths: [] });
    fullResult = await analyzer.analyzeProject(TEMP_DIR);
  });

  afterAll(async () => {
    // 清理
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it("全量分析应检测到2个文件", () => {
    expect(fullResult.files.length).toBe(2);
  });

  it("增量分析仅重新分析受影响及邻接文件", async () => {
    // 修改 b.ts
    await fs.writeFile(FILE_B, UPDATED_B_CONTENT);

    // 记录旧 b.ts 圈复杂度
    const prevB = fullResult.files.find((f: any) => f.filePath === FILE_B);
    expect(prevB).toBeDefined();
    const prevCC = prevB.metrics.cyclomaticComplexity;

    // 运行增量分析
    const incResult = await analyzer.analyzeFiles([FILE_B], fullResult);

    // 总文件数应不变
    expect(incResult.files.length).toBe(2);

    // b.ts 圈复杂度应发生变化（增加）
    const newB = incResult.files.find((f: any) => f.filePath === FILE_B);
    expect(newB).toBeDefined();
    // @ts-ignore
    expect(newB!.metrics.cyclomaticComplexity).toBeGreaterThan(prevCC);

    // a.ts 结果应被保留而未重新分析 => 对象引用应与原结果相同
    const prevA = fullResult.files.find((f: any) => f.filePath === FILE_A);
    const newA = incResult.files.find((f: any) => f.filePath === FILE_A);
    expect(newA).toBe(prevA);
  });
});
