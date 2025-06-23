
/**
 * 验证工具
 */
import { formatText } from './format';

export function validate(text: string): boolean {
  const formatted = formatText(text);
  return formatted.length > 0;
}
