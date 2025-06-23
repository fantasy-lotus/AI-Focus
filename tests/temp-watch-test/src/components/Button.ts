
/**
 * 按钮组件
 */
import { formatText } from '../utils/format';
import { validate } from '../utils/validate';

export interface ButtonProps {
  text: string;
  onClick: () => void;
}

export function Button(props: ButtonProps) {
  const { text, onClick } = props;
  
  const handleClick = () => {
    if (validate(text)) {
      onClick();
    }
  };
  
  return {
    text: formatText(text),
    handleClick
  };
}
