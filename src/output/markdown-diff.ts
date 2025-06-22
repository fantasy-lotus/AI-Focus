/**
 * @file Markdown Diff 生成器
 * @description 根据两次 AnalysisResult 生成增量变化区块的 Markdown 文本
 * @module output/markdown-diff
 * @see {@link /agentic-docs/.module-docs/AIFocus/output/README.md}
 */

import { AnalysisResult, FileAnalysisResult } from "../analyzer/types";
import path from "path";

/**
 * 生成一个 Markdown 区块，用于描述两次分析之间的差异
 * @param prev 上一次分析结果（可为空）
 * @param curr 当前分析结果
 * @param changedFiles 触发本次分析的文件集合
 */
export function generateDiffSection(
  prev: AnalysisResult | null,
  curr: AnalysisResult,
  changedFiles: Set<string>
): string {
  const ts = new Date().toLocaleString();
  let md = `## 📊 增量变化 (${ts})\n\n`;

  if (!prev) {
    md += `首次分析，生成完整报告。\n`;
    return md;
  }

  // Build lookup maps
  const prevMap = new Map<string, FileAnalysisResult>();
  prev.files.forEach((f) => prevMap.set(path.resolve(f.filePath), f));
  const currMap = new Map<string, FileAnalysisResult>();
  curr.files.forEach((f) => currMap.set(path.resolve(f.filePath), f));

  // Iterate over changed files to show diff
  for (const file of changedFiles) {
    const abs = path.resolve(file);
    const prevRes = prevMap.get(abs);
    const currRes = currMap.get(abs);

    if (!prevRes && currRes) {
      md += `### 🟢 新增文件 \

	\`${file}\`\n\n`;
      md += findingsList(currRes.findings);
      continue;
    }
    if (prevRes && !currRes) {
      md += `### 🔴 删除文件 \

	\`${file}\`\n\n`;
      continue;
    }
    if (prevRes && currRes) {
      // Compare findings counts
      const prevCount = prevRes.findings.length;
      const currCount = currRes.findings.length;
      if (prevCount === currCount) {
        md += `### 🟡 更新文件 \

	\`${file}\` (问题数 ${prevCount} → ${currCount})\n\n`;
      } else if (currCount > prevCount) {
        md += `### 🟡 问题增加 \

	\`${file}\` (问题数 ${prevCount} → ${currCount})\n\n`;
      } else {
        md += `### 🟢 问题减少 \

	\`${file}\` (问题数 ${prevCount} → ${currCount})\n\n`;
      }
      md += findingsDelta(prevRes, currRes);
    }
  }

  return md;
}

function findingsList(findings: any[]): string {
  if (findings.length === 0) return "无新增问题。\n\n";
  let md = "| 严重性 | 消息 |\n| --- | --- |\n";
  for (const f of findings) {
    md += `| ${f.severity.toUpperCase()} | ${f.message} |\n`;
  }
  md += "\n";
  return md;
}

function findingsDelta(
  prev: FileAnalysisResult,
  curr: FileAnalysisResult
): string {
  // For simplicity, only list new findings not in prev based on message
  const prevMessages = new Set(prev.findings.map((f) => f.message));
  const newFindings = curr.findings.filter((f) => !prevMessages.has(f.message));
  if (newFindings.length === 0) return "无新增问题。\n\n";
  let md = "**新增问题**\n\n";
  md += findingsList(newFindings);
  return md;
}
