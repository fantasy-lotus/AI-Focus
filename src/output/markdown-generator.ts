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
      // 处理更新时间行
      const finalContent = this.withUpdatedTimestamp(content);
      await fs.writeFile(filePath, finalContent, "utf-8");
      return filePath;
    } catch (error) {
      console.error(`写入Markdown文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 为 Markdown 内容插入或更新第一行的 **最后更新** 时间戳
   */
  private withUpdatedTimestamp(original: string): string {
    const timestampLine = `**最后更新**: ${this.getFormattedNow()}`;
    const lines = original.split("\n");
    if (lines[0]?.startsWith("**最后更新**:")) {
      lines[0] = timestampLine;
    } else {
      lines.unshift(timestampLine);
    }
    return lines.join("\n");
  }

  /** 获取格式化当前时间 */
  private getFormattedNow(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
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
        const finalContent = this.withUpdatedTimestamp(node.content);
        await fs.writeFile(filePath, finalContent, "utf-8");
      }
    }
  }

  /**
   * 在指定 Markdown 文件中插入或更新一个带锚点的区块
   * @param filePath 目标 Markdown 文件路径
   * @param sectionId 区块唯一标识符（将用作 HTML 注释锚点）
   * @param content 要插入的 Markdown 内容（不包含锚点注释）
   */
  public async appendOrUpdateSection(
    filePath: string,
    sectionId: string,
    content: string
  ): Promise<void> {
    const beginTag = `<!-- BEGIN_${sectionId} -->`;
    const endTag = `<!-- END_${sectionId} -->`;

    let fileContent = "";
    try {
      fileContent = await fs.readFile(filePath, "utf-8");
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // 文件不存在，直接创建
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const finalContent = `${beginTag}\n${content}\n${endTag}\n`;
        await fs.writeFile(filePath, finalContent, "utf-8");
        return;
      }
      throw err;
    }

    if (fileContent.includes(beginTag) && fileContent.includes(endTag)) {
      // 更新已有区块
      const regex = new RegExp(`${beginTag}[\s\S]*?${endTag}`, "gm");
      fileContent = fileContent.replace(
        regex,
        `${beginTag}\n${content}\n${endTag}`
      );
    } else {
      // 在顶部插入新的区块，保持文档历史在后
      fileContent = `${beginTag}\n${content}\n${endTag}\n\n${fileContent}`;
    }

    await fs.writeFile(filePath, fileContent, "utf-8");
  }
}
