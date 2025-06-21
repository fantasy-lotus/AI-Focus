# AIFocus

AI-driven code quality and documentation generation tool that provides continuous, automated feedback on code quality, documentation, and structural integrity for developers.

[English Version](./README.en.md) | [中文版本](./README.md)

## Features

- 🔍 **File Monitoring**: Real-time monitoring of code changes, automatically triggering analysis
- 🤖 **AI Code Review**: Leveraging Google Gemini API to generate intelligent code reviews and suggestions
- 📝 **Documentation Generation**: Automatically generating code documentation and annotations
- 📊 **Quality Analysis**: Calculating code complexity, duplication, and other quality metrics
- ⚙️ **Highly Configurable**: Customizing analysis rules and output through YAML configuration files

## Installation

```bash
# Global installation
npm install -g aifocus

# Or local installation
npm install --save-dev aifocus
```

## Quick Start

### 1. Initialize Configuration

```bash
# Create default configuration file
aifocus init
```

This will create an `aifocus.config.yaml` file in the current directory.

### 2. Configure API Key

Set environment variables:

```bash
# Linux/macOS
export GEMINI_API_KEY="your-api-key-here"

# Windows
set GEMINI_API_KEY=your-api-key-here
```

### 3. Start Monitoring File Changes

```bash
# Start file monitoring
aifocus watch
```

### 4. Run One-time Analysis

```bash
# Analyze the entire project
aifocus analyze

# Analyze a specific file
aifocus analyze --file src/app.ts
```

## Configuration File

AIFocus uses a YAML format configuration file. Here's the basic structure:

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
  - name: "function cyclomatic complexity too high"
    metric: "cyclomaticComplexity"
    threshold: 10
    severity: "warning"

output:
  reports:
    directory: "./.aifocus"
    focusFile: "Focus.md"
    reviewFile: "CodeReview.md"
```

For more configuration examples, please refer to the `examples` directory.

## Command Line Options

### init

Create a default configuration file:

```bash
aifocus init [--path <configuration file path>]
```

### watch

Monitor file changes:

```bash
aifocus watch [--path <monitoring path>] [--verbose]
```

### analyze

Run a one-time analysis:

```bash
aifocus analyze [--file <file path>] [--skip-ai]
```

## License

ISC
