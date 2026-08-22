"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {SIDE_PAD} from "../lib/courtConstants";
import {API_BASE} from "../../lib/api";
import {
    countServeOutcomes,
    filterServeShots,
    pointsToServeShots,
} from "../lib/serveShots";

/**
 * Canvas heatmap overlay sized to match the Konva Stage.
 * Uses simpleheat on jittered zone coordinates from getServeCoordinates.
 */
export default function ServeHeatmapLayer({
    width,
    height,
    scale = 1,
    points = null,
    matchId,
    playerName,
    surface,
    onStatsChange,
    pointTypeFilter = "serve",
    serveOutcomeFilter = "all",
    pressureFilter = "all",
    pointResultFilter = "all",
}) {
    const canvasRef = useRef(null);
    const [fetchedPoints, setFetchedPoints] = useState([]);

    const sourcePoints = points != null ? points : fetchedPoints;

    useEffect(() => {
        if (points != null) return;
        if (!matchId || !playerName) {
            setFetchedPoints([]);
            return;
        }

        let cancelled = false;
        fetch(`${API_BASE}/getPlayerServes/${matchId}/${encodeURIComponent(playerName)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) {
                    setFetchedPoints(Array.isArray(data?.points) ? data.points : []);
                }
            })
            .catch(() => {
                if (!cancelled) setFetchedPoints([]);
            });

        return () => {
            cancelled = true;
        };
    }, [points, matchId, playerName]);

    const filteredShots = useMemo(() => {
        const shots = pointsToServeShots(sourcePoints, surface);
        return filterServeShots(shots, {
            pointTypeFilter,
            serveOutcomeFilter,
            pressureFilter,
            pointResultFilter,
        });
    }, [sourcePoints, surface, pointTypeFilter, serveOutcomeFilter, pressureFilter, pointResultFilter]);

    useEffect(() => {
        onStatsChange?.(countServeOutcomes(filteredShots));
    }, [filteredShots, onStatsChange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Match Konva stage CSS pixel size so overlay stays aligned on resize.
        const cssW = Math.max(1, Math.round(width));
        const cssH = Math.max(1, Math.round(height));
        canvas.width = cssW;
        canvas.height = cssH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;

        let cancelled = false;

        (async () => {
            const mod = await import("simpleheat");
            if (cancelled || !canvasRef.current) return;
            const simpleheat = mod.default || mod;

            const heat = simpleheat(canvas);
            const heatPoints = filteredShots.map((shot) => {
                const value = shot.outcome === "Ace" ? 2 : 1;
                return [(shot.x + SIDE_PAD) * scale, shot.y * scale, value];
            });

            const intensitySum = heatPoints.reduce((sum, p) => sum + p[2], 0);
            const maxVal = Math.max(1, Math.ceil(intensitySum / 6));

            heat.max(maxVal);
            heat.radius(Math.max(8, 40 * scale), Math.max(6, 25 * scale));
            heat.data(heatPoints);
            heat.draw(0.05);
        })();

        return () => {
            cancelled = true;
        };
    }, [filteredShots, width, height, scale]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute left-0 top-0 z-[1]"
            aria-hidden
        />
    );
}
