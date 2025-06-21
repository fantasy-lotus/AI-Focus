# AIFocus

AI-driven code quality and documentation generation tool that provides continuous, automated feedback on code quality, documentation, and structural integrity for developers.

[English Version](./README.en.md) | [中文版本](./README.md)

## Core Advantages

AIFocus builds a complete Abstract Syntax Tree (AST) and module dependency graph for the entire project locally.

This is the "killer feature" 🚀 of AIFocus. It provides deep insights based on a global context:

- **Architectural Risk Assessment**: "The `utils.ts` you are modifying is a core file depended on by over 30 modules, and it has a low maintainability index. Please modify with caution and ensure sufficient test coverage."
- **Chain Reaction Analysis**: "You have changed the return type of this function, which may cause runtime type-mismatch errors in Module A and Module B."
- **Circular Dependency Detection**: "Your latest import statement has created a circular dependency between Module A and Module C, which will be disastrous for future maintenance."

## Detailed Features

1.  **Multi-dimensional Code Metrics**: Cyclomatic complexity, cognitive complexity, maintainability index, stability metrics, with configurable thresholds.
2.  **AST & Module Dependency Graph**: Builds a complete syntax tree and dependency relationships using Tree-sitter for deep architectural analysis.
3.  **Real-time Monitoring (`watch`)**: Listens for file changes and triggers **incremental** analysis at set intervals.
4.  **Rules Engine**: Built-in rules for circular dependencies, metric thresholds, etc., with support for custom extensions via YAML.
5.  **AI Integration**: Encapsulates a Gemini Provider to automatically generate Code Reviews and project documentation.
6.  **Documentation Mirroring**: `Doc Generation` maps the source code structure to `agentic-docs/.module-docs/`.
7.  **Configuration System**: A single `aifocus.config.yaml` deeply merges with default values, supporting multi-environment overrides.
8.  **CLI Commands**: `init / watch / analyze` commands cover initialization, continuous monitoring, and one-off analysis.
9.  **Report Output**: Markdown code review reports & structured module documentation, with customizable output directories.
10. **Test Suite**: Vitest + integration tests ensure the reliability of core logic.
11. **DocScoping**: `excludeFromDocs` + module-level threshold strategies support **documentation exclusion** and **aggregated README** generation for large-scale projects.

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

AIFocus is configured using an `aifocus.config.yaml` file. You can generate a default file using the `aifocus init` command.

Here is a recommended configuration example that includes most common features:

```yaml
# aifocus.config.yaml

# Project information
project:
  name: "My Awesome Project"
  type: "typescript" # Supports: "typescript", "javascript", "mixed"

# Define paths to analyze (Glob patterns)
analyzePaths:
  - "src/**/*.ts"

# Define paths to exclude
excludePaths:
  - "**/node_modules/**"
  - "**/dist/**"

# Output configuration
output:
  reports:
    directory: "./aifocus-reports"
    focusFile: "focus.md"
    reviewFile: "review.md"
  docs:
    directory: "./aifocus-docs"

# AI service configuration
ai:
  enabled: true
  provider: "gemini"
  temperature: 0.5
  gemini:
    model: "gemini-1.5-flash"
    # Recommended: Provide API key via GEMINI_API_KEY environment variable.
    # To configure directly, use: apiKey: "your-real-key-here"

# Rule configuration
rules:
  # Function cyclomatic complexity limit
  "function.complexityLimit":
    enabled: true
    severity: "warning" # Options: "error", "warning", "info"
    threshold: 10

  # Circular dependency detection between modules
  "module.circularDependency":
    enabled: true
    severity: "error"
```

> For all advanced options, please refer to the documentation in the `agentic-docs` directory.

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

## Roadmap

> The following timeline is consolidated from various plan documents (see the `.plans/` directory).

| Date        | Milestone                         | Key Features                                                                                                                                                      |
| ----------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2025 Q3** | **Developer Experience Boost**    | VS Code Extension (syntax highlighting + one-click analysis)<br/>Incremental AI Auto-Fix Suggestions (PR Bot)<br/>JSON / SARIF Report Export                      |
| **2025 Q4** | **Language & Platform Expansion** | Python, Go language parsers<br/>SaaS Cloud Collaboration Platform (Team Dashboard)<br/>Rules Plugin Marketplace & Template Library                                |
| **2026 H1** | **Deep AI Integration**           | Model Fine-Tuning Service (with private code corpus)<br/>Security Vulnerability Scanning Rules<br/>Real-time Performance Analysis & Resource Benchmarking         |
| **2026 H2** | **On-demand Documentation**       | A mode where core architecture docs are kept in Git, but API-level docs are generated dynamically on access/build, reducing maintenance costs for large projects. |

> The roadmap is dynamic. We welcome new feature requests and priority votes in Issues / Discussions.

## License

ISC
