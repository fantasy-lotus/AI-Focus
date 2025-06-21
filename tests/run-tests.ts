/**
 * 测试运行器
 */
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runTests() {
  console.log("开始运行所有测试...");

  // 获取测试目录中的所有测试文件
  const testDir = path.join(__dirname);
  const testFiles = fs
    .readdirSync(testDir)
    .filter((file) => file.endsWith(".test.ts") && file !== "run-tests.ts");

  console.log(`找到 ${testFiles.length} 个测试文件:\n${testFiles.join("\n")}`);

  let failedTests = 0;

  for (const testFile of testFiles) {
    console.log(`\n======== 运行测试: ${testFile} ========`);
    try {
      // 使用ts-node运行测试文件
      const { stdout, stderr } = await execAsync(
        `npx ts-node ${path.join(testDir, testFile)}`
      );

      if (stderr) {
        console.error(`错误输出:\n${stderr}`);
        failedTests++;
      }

      console.log(stdout);
      console.log(`测试 ${testFile} 完成`);
    } catch (error) {
      console.error(`测试 ${testFile} 失败:`, error);
      failedTests++;
    }
  }

  console.log(`\n所有测试运行完成! 失败: ${failedTests}/${testFiles.length}`);

  // 如果有测试失败，以非零状态码退出
  if (failedTests > 0) {
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error("测试运行器出错:", error);
  process.exit(1);
});
