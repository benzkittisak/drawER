import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { DraftInput } from './DraftInput';

// React 19 act() requires this flag in a test environment.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** Simulate a user keystroke on a controlled input (bypass React's value tracker, then fire `input`). */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('DraftInput — caret-safe controlled input', () => {
  it('keeps the local draft while focused (ignores an external value), re-syncs on blur', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    const changes: string[] = [];
    const render = (value: string) =>
      act(() => {
        root.render(<DraftInput value={value} onChange={(v) => changes.push(v)} />);
      });

    render('abc');
    const input = el.querySelector('input')!;
    expect(input.value).toBe('abc');

    // Type while focused — write-through fires, draft updates.
    act(() => input.focus());
    act(() => typeInto(input, 'abcd'));
    expect(changes.at(-1)).toBe('abcd');
    expect(input.value).toBe('abcd');

    // A new value arriving from outside (Yjs round-trip / remote edit) must NOT clobber the focused edit.
    render('zzz');
    expect(input.value).toBe('abcd');

    // Blur re-syncs to the authoritative value.
    act(() => input.blur());
    expect(input.value).toBe('zzz');

    act(() => root.unmount());
    el.remove();
  });
});
