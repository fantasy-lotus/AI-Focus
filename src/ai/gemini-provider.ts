/**
 * @file Google Gemini AI提供商实现
 * @description 实现Google Gemini AI服务接口
 * @module ai/gemini-provider
 * @see {@link /agentic-docs/.module-docs/AIFocus/ai/README.md} - AI服务模块文档
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { IAiProvider, AIGenerateParams, AiResponse, AITaskType } from "./types";

/**
 * GeminiProvider构造函数选项
 */
interface GeminiProviderOptions {
  apiKey: string;
  model: string;
}

/**
 * Google Gemini AI提供商实现
 */
export class GeminiProvider implements IAiProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  /**
   * 创建Gemini提供商实例
   * @param options 提供商选项，包含apiKey和model
   */
  constructor(options: GeminiProviderOptions) {
    if (!options.apiKey) {
      throw new Error("Gemini API密钥未提供，请设置环境变量");
    }

    this.client = new GoogleGenerativeAI(options.apiKey);
    this.model = options.model;
  }

  /**
   * 生成内容
   * @param params AI生成参数
   * @returns 生成的响应
   */
  public async generate(params: AIGenerateParams): Promise<AiResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      // 构建提示
      const { systemMessage, userMessage } = this.buildPrompt(params);
      const fullPrompt = `${systemMessage}\n\n${userMessage}`;

      // 调用API
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const responseText = response.text();

      // 由于 usageMetadata 在当前 SDK 版本中不稳定，我们手动计算 token
      const [inputTokenCount, outputTokenCount] = await Promise.all([
        model.countTokens(fullPrompt),
        model.countTokens(responseText),
      ]);

      return {
        text: responseText,
        usage: {
          inputTokens: inputTokenCount.totalTokens,
          outputTokens: outputTokenCount.totalTokens,
        },
      };
    } catch (error) {
      console.error("Gemini API调用失败:", error);
      throw new Error(
        `AI内容生成失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private buildPrompt(params: AIGenerateParams): {
    systemMessage: string;
    userMessage: string;
  } {
    const { taskType, context } = params;
    const analysisContext = JSON.stringify(context.analysisResult, null, 2);

    let systemMessage = "";
    let userMessage = "";

    switch (taskType) {
      case AITaskType.CODE_REVIEW:
        systemMessage = `
          作为一名经验丰富的软件架构师和代码审查专家，你的任务是分析提供的代码静态分析报告。
          报告以JSON格式提供，其中包含了文件结构、依赖关系、代码复杂度指标、具体问题（findings），以及新增的**代码健康度指标**。

          **代码健康度指标说明:**
          - **stabilityMetrics**: 模块稳定性。'stability' 值越接近0，表示模块越稳定（被依赖多，依赖别人少），是核心模块；越接近1表示越不稳定，是易变模块。
          - **riskScores**: 文件变更风险。分数越高，代表修改这个文件可能引发的连锁反应越广，风险越高。

          你的报告应包括：
          1.  **总体评估**: 对代码的整体质量、可维护性和潜在风险进行高级评估。
          2.  **关键问题与风险**: 结合所有指标，识别并详细说明最需要关注的2-3个关键问题。特别关注 **高风险** 或 **不合理的不稳定** 模块。解释其潜在影响。
          3.  **架构健康度分析**: 基于 'stabilityMetrics' 和 'riskScores'，评价项目整体架构的健康状况。例如，是否有核心模块过于不稳定？是否有低风险模块被高风险模块依赖？
          4.  **改进建议**: 提供具体、可操作的修复建议或重构思路。
          5.  **亮点**: 指出代码中值得称赞的优点或良好实践。

          请以清晰、结构化的Markdown格式返回你的审查报告。
        `;
        userMessage = `
          请根据以下静态分析报告，生成代码审查报告：
          \`\`\`json
          ${analysisContext}
          \`\`\`
        `;
        break;
      case AITaskType.DOC_GENERATION:
        const projectStructureContext = JSON.stringify(
          context.projectStructure,
          null,
          2
        );
        const promptContext = {
          analysisResult: context.analysisResult,
          projectStructure: context.projectStructure,
        };

        // 根据 promptLanguage 选择模板
        const promptLanguage = context.promptLanguage || "en";

        if (promptLanguage === "cn") {
          // 中文模板
          systemMessage = `
您是一位专业的软件工程师，负责为软件项目创建全面、结构化的文档。
您将收到一个包含项目分析结果的JSON对象，包括目录树。

**您的任务：**

生成符合 \`DocNode\` 接口的JSON格式分层文档结构。

**输入结构：**

您收到的输入有一个 \`projectStructure\` 字段，这是一个树。树中的每个节点代表一个目录，并有一个 \`strategy\` 字段，可以是：
1.  \`"module-level"\`：对于此目录，您必须生成一个单独的 \`README.md\` 文件，提供高级概述。
2.  \`"file-level"\`：对于此目录，您必须为其中的每个文件生成单独的文档。

**输出规范（必须遵循此JSON结构）：**

\`\`\`typescript
interface DocNode {
  name: string; // 目录或文件名（如 "src"、"utils.ts"、"README.md"）
  type: "dir" | "file";
  content?: string; // 文件内容，特别是README.md
  children?: DocNode[]; // 用于目录
}
\`\`\`

**指南：**

1.  **顶级README**：创建一个根 \`README.md\`，总结整个项目。它应包括概述、所有分析文件及其关键指标（如复杂性和可维护性）的表格，以及子目录摘要。
2.  **模块级文档（strategy: "module-level"）**：
    - 对于每个标记为 \`"module-level"\` 的目录，创建一个名为 \`README.md\` 的 \`DocNode\`。
    - 此 \`README.md\` 的 \`content\` 应总结模块的目的、列出它包含的文件，并描述它们的集体功能和依赖关系。不要为此目录内的单个文件创建 \`DocNode\`。
3.  **文件级文档（strategy: "file-level"）**：
    - 对于每个标记为 \`"file-level"\` 的目录，遍历其子项。
    - 为每个源文件创建一个 \`DocNode\`，在 \`content\` 字段中包含其文档。文档应详细，涵盖文件的目的、函数、类和依赖关系。
4.  **JSON输出**：您的整个输出必须是一个有效的JSON对象，即 \`DocNode\` 的实例（根目录）。不要用markdown反引号或任何其他文本包装它。

分析提供的代码上下文并生成完整、结构化的JSON文档。
上下文：
\`\`\`json
${JSON.stringify(promptContext, null, 2)}
\`\`\`
`;
          userMessage = `
请为以下项目生成中文文档。

项目文件结构:
\`\`\`json
${projectStructureContext}
\`\`\`

文件分析结果:
\`\`\`json
${analysisContext}
\`\`\`

请严格按照指定的JSON格式返回一个单一的 DocNode 对象。
`;
        } else {
          // 英文模板（保持原有模板）
          systemMessage = `
You are an expert software engineer tasked with creating comprehensive, structured documentation for a software project.
You will receive a JSON object containing the analysis of the project, including a directory tree.

**Your Task:**

Generate a hierarchical documentation structure in JSON format, following the \`DocNode\` interface.

**Input Structure:**

The input you'll receive has a \`projectStructure\` field, which is a tree. Each node in this tree represents a directory and has a \`strategy\` field that can be either:
1.  \`"module-level"\`: For this directory, you must generate a single \`README.md\` file that provides a high-level overview.
2.  \`"file-level"\`: For this directory, you must generate individual documentation for each file within it.

**Output Specification (MUST follow this JSON structure):**

\`\`\`typescript
interface DocNode {
  name: string; // Directory or file name (e.g., "src", "utils.ts", "README.md")
  type: "dir" | "file";
  content?: string; // Content for files, especially README.md
  children?: DocNode[]; // For directories
}
\`\`\`

**Instructions:**

1.  **Top-Level README**: Create a root \`README.md\` that summarizes the entire project. It should include an overview, a table of all analyzed files with their key metrics (like complexity and maintainability), and a summary of subdirectories.
2.  **Module-Level Documentation (strategy: "module-level")**:
    - For each directory marked with \`"module-level"\`, create ONE \`DocNode\` named \`README.md\`.
    - The \`content\` of this \`README.md\` should summarize the module's purpose, list the files it contains, and describe their collective function and dependencies. Do NOT create \`DocNode\` for individual files inside this directory.
3.  **File-Level Documentation (strategy: "file-level")**:
    - For each directory marked with \`"file-level"\`, traverse its children.
    - For each source file, create a \`DocNode\` with its documentation in the \`content\` field. The documentation should be detailed, covering the file's purpose, functions, classes, and dependencies.
4.  **JSON Output**: Your entire output must be a single, valid JSON object that is an instance of \`DocNode\` (the root directory). Do not wrap it in markdown backticks or any other text.

Analyze the provided code context and generate the complete, structured JSON documentation.
Context:
\`\`\`json
${JSON.stringify(promptContext, null, 2)}
\`\`\`
`;
          userMessage = `
Please generate documentation for the following project.

Project structure:
          \`\`\`json
          ${projectStructureContext}
          \`\`\`

File analysis results:
          \`\`\`json
          ${analysisContext}
          \`\`\`

Please return a single DocNode object strictly following the specified JSON format.
        `;
        }
        break;
      default:
        throw new Error(`不支持的任务类型: ${taskType}`);
    }

    return { systemMessage, userMessage };
  }
}
