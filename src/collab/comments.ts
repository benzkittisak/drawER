/**
 * Pinned comment threads — stored in the Yjs doc (synced + persisted). Author identity is
 * embedded on each comment/reply so the UI needs no separate user directory.
 */
import * as Y from 'yjs';
import type { DocMaps, YArr, YMap } from './ydoc';

export interface CommentReply {
  author: string;
  authorName: string;
  authorColor: string;
  body: string;
  ts: number;
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  tableId: string | null;
  resolved: boolean;
  author: string;
  authorName: string;
  authorColor: string;
  body: string;
  createdAt: number;
  replies: CommentReply[];
}

function commentToY(c: Comment): YMap {
  const m = new Y.Map<unknown>();
  m.set('id', c.id);
  m.set('x', c.x);
  m.set('y', c.y);
  m.set('tableId', c.tableId);
  m.set('resolved', c.resolved);
  m.set('author', c.author);
  m.set('authorName', c.authorName);
  m.set('authorColor', c.authorColor);
  m.set('body', c.body);
  m.set('createdAt', c.createdAt);
  const replies = new Y.Array<unknown>();
  replies.push(c.replies);
  m.set('replies', replies);
  return m;
}

function yToComment(m: YMap): Comment {
  const replies = ((m.get('replies') as YArr | undefined)?.toArray() as CommentReply[] | undefined) ?? [];
  return {
    id: m.get('id') as string,
    x: m.get('x') as number,
    y: m.get('y') as number,
    tableId: (m.get('tableId') as string | null) ?? null,
    resolved: !!m.get('resolved'),
    author: m.get('author') as string,
    authorName: m.get('authorName') as string,
    authorColor: m.get('authorColor') as string,
    body: m.get('body') as string,
    createdAt: (m.get('createdAt') as number) ?? 0,
    replies: replies.map((r) => ({ ...r })),
  };
}

export function readComments(maps: DocMaps): Comment[] {
  return (Array.from(maps.comments.values()) as YMap[]).map(yToComment).sort((a, b) => a.createdAt - b.createdAt);
}

export const commentMut = {
  add(maps: DocMaps, c: Comment): void {
    maps.comments.set(c.id, commentToY(c));
  },
  resolve(maps: DocMaps, id: string): void {
    const m = maps.comments.get(id);
    if (m) m.set('resolved', !m.get('resolved'));
  },
  reply(maps: DocMaps, id: string, reply: CommentReply): void {
    const m = maps.comments.get(id);
    if (m) (m.get('replies') as YArr).push([reply]);
  },
  remove(maps: DocMaps, id: string): void {
    maps.comments.delete(id);
  },
};
