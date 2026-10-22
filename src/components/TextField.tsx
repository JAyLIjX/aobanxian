/**
 * 有字数限制的文字输入框（幡上文字、纪念日名称……）。
 *
 * 中文输入法组字时，拼音还没上屏也会出现在输入框里（「奥半xi」）。所以：
 *   - 不用 maxLength，也不在输入时截断；
 *   - 组字期间（compositionstart 到 compositionend，或 isComposing）什么都不做：不计数、不标红、不保存；
 *   - 组字结束后按「字」（字素，emoji 也算 1 个）计数；超了就标红、提示「最多 N 个字」、不保存，不截断；
 *   - 只在合法时把值交给 onCommit；失去焦点时如果不合法，恢复为上一次保存的值。
 */
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { countChars } from "../core/text";

export interface TextCheck {
  count: number;
  over: boolean;
  empty: boolean;
  valid: boolean;
}

/** 按字计数并判断是否合法（纯函数） */
export function checkText(
  text: string,
  max: number,
  required = false,
): TextCheck {
  const count = countChars(text.trim());
  const over = count > max;
  const empty = !text.trim();
  return { count, over, empty, valid: !over && !(required && empty) };
}

interface Props {
  /** 上一次保存的值 */
  value: string;
  /** 最多几个字 */
  max: number;
  /** 合法时调用（组字结束后），传入去掉首尾空白的文字 */
  onCommit: (value: string) => void;
  /** 空白算不合法（不保存） */
  required?: boolean;
  /** 组字结束后报告当前输入是否合法（表单用来禁用提交按钮） */
  onValidChange?: (valid: boolean) => void;
  ariaLabel?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function TextField({
  value,
  max,
  onCommit,
  required = false,
  onValidChange,
  ariaLabel,
  placeholder,
  autoFocus,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [check, setCheck] = useState(() => checkText(value, max, required));
  const composing = useRef(false);
  const focused = useRef(false);

  // 别处改了值（其他窗口、恢复默认）：没在输入时跟上
  useEffect(() => {
    if (focused.current || composing.current) return;
    setDraft(value);
    setCheck(checkText(value, max, required));
  }, [value, max, required]);

  const settle = (text: string) => {
    const c = checkText(text, max, required);
    setCheck(c);
    onValidChange?.(c.valid);
    if (c.valid && text.trim() !== value) onCommit(text.trim());
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    // 输入法还在组字：拼音没上屏，不算字、不处理
    if (composing.current || (e.nativeEvent as InputEvent).isComposing) return;
    settle(e.target.value);
  };

  const onCompositionStart = () => {
    composing.current = true;
  };

  const onCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    const text = e.currentTarget.value;
    setDraft(text);
    settle(text);
  };

  const onBlur = () => {
    focused.current = false;
    if (composing.current) return;
    if (!checkText(draft, max, required).valid) {
      setDraft(value);
      setCheck(checkText(value, max, required));
      onValidChange?.(checkText(value, max, required).valid);
    }
  };

  const showError = check.over;
  return (
    <span className={`text-field ${className}`}>
      <input
        className={`text-input ${showError ? "is-invalid" : ""}`}
        value={draft}
        aria-label={ariaLabel}
        aria-invalid={showError}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => (focused.current = true)}
        onChange={onChange}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onBlur={onBlur}
      />
      <span className="text-field__foot">
        {showError && (
          <span className="text-field__error">
            {t("textField.tooLong", { max })}
          </span>
        )}
        <span className={`text-field__count ${showError ? "is-over" : ""}`}>
          {check.count}/{max}
        </span>
      </span>
    </span>
  );
}
