<!-- ff383a97-0c71-452f-95b0-99ab8da651fd -->
---
todos:
  - id: "add-helper"
    content: "Add filterPlayers in frontend/src/app/lib/playerSearch.js"
    status: pending
  - id: "wire-boxes"
    content: "Replace filterByPrefix in onePlayerBox.jsx and TwoPlayerBox.jsx"
    status: pending
isProject: false
---
# Player last-name search

## Problem

[`onePlayerBox.jsx`](frontend/src/app/components/onePlayerBox.jsx) and [`TwoPlayerBox.jsx`](frontend/src/app/components/TwoPlayerBox.jsx) both filter with full-name `startsWith`, so `"Nadal"` misses `"Rafael Nadal"`.

## Approach

One shared helper; match if **any whitespace-separated name token** starts with the query (also keeps first-name prefix search). No backend changes.

```js
// frontend/src/app/lib/playerSearch.js
export function filterPlayers(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((name) =>
    String(name).toLowerCase().split(/\s+/).some((part) => part.startsWith(q))
  );
}
```

Chosen over `includes` on the full string to avoid noisy mid-token hits (e.g. `"al"` matching half the list). Hyphenated parts stay one token unless needed later.

## Changes

1. Add [`frontend/src/app/lib/playerSearch.js`](frontend/src/app/lib/playerSearch.js) with `filterPlayers` as above.
2. In [`onePlayerBox.jsx`](frontend/src/app/components/onePlayerBox.jsx): delete local `filterByPrefix`; import `filterPlayers`; use it in the existing `useMemo`.
3. In [`TwoPlayerBox.jsx`](frontend/src/app/components/TwoPlayerBox.jsx): same for both player option memos.

## Verify

- `"Rafa"` / `"Nadal"` / `"nad"` → Rafael Nadal
- Empty query → full list
- Both one-player and compare dropdowns behave the same
