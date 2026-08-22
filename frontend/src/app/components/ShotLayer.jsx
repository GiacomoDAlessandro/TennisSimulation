import {Layer, Circle, Label, Tag, Text} from "react-konva";
import {useState, useEffect, useMemo} from "react";
import {SIDE_PAD, STAGE_W, STAGE_H} from "../lib/courtConstants";
import {API_BASE} from "../../lib/api";
import {
    countServeOutcomes,
    filterServeShots,
    pointsToServeShots,
} from "../lib/serveShots";

const TIP_GAP = 8;

function tipAtMarker(shot) {
    const tipX = Math.max(4, Math.min(shot.x + SIDE_PAD, STAGE_W - 4));
    const tipY = shot.y;
    if (tipY - TIP_GAP > 4) {
        return {x: tipX, y: tipY - TIP_GAP, pointerDirection: "down"};
    }
    return {
        x: tipX,
        y: Math.min(tipY + TIP_GAP, STAGE_H - 4),
        pointerDirection: "up",
    };
}

export default function ShotLayer({
    s,
    matchId,
    playerName,
    surface,
    points = null,
    onStatsChange,
    pointTypeFilter = "serve",
    serveOutcomeFilter = "all",
    pressureFilter = "all",
    pointResultFilter = "all",
}) {
    const [fetchedShots, setFetchedShots] = useState([]);
    const [hoveredShot, setHoveredShot] = useState(null);

    useEffect(() => {
        if (points != null) return;
        if (!matchId) {
            setFetchedShots([]);
            return;
        }

        let cancelled = false;
        fetch(`${API_BASE}/getPlayerServes/${matchId}/${playerName}`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                const nextPoints = Array.isArray(data?.points) ? data.points : [];
                setFetchedShots(pointsToServeShots(nextPoints, surface));
            })
            .catch(() => {
                if (!cancelled) setFetchedShots([]);
            });

        return () => {
            cancelled = true;
        };
    }, [points, matchId, playerName, surface]);

    const shots = useMemo(() => {
        if (points != null) {
            return pointsToServeShots(points, surface);
        }
        return fetchedShots;
    }, [points, surface, fetchedShots]);

    const filteredShots = useMemo(
        () =>
            filterServeShots(shots, {
                pointTypeFilter,
                serveOutcomeFilter,
                pressureFilter,
                pointResultFilter,
            }),
        [shots, pointTypeFilter, serveOutcomeFilter, pressureFilter, pointResultFilter]
    );

    const counts = useMemo(() => countServeOutcomes(filteredShots), [filteredShots]);

    const formatOutcome = (outcome) => {
        if (!outcome) return "N/A";
        if (outcome === "in_play") return "In play";
        return outcome;
    };

    const formatServeDirection = (direction) => {
        if (!direction) return "N/A";
        if (direction === "T") return "T";
        return direction.charAt(0).toUpperCase() + direction.slice(1);
    };

    useEffect(() => {
        onStatsChange?.(counts);
    }, [counts, onStatsChange]);

    const tooltip = hoveredShot ? tipAtMarker(hoveredShot) : null;

    return (
        <Layer scaleX={s} scaleY={s}>
            {filteredShots.map((shot, i) => (
                <Circle
                    key={i}
                    x={shot.x + SIDE_PAD}
                    y={shot.y}
                    radius={5}
                    fill={shot.color}
                    onMouseEnter={() => setHoveredShot(shot)}
                    onMouseLeave={() => setHoveredShot(null)}
                />
            ))}
            {hoveredShot && tooltip && (
                <Label x={tooltip.x} y={tooltip.y} listening={false}>
                    <Tag
                        fill="#0f172a"
                        opacity={0.94}
                        cornerRadius={8}
                        pointerDirection={tooltip.pointerDirection}
                        pointerWidth={7}
                        pointerHeight={7}
                        lineJoin="round"
                        shadowColor="#020617"
                        shadowBlur={10}
                        shadowOpacity={0.35}
                        shadowOffsetY={2}
                    />
                    <Text
                        text={`Set ${hoveredShot.setScore ?? "N/A"}\nGames ${hoveredShot.gameScore ?? "N/A"}\nPoint ${hoveredShot.score ?? "N/A"}\nServe ${hoveredShot.serveNumber ?? "?"} (${formatServeDirection(hoveredShot.serveDirection)})\n${formatOutcome(hoveredShot.outcome)}\n${hoveredShot.serverWonPoint ? "Won point" : "Lost point"}`}
                        fontSize={12}
                        fontStyle="500"
                        padding={8}
                        lineHeight={1.25}
                        fill="#f8fafc"
                    />
                </Label>
            )}
        </Layer>
    );
}
