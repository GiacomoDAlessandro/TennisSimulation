<!-- ff383a97-0c71-452f-95b0-99ab8da651fd -->
---
todos:
  - id: "fix-tip-origin"
    content: "Rewrite tooltipAboveMarker to use Konva tip-origin coords"
    status: pending
isProject: false
---
# Fix hover card to sit on the point marker

## Cause

Konva `Label` + `Tag` with `pointerDirection` sets the group origin to the **pointer tip**. For `down`, Tag/Text are offset by `(-width/2, -(height + pointerHeight))` in [`Label._sync`](frontend/node_modules/konva/lib/shapes/Label.js).

[`tooltipAboveMarker`](frontend/src/app/components/ShotLayer.jsx) still subtracts `LABEL_W/2` and `LABEL_H`, so the tip is shifted ~80px left and ~112px up — matching the screenshot.

## Fix

In [`frontend/src/app/components/ShotLayer.jsx`](frontend/src/app/components/ShotLayer.jsx), replace `tooltipAboveMarker` with tip-at-marker positioning:

```js
const TIP_GAP = 8;

function tipAtMarker(shot) {
  const tipX = shot.x + SIDE_PAD;
  const tipY = shot.y;
  // Prefer tip just above the circle; if near stage top, tip just below
  if (tipY - TIP_GAP > 4) {
    return { x: tipX, y: tipY - TIP_GAP, pointerDirection: "down" };
  }
  return { x: tipX, y: tipY + TIP_GAP, pointerDirection: "up" };
}
```

- Remove unused `LABEL_W` / `LABEL_H` and the old top-left math.
- Keep `Label listening={false}`.
- Light-clamp only the tip into `[4, STAGE_W - 4]` / `[4, STAGE_H - 4]` if needed so edge markers don’t put the tip off-stage (bubble may overhang slightly — acceptable).

## Verify

Hover serves at center, left wide-error, right wide-error, and near top: arrow tip sits on the marker; card directly above (or below near top).
