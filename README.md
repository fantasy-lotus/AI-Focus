# AIFocus

AI 驱动的代码质量和文档生成工具，为开发者提供代码质量、文档和结构完整性的持续、自动化的反馈。

[English Version](./README.en.md) | 中文版本

## 核心优势

AIFocus 在本地构建了整个项目的完整抽象语法树（AST）和模块依赖图。

这是 AIFocus 的"杀手锏" 🚀。它能提供基于全局上下文的深度洞察：

- **架构级风险评估**： "你正在修改的 utils.ts 是一个被超过 30 个模块依赖的核心文件，它的可维护性指数较低。请谨慎修改，并确保有足够的测试覆盖。"
- **连锁反应分析**： "你修改了这个函数的返回值类型，可能会导致 Module A 和 Module B 出现类型不匹配的运行时错误。"
- **循环依赖检测**： "你这次的 import 语句在 Module A 和 Module C 之间创建了一个循环依赖，这会给未来的维护带来灾难。"

## 已实现功能一览

1.  **多维度代码度量**：圈复杂度、认知复杂度、可维护性指数、稳定性指标，阈值可配置。
2.  **AST & 模块依赖图**：基于 Tree-sitter 构建完整语法树与依赖关系，实现深度架构分析。
3.  **实时监控 (`watch`)**：监听文件变更，按设定间隔触发**增量**分析。
4.  **规则引擎**：内置循环依赖、度量阈值等规则，支持 YAML 扩展自定义。
5.  **AI 集成**：封装 Gemini Provider，自动生成 Code Review 与项目文档。
6.  **文档镜像生成**：`Doc Generation` 将源码结构映射到 `agentic-docs/.module-docs/`。
7.  **配置系统**：单一 `aifocus.config.yaml` 深度合并默认值，支持多环境覆盖。
8.  **CLI 命令**：`init / watch / analyze` 三大命令覆盖初始化、持续监控、一次性分析。
9.  **报告输出**：Markdown 代码审查报告 & 结构化模块文档，可自定义目录。
10. **测试套件**：Vitest + 集成测试保障核心逻辑可靠性。
11. **文档作用域 (DocScoping)**：`excludeFromDocs` + 模块级阈值策略，支持大规模项目的**文档排除**与**聚合 README** 生成。

## 安装

```bash
# 全局安装
npm install -g aifocus

# 或本地安装
npm install --save-dev aifocus
```

## 快速开始

### 1. 初始化配置

```bash
# 创建默认配置文件
aifocus init
```

这将在当前目录下创建`aifocus.config.yaml`文件。

### 2. 配置 API 密钥

设置环境变量:

```bash
# Linux/macOS
export GEMINI_API_KEY="your-api-key-here"

# Windows
set GEMINI_API_KEY=your-api-key-here
```

### 3. 开始监控文件变更

```bash
# 启动文件监控
aifocus watch
```

### 4. 执行一次性分析

```bash
# 分析整个项目
aifocus analyze

# 分析特定文件
aifocus analyze --file src/app.ts

# 静默模式（仅错误输出）
aifocus analyze --quiet

# 调试模式（输出调试日志）
aifocus analyze --debug
```

## 配置文件

AIFocus 使用 `aifocus.config.yaml` 文件进行配置。你可以通过 `aifocus init` 命令生成一个默认文件。

以下是一个推荐的配置示例，它包含了大部分常用功能：

```yaml
# aifocus.config.yaml

# 项目基本信息
project:
  name: "My Awesome Project"
  type: "typescript" # 支持: "typescript", "javascript", "mixed"

# 定义需要分析的文件路径 (Glob 模式)
analyzePaths:
  - "src/**/*.ts"

# 定义需要排除的路径
excludePaths:
  - "**/node_modules/**"
  - "**/dist/**"

# 输出配置
output:
  reports:
    directory: "./aifocus-reports"
    focusFile: "focus.md"
    reviewFile: "review.md"
  docs:
    directory: "./aifocus-docs"

# 日志级别
logLevel: info # silent | info | debug

# 增量分析 (watch 模式)
incremental:
  enabled: true
  debounceSeconds: 5

# 配置 AI 服务
ai:
  enabled: true
  provider: "gemini"
  temperature: 0.5
  gemini:
    model: "gemini-1.5-flash"
    # 推荐通过设置 GEMINI_API_KEY 环境变量来提供 API 密钥。
    # 如果需要直接配置，请使用 apiKey: "your-real-key-here"

# 规则配置
rules:
  # 函数圈复杂度限制
  "function.complexityLimit":
    enabled: true
    severity: "warning" # 可选: "error", "warning", "info"
    threshold: 10

  # 模块间循环依赖检测
  "module.circularDependency":
    enabled: true
    severity: "error"
```

> 想要了解所有高级选项，请参阅 `agentic-docs` 目录下的文档。

## 命令行选项

### init

创建默认配置文件:

```bash
aifocus init [--path <配置文件路径>]
```

### watch

监控文件变更:

```bash
aifocus watch [--path <监控路径>] [--verbose]
```

### analyze

执行一次性分析:

```bash
aifocus analyze [--file <文件路径>] [--quiet] [--debug]
```

- `--quiet`: 静默模式，最小化输出。
- `--debug`: 调试模式，输出详细的内部日志。

> 要在不调用 AI 的情况下运行，请在`aifocus.config.yaml`中设置 `ai: { enabled: false }`。

## Roadmap

> 以下时间线整合自各计划文档（参见 `.plans/` 目录）。

| 时间        | 里程碑                        | 关键特性                                                                                          |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| **2025 Q3** | **Developer Experience 强化** | VS Code 插件 (代码高亮 + 一键分析)<br/>增量 AI 自动修复建议 (PR 机器人)<br/>JSON / SARIF 报告导出 |
| **2025 Q4** | **语言与平台扩展**            | Python、Go 语言解析器<br/>SaaS 云端协作平台 (团队 Dashboard)<br/>规则插件市场 & 模板库            |
| **2026 H1** | **AI 深度融合**               | 模型微调服务（私有代码语料）<br/>安全漏洞扫描规则<br/>实时性能分析与资源基准                      |
| **2026 H2** | **On-demand Documentation**   | 按需生成文档模式：核心架构文档保留 Git，API 级文档在访问/构建时动态生成，降低大型项目维护成本     |

> Roadmap 为动态规划，欢迎在 Issues / Discussions 中提出新需求或投票优先级。

## 许可证

ISC
