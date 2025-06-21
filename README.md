# AIFocus

AI 驱动的代码质量和文档生成工具，为开发者提供代码质量、文档和结构完整性的持续、自动化的反馈。

[English Version](./README.en.md) | 中文版本

## 功能特点

- 🔍 **文件监控**: 实时监控代码变更，自动触发分析
- 🤖 **AI 代码审查**: 利用 Google Gemini API 生成智能代码审查和建议
- 📝 **文档生成**: 自动生成代码文档和注释
- 📊 **质量分析**: 计算代码复杂度、重复度等质量指标
- ⚙️ **高度可配置**: 通过 YAML 配置文件自定义分析规则和输出

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
```

## 配置文件

AIFocus 使用 YAML 格式的配置文件。以下是基本结构:

```yaml
project:
  name: "my-project"
  type: "typescript"
  exclude:
    - "node_modules"
    - "dist"

analysis:
  monitorInterval: 60

ai:
  provider: "gemini"
  model: "gemini-1.5-flash"
  apiKeyEnv: "GEMINI_API_KEY"

rules:
  - name: "函数圈复杂度过高"
    metric: "cyclomaticComplexity"
    threshold: 10
    severity: "warning"

output:
  reports:
    directory: "./.aifocus"
    focusFile: "Focus.md"
    reviewFile: "CodeReview.md"
```

更多配置示例请参考`examples`目录。

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
aifocus analyze [--file <文件路径>] [--skip-ai]
```

## 许可证

ISC
