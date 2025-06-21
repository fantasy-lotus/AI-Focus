/**
 * 代码分析器测试
 */
import * as path from "path";
import * as fs from "fs";
import { Analyzer, analyzeFile } from "../src/analyzer";
import { calculateCyclomaticComplexity } from "../src/analyzer/metrics/cyclomatic-complexity";
import { calculateCognitiveComplexity } from "../src/analyzer/metrics/cognitive-complexity";
import { calculateMaintainabilityIndex } from "../src/analyzer/metrics/maintainability-index";
import TreeSitterParser from "../src/analyzer/parser";

// 设置测试路径
const TEST_FILE_PATH = path.resolve(__dirname, "../test-code.ts");
const TEST_HELPER_PATH = path.resolve(__dirname, "../test-helper.ts");

async function runTest() {
  console.log("========== 开始测试代码分析器 ==========");

  try {
    // 测试1: 分析单个文件
    console.log("\n----- 测试1: 分析单个文件 -----");
    const result = await analyzeFile(TEST_FILE_PATH);

    console.log(`文件: ${result.filePath}`);
    console.log(`语言: ${result.language}`);
    console.log("指标:");
    console.log(`- 圈复杂度: ${result.metrics.cyclomaticComplexity}`);
    console.log(`- 认知复杂度: ${result.metrics.cognitiveComplexity}`);
    console.log(`- 可维护性指数: ${result.metrics.maintainabilityIndex}`);

    console.log(`发现问题数量: ${result.findings.length}`);
    if (result.findings.length > 0) {
      console.log("\n前5个问题:");
      result.findings.slice(0, 5).forEach((finding, index) => {
        console.log(
          `[${index + 1}] ${finding.id}: ${finding.message} (${
            finding.severity
          })`
        );
      });
    }

    console.log(`依赖数量: ${result.dependencies.length}`);
    if (result.dependencies.length > 0) {
      console.log("依赖:");
      result.dependencies.forEach((dep) => console.log(`- ${dep}`));
    }

    // 测试2: 使用Analyzer类
    console.log("\n----- 测试2: 使用Analyzer类 -----");
    const analyzer = new Analyzer();
    const projectResults = await analyzer.analyzeProject(
      path.resolve(__dirname, ".."),
      ["**/node_modules/**", "**/dist/**", "**/tests/**"]
    );

    console.log(`分析文件总数: ${projectResults.length}`);

    // 计算总问题数
    const totalFindings = projectResults.reduce(
      (sum, file) => sum + file.findings.length,
      0
    );
    console.log(`发现问题总数: ${totalFindings}`);

    // 测试3: 生成依赖图
    console.log("\n----- 测试3: 生成依赖图 -----");
    const dependencyGraph = analyzer.generateDependencyGraph(projectResults);
    console.log(`依赖图节点数量: ${dependencyGraph.nodes.size}`);

    // 检测循环依赖
    const circularDeps = dependencyGraph.getCircularDependencies();
    console.log(`发现循环依赖数量: ${circularDeps.length}`);
    if (circularDeps.length > 0) {
      console.log("循环依赖示例:");
      circularDeps.slice(0, 3).forEach((cycle, index) => {
        console.log(`[${index + 1}] ${cycle.join(" -> ")}`);
      });
    }

    // 测试4: 直接测试复杂度计算函数
    console.log("\n----- 测试4: 复杂度计算函数测试 -----");

    // 读取测试文件内容
    const testFileContent = fs.readFileSync(TEST_FILE_PATH, "utf-8");
    const parser = new TreeSitterParser();
    const language = parser.detectLanguage(TEST_FILE_PATH);
    const tree = parser.parse(testFileContent, language);

    // 测试圈复杂度计算
    const cc = calculateCyclomaticComplexity(tree);
    console.log(`圈复杂度计算结果: ${cc}`);
    console.assert(cc > 0, "圈复杂度应该大于0");

    // 测试认知复杂度计算
    const cognitiveCC = calculateCognitiveComplexity(tree);
    console.log(`认知复杂度计算结果: ${cognitiveCC}`);
    console.assert(cognitiveCC > 0, "认知复杂度应该大于0");

    // 测试可维护性指数计算
    const mi = calculateMaintainabilityIndex(tree, testFileContent);
    console.log(`可维护性指数计算结果: ${mi}`);
    console.assert(mi >= 0 && mi <= 100, "可维护性指数应该在0-100之间");

    // 测试5: 测试循环依赖检测
    console.log("\n----- 测试5: 循环依赖检测测试 -----");
    const testHelperResult = await analyzeFile(TEST_HELPER_PATH);
    const testCodeResult = await analyzeFile(TEST_FILE_PATH);

    // 创建只包含这两个文件的依赖图
    const miniDepsResults = [testHelperResult, testCodeResult];
    const miniGraph = analyzer.generateDependencyGraph(miniDepsResults);

    // 检测循环依赖
    const miniCircularDeps = miniGraph.getCircularDependencies();
    console.log(`小型依赖图循环依赖数量: ${miniCircularDeps.length}`);
    console.assert(
      miniCircularDeps.length > 0,
      "应该检测到test-code和test-helper之间的循环依赖"
    );

    if (miniCircularDeps.length > 0) {
      console.log("循环依赖详情:");
      miniCircularDeps.forEach((cycle, index) => {
        console.log(`[${index + 1}] ${cycle.join(" -> ")}`);
      });
    }

    console.log("\n========== 测试完成 ==========");
  } catch (error) {
    console.error("测试出错:", error);
    throw error; // 让测试失败
  }
}

// 运行测试
runTest();
