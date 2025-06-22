import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { MarkdownGenerator } from "../src/output/markdown-generator";

const TEMP_DIR = path.join(__dirname, "temp-md-test");
const generator = new MarkdownGenerator(TEMP_DIR);
const TEST_FILE = "test.md";

async function readFileLines(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return content.split("\n");
}

describe("MarkdownGenerator 更新时间行", () => {
  beforeEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it("首次写入应插入更新时间行", async () => {
    const filePath = await generator.generateFile("Hello World", TEST_FILE);
    const lines = await readFileLines(filePath);
    expect(lines[0].startsWith("**最后更新**:"));
    expect(lines[1]).toBe("Hello World");
  });

  it("重复写入应更新而不是追加更新时间行", async () => {
    const filePath1 = await generator.generateFile("First", TEST_FILE);
    const firstTimestampLine = (await readFileLines(filePath1))[0];

    // wait 1 second to ensure timestamp changes
    await new Promise((r) => setTimeout(r, 1000));

    const filePath2 = await generator.generateFile("Second", TEST_FILE);
    const lines = await readFileLines(filePath2);
    expect(lines[0].startsWith("**最后更新**:"));
    expect(lines[1]).toBe("Second");
    expect(lines.filter((l) => l.startsWith("**最后更新**:")).length).toBe(1);
    expect(lines[0]).not.toBe(firstTimestampLine);
  });
});
