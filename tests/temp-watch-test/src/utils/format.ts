
/**
 * 文本格式化工具
 */
export function formatText(text: string): string {
  return text.trim();
}

export function capitalizeText(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
