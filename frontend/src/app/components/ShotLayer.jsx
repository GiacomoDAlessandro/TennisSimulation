import {Layer, Circle, Label, Tag, Text} from "react-konva";
import {useState, useEffect, useMemo} from "react";
import {SIDE_PAD} from "../lib/courtConstants";
import {API_BASE} from "../../lib/api";
import {
    countServeOutcomes,
    filterServeShots,
    pointsToServeShots,
} from "../lib/serveShots";

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
}) {
    const [fetchedShots, setFetchedShots] = useState([]);
    const [hoveredShot, setHoveredShot] = useState(null);

    // When parent supplies aggregated points, skip the single-match fetch.
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
            }),
        [shots, pointTypeFilter, serveOutcomeFilter, pressureFilter]
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

    return (
        <Layer scaleX={s} scaleY={s}>
            {filteredShots.map((shot, i) => (
                <Circle
                    key={i}
                    x={shot.x + SIDE_PAD}
                    y={shot.y}
                    radius={5}
                    fill={shot.color}
                    onMouseEnter={(e) => {
                        const stagePos = e.target.getStage()?.getPointerPosition();
                        setHoveredShot({
                            shot,
                            x: stagePos?.x ?? 0,
                            y: stagePos?.y ?? 0,
                        });
                    }}
                    onMouseMove={(e) => {
                        const stagePos = e.target.getStage()?.getPointerPosition();
                        setHoveredShot((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      x: stagePos?.x ?? prev.x,
                                      y: stagePos?.y ?? prev.y,
                                  }
                                : prev
                        );
                    }}
                    onMouseLeave={() => setHoveredShot(null)}
                />
            ))}
            {hoveredShot && (
                <Label x={hoveredShot.x / s + 8} y={hoveredShot.y / s - 10}>
                    <Tag
                        fill="#0f172a"
                        opacity={0.94}
                        cornerRadius={8}
                        pointerDirection="left"
                        pointerWidth={7}
                        pointerHeight={7}
                        lineJoin="round"
                        shadowColor="#020617"
                        shadowBlur={10}
                        shadowOpacity={0.35}
                        shadowOffsetY={2}
                    />
                    <Text
                        text={`Set ${hoveredShot.shot.setScore ?? "N/A"}\nGames ${hoveredShot.shot.gameScore ?? "N/A"}\nPoint ${hoveredShot.shot.score ?? "N/A"}\nServe ${hoveredShot.shot.serveNumber ?? "?"} (${formatServeDirection(hoveredShot.shot.serveDirection)})\n${formatOutcome(hoveredShot.shot.outcome)}`}
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
