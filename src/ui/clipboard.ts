/**
 * copyToClipboard — clipboard write that also works outside secure contexts.
 * `navigator.clipboard` is undefined on plain-HTTP origins (e.g. a production deploy without
 * TLS), so fall back to the legacy hidden-textarea + execCommand path there. Returns whether
 * the copy actually happened so callers only show "Copied!" when it's true.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* permission denied — fall through to the legacy path */
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}
