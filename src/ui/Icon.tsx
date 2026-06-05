/**
 * Icon — stroke icon set ported verbatim from the design (docs/design-reference/icons.jsx).
 * 24x24 viewBox, currentColor stroke. These are the design's own paths (not lucide) for
 * pixel fidelity and zero extra dependency.
 */
import type { CSSProperties } from 'react';

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  table: 'M3 9h18M9 3v18M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
  link: 'M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1M13.5 17.5l-1 1a4 4 0 0 1-6-6l1-1',
  comment: 'M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-5.4A8 8 0 1 1 21 12Z',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  users: 'M16 19a4 4 0 0 0-8 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 18a3.5 3.5 0 0 0-3-3.4M17 4.2a3 3 0 0 1 0 5.6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  zoomIn: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3M11 8v6M8 11h6',
  zoomOut: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3M8 11h6',
  fit: 'M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4',
  focus: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 12h4M18 12h4M12 2v4M12 18v4',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 7.5-2',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  key: 'M15 7a4 4 0 1 1-3.5 5.9L7 17l-2 .5L5 15l.5-2 4.6-4.6A4 4 0 0 1 15 7ZM16 8h.01',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  moreH: 'M6 12h.01M12 12h.01M18 12h.01',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 6',
  checkCircle: 'M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-4-2L5.5 16a1.5 1.5 0 0 1 2.4-1.8L8 13',
  cursor: 'M5 3l15 8-6 1.5L11 19 5 3Z',
  code: 'M9 8l-5 4 5 4M15 8l5 4-5 4',
  folder: 'M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.5l1.2-6L3.4 9.3l6-.7L12 3Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V19a2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2 13a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.2-2.7l-.1-.1A2 2 0 1 1 5.9 3.4l.1.1A1.6 1.6 0 0 0 8 4.6 2 2 0 1 1 12 5a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 11',
  hash: 'M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16',
  sql: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  minus: 'M5 12h14',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  flow: 'M5 6h6M5 12h14M5 18h9',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 18, stroke = 2, className = '', style }: IconProps) {
  return (
    <svg
      className={'ico ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
