import {SIDE_PAD} from "../lib/courtConstants";
import {Layer, Circle, Label, Tag, Text} from "react-konva";
import {useState, useEffect} from "react";
import {getServeCoordinates} from "../lib/courtUtils";


function isGamePointScore(score) {
    return score === "40-30" || score === "AD-40" || score === "30-40" || score === "40-AD" || score === "15-30";
}

function isSetPointFromState(score, game1, game2) {
    if (!isGamePointScore(score)) return false;
    const g1 = Number(game1);
    const g2 = Number(game2);
    if (!Number.isFinite(g1) || !Number.isFinite(g2)) return false;

    const p1GamePoint = score === "40-30" || score === "AD-40";
    const p2GamePoint = score === "30-40" || score === "40-AD";

    // Set point in standard 6-game sets if the player can win this game to reach 6 with 2-game lead.
    if (p1GamePoint) {
        const nextG1 = g1 + 1;
        return nextG1 >= 6 && (nextG1 - g2) >= 2;
    }
    if (p2GamePoint) {
        const nextG2 = g2 + 1;
        return nextG2 >= 6 && (nextG2 - g1) >= 2;
    }
    return false;
}

function parseNumericScore(score) {
    const parts = String(score || "").split("-");
    if (parts.length !== 2) return null;
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return [a, b];
}

function isTiebreakPoint(point) {
    const numeric = parseNumericScore(point?.score);
    if (!numeric) return false;
    const g1 = Number(point?.game1);
    const g2 = Number(point?.game2);
    return (g1 === 6 && g2 === 6) || (g1 === 3 && g2 === 3);
}

function getTiebreakGroupKey(point) {
    return `${point?.match_id ?? ""}:${point?.set1 ?? "?"}-${point?.set2 ?? "?"}:${point?.game1 ?? "?"}-${point?.game2 ?? "?"}`;
}

function isTiebreakPressurePoint(score, tiebreakTarget) {
    const parsed = parseNumericScore(score);
    if (!parsed) return false;
    const [p1, p2] = parsed;
    const diff = Math.abs(p1 - p2);

    const isSetPointNow =
        (p1 >= tiebreakTarget - 1 && (p1 - p2) >= 1) ||
        (p2 >= tiebreakTarget - 1 && (p2 - p1) >= 1);

    return isSetPointNow && diff <= 3;
}

export default function ShotLayer({
    s,
    matchId,
    playerName,
    surface,
    onStatsChange,
    pointTypeFilter = "serve",
    serveOutcomeFilter = "all",
    pressureFilter = "all",
}) {
    const [shots, setShots] = useState([]);
    const [hoveredShot, setHoveredShot] = useState(null);

    useEffect(() => {
        if (!matchId) return;
        fetch(`http://localhost:8000/getPlayerServes/${matchId}/${playerName}`)
            .then((res) => res.json())
            .then((data) => {
                const points = Array.isArray(data?.points) ? data.points : [];
                const tiebreakMaxByGroup = new Map();

                for (const point of points) {
                    if (!isTiebreakPoint(point)) continue;
                    const parsed = parseNumericScore(point.score);
                    if (!parsed) continue;
                    const key = getTiebreakGroupKey(point);
                    const maxScore = Math.max(parsed[0], parsed[1]);
                    const prev = tiebreakMaxByGroup.get(key) ?? 0;
                    tiebreakMaxByGroup.set(key, Math.max(prev, maxScore));
                }

                const nextShots = points.flatMap((point) =>
                    getServeCoordinates(
                        point.score,
                        point.first_serve_direction,
                        point.first_serve_outcome,
                        point.second_serve_direction,
                        point.second_serve_outcome,
                        point.had_fault,
                        surface
                    ).map((shot) => {
                        const isGamePoint = isGamePointScore(point.score);
                        const isSetPoint = isSetPointFromState(point.score, point.game1, point.game2);
                        const isTiebreak = isTiebreakPoint(point);
                        const tiebreakGroupKey = getTiebreakGroupKey(point);
                        const tiebreakObservedMax = tiebreakMaxByGroup.get(tiebreakGroupKey) ?? 0;
                        const tiebreakTarget = tiebreakObservedMax >= 10 ? 10 : 7;
                        const isTiebreakPressure = isTiebreak
                            ? isTiebreakPressurePoint(point.score, tiebreakTarget)
                            : false;
                        return {
                            ...shot,
                            gameScore: `${point.game1 ?? "?"}-${point.game2 ?? "?"}`,
                            setScore: `${point.set1 ?? "?"}-${point.set2 ?? "?"}`,
                            isGamePoint,
                            isSetPoint,
                            isPressurePoint: isGamePoint || isSetPoint || isTiebreakPressure,
                        };
                    })
                ).filter((shot) => shot !== null);
                setShots(nextShots);
            })
    }, [matchId, playerName, surface]);

    const filteredShots = shots.filter((shot) => {
        if (pointTypeFilter === "return") {
            // Return filtering is intentionally not active yet.
            return false;
        }

        if (serveOutcomeFilter !== "all") {
            if (serveOutcomeFilter === "fault") {
                if (shot.color !== "red") return false;
            } else if (shot.outcome !== serveOutcomeFilter) {
                return false;
            }
        }

        if (pressureFilter === "pressure_only" && !shot.isPressurePoint) return false;
        if (pressureFilter === "non_pressure" && shot.isPressurePoint) return false;

        return true;
    });

    const counts = filteredShots.reduce((acc, shot) => {
        const outcome = shot.outcome;
        if (outcome === "Ace") acc.aces += 1;
        else if (outcome === "Unreturnable") acc.unreturnables += 1;
        else if (outcome === "in_play") acc.inPlay += 1;
        else if (shot.color === "red") acc.faults += 1;
        return acc;
    }, {aces: 0, unreturnables: 0, inPlay: 0, faults: 0});

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
                        setHoveredShot((prev) => prev ? ({
                            ...prev,
                            x: stagePos?.x ?? prev.x,
                            y: stagePos?.y ?? prev.y,
                        }) : prev);
                    }}
                    onMouseLeave={() => setHoveredShot(null)}
                />
            ))}
            {hoveredShot && (
                <Label x={(hoveredShot.x / s) + 8} y={(hoveredShot.y / s) - 10}>
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
    )
}