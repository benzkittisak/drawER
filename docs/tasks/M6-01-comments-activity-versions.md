# M6-01 — Comments, activity feed, version history, share
Status: todo
Milestone: M6
Depends on: M5-01

## Goal
Make the remaining collaboration UI real: pinned comment threads, the activity feed, local version
history (snapshots + diffs + restore), and the share-room flow.

## Context / links
- Plan: "Collaboration" mapping table. These replace the seed-data mocks in `RightPanel`,
  `CommentCard`, `ShareModal`, and `History`.

## Files to touch
- `src/collab/comments.ts` — `comments` Y.Map `{id,x,y,tableId,resolved,author,body,createdAt,replies:Y.Array}`.
- `src/collab/activity.ts` — append-only `Y.Array('activity')`; store actions append entries on mutation.
- `src/collab/versions.ts` — `saveVersion(label)` (`Y.encodeStateAsUpdate` + metadata in IndexedDB),
  `listVersions()`, `diffVersions(a,b)` (decode → model → structural add/mod/del), `restoreVersion(id)`.
- `src/store/hooks.ts` — `useComments`, `useActivity`, `useVersions`.
- Views: `panels/CommentCard.tsx`, `panels/RightPanel.tsx`, `views/History.tsx`, `panels/ShareModal.tsx`
  (real share link → `shareRoom()`), canvas `CommentPins.tsx`.

## Public contract
```ts
export function useComments(): Comment[];
export function useActivity(): ActivityEntry[];
export function useVersions(): { list(): VersionMeta[]; save(label: string): void; restore(id: string): void; diff(a: string, b: string): Diff };
```

## Acceptance criteria
- Comments sync across windows, support replies + resolve, and persist.
- Activity feed reflects real edits; "● live now" derives from awareness.
- Saving a version snapshots state; the timeline shows computed diff tags; restore applies a snapshot.
- Share produces a working room link that a second window can join.

## How to verify
Two windows: add/resolve a comment (see it in both); make edits (see activity); save+restore a version; share link → join.
