<!-- ff383a97-0c71-452f-95b0-99ab8da651fd -->
---
todos:
  - id: "fix-tooltip-anchor"
    content: "Anchor ShotLayer tooltip to shot.x/shot.y above the marker"
    status: pending
isProject: false
---
# Fix hover card to sit over the point marker

## Cause

In [`ShotLayer.jsx`](frontend/src/app/components/ShotLayer.jsx), circles are drawn in **layer-local** coords:

```js
x={shot.x + SIDE_PAD}
y={shot.y}
```

But the tooltip uses `getPointerPosition()` (stage **pixels**), then divides by `s` and clamps. With `courtScale` (~0.62) that mismatch puts the Label in the wrong place (“everywhere”).

The Label lives in the same scaled `<Layer scaleX={s} scaleY={s}>`, so it must use the **same coordinate space as the Circle**.

## Fix (one file)

Update [`frontend/src/app/components/ShotLayer.jsx`](frontend/src/app/components/ShotLayer.jsx):

1. On hover, store only `{ shot }` (drop pointer `x`/`y` from positioning).
2. Anchor tooltip to the marker:
   - `anchorX = shot.x + SIDE_PAD`
   - `anchorY = shot.y`
3. Place card **just above** the marker, horizontally centered:
   - `x = anchorX - LABEL_W / 2`
   - `y = anchorY - gap - LABEL_H`
   - `pointerDirection = "down"`
4. If that would clip the top of the stage, place **just below** instead (`pointerDirection = "up"`).
5. Clamp `x`/`y` only enough to stay inside `STAGE_W` / `STAGE_H` (nudge, no side-flip across the court).

Remove `onMouseMove` position updates used only for pointer tracking (optional keep leave/enter).

## Verify

- Hover a serve near center, left edge, right edge, and top of service box: card sits directly above (or below if needed) that marker.
- No jump to the opposite side of the court.
