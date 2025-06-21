/**
 * @file Markdown报告生成器
 * @description 将AI分析结果生成对应的Markdown文档
 * @module output/markdown-generator
 * @see {@link /agentic-docs/.module-docs/AIFocus/output/README.md} - 输出模块文档
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * 文档结构节点接口
 * @description 定义了文档树的节点，可以是一个目录（包含子节点）或一个文件（包含内容）
 */
export interface DocNode {
  type: "dir" | "file";
  name: string;
  content?: string; // 仅对 file 类型有效
  children?: DocNode[]; // 仅对 dir 类型有效
}

/**
 * AI生成内容写入器
 * @description 负责将AI生成的、具有层级结构的文档内容写入文件系统
 */
export class MarkdownGenerator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * 将简单的字符串内容写入单个文件
   * @param content 要写入的内容
   * @param fileName 输出文件名
   * @returns 写入文件的完整路径
   */
  public async generateFile(
    content: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(this.outputDir, fileName);
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return filePath;
    } catch (error) {
      console.error(`写入Markdown文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 根据文档结构树生成对应的目录和文件
   * @param docTree 文档结构树
   */
  public async generate(docTree: DocNode): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await this.generateNode(docTree, this.outputDir);
    } catch (error) {
      console.error(`生成文档结构失败`, error);
      throw error;
    }
  }

  /**
   * 递归生成节点（目录或文件）
   * @param node 当前文档节点
   * @param currentPath 当前文件系统路径
   */
  private async generateNode(
    node: DocNode,
    currentPath: string
  ): Promise<void> {
    // 统一处理路径，无论是目录还是文件
    const newPath = path.join(currentPath, node.name);

    if (node.type === "dir") {
      // 1. 创建目录
      await fs.mkdir(newPath, { recursive: true });

      // 2. 递归处理所有子节点
      if (node.children) {
        // 使用 Promise.all 并行处理，提高效率
        await Promise.all(
          node.children.map((child) => this.generateNode(child, newPath))
        );
      }
    } else if (node.type === "file") {
      // 3. 如果是文件类型，直接写入内容
      if (node.content) {
        // 强制确保文件扩展名为 .md
        const baseName = path.basename(node.name, path.extname(node.name));
        const mdFileName = `${baseName}.md`;
        const filePath = path.join(currentPath, mdFileName);
        await fs.writeFile(filePath, node.content, "utf-8");
      }
    }
  }
}
