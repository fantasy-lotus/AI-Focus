
/**
 * 卡片组件
 */
import { formatText } from '../utils/format';
import { Button } from './Button';

export interface CardProps {
  title: string;
  content: string;
  onAction?: () => void;
}

export function Card(props: CardProps) {
  const { title, content, onAction } = props;
  
  const button = onAction ? Button({
    text: 'Action',
    onClick: onAction
  }) : null;
  
  return {
    title: formatText(title),
    content,
    button
  };
}
