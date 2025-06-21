/**
 * 配置加载测试
 */
import * as path from "path";
import { loadConfig } from "../src/config";

async function testConfigLoading() {
  console.log("========== 开始测试配置加载 ==========");

  try {
    // 测试1: 加载默认配置文件
    console.log("\n----- 测试1: 加载默认配置文件 -----");
    const configPath = path.resolve(__dirname, "../aifocus.config.yaml");
    const config = await loadConfig(configPath);

    console.log("加载的配置:");
    console.log(JSON.stringify(config, null, 2));

    // 测试2: 配置验证
    console.log("\n----- 测试2: 配置内部字段验证 -----");
    // 验证必要字段
    const hasProjectConfig = !!config.project;
    console.log(`配置包含project部分: ${hasProjectConfig}`);

    const hasRules = config.rules && Object.keys(config.rules).length > 0;
    console.log(`配置包含规则定义: ${hasRules}`);

    if (hasRules && config.rules) {
      console.log("规则配置示例:");
      const ruleIds = Object.keys(config.rules);
      if (ruleIds.length > 0) {
        const sampleRule = ruleIds[0];
        console.log(
          `- ${sampleRule}: ${JSON.stringify(config.rules[sampleRule])}`
        );
      }
    }

    // 验证输出配置
    const hasOutputConfig = !!config.output;
    console.log(`配置包含output部分: ${hasOutputConfig}`);
    if (hasOutputConfig && config.output) {
      console.log(
        `报告输出目录: ${config.output.reports?.directory || "未设置"}`
      );
    }

    // 验证AI配置
    const hasAIConfig = !!config.ai;
    console.log(`配置包含AI部分: ${hasAIConfig}`);
    if (hasAIConfig && config.ai) {
      console.log(`AI提供商: ${config.ai.provider}`);
      console.log(`AI模型: ${config.ai.model}`);
    }

    console.log("\n========== 配置测试完成 ==========");
  } catch (error) {
    console.error("配置测试出错:", error);
  }
}

// 运行测试
testConfigLoading();
