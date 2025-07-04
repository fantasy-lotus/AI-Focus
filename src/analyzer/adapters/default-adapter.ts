// 默认适配器，用于暂不支持生成统一节点的语言
import { NodeAdapter, UnifiedNode } from "../unified-node";

export class DefaultAdapter implements NodeAdapter {
  /** 返回空列表，表示无统一节点 */
  toUnifiedNodes(tree: any, filePath: string): UnifiedNode[] {
    return [];
  }

  /** 不处理任何节点 */
  convertNode(node: any, parent?: UnifiedNode): UnifiedNode | null {
    return null;
  }

  /** 不报告错误节点 */
  getErrorRatio(tree: any): number {
    return 0;
  }
}
