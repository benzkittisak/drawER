/**
 * DraftInput / DraftTextarea — controlled text fields whose displayed value is buffered locally so the
 * caret never jumps. Store-backed values (e.g. Yjs) round-trip back asynchronously; binding the DOM
 * directly to that value re-applies `.value` a tick after each keystroke and resets the selection to the
 * end. Here we keep a local `draft`, write through to `onChange` on every keystroke (live collab intact),
 * and only accept an incoming `value` while the field is NOT focused — so a remote edit still lands, but
 * our own in-flight typing is never clobbered. Same idea as EditableTitle, but always editable.
 */
import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type DraftInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

export function DraftInput({ value, onChange, onFocus, onBlur, ...rest }: DraftInputProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <input
      {...rest}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDraft(value);
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

type DraftTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

export function DraftTextarea({ value, onChange, onFocus, onBlur, ...rest }: DraftTextareaProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <textarea
      {...rest}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDraft(value);
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}
