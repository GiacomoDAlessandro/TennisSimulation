import {getServeSide} from "./courtUtils";

const DIRECTIONS = ["wide", "body", "T"];
const SUCCESS = new Set(["in_play", "Ace", "Unreturnable"]);

function isFault(outcome) {
    return outcome && !SUCCESS.has(outcome);
}

export function flattenServesFromPoints(points) {
    if (!Array.isArray(points)) return [];

    const serves = [];
    for (const point of points) {
        const side = getServeSide(point.score);
        if (!side) continue;

        if (point.first_serve_direction) {
            serves.push({
                side,
                direction: point.first_serve_direction,
                outcome: point.first_serve_outcome,
                isFault: isFault(point.first_serve_outcome),
            });
        }

        if (point.had_fault && point.second_serve_direction) {
            serves.push({
                side,
                direction: point.second_serve_direction,
                outcome: point.second_serve_outcome,
                isFault: isFault(point.second_serve_outcome),
            });
        }
    }
    return serves;
}

export function buildServeAnalytics(serves) {
    const bySide = {
        D: {total: 0, wide: 0, body: 0, T: 0},
        A: {total: 0, wide: 0, body: 0, T: 0},
    };
    const bySideDirection = {
        D: {
            wide: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
            body: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
            T: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
        },
        A: {
            wide: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
            body: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
            T: {Ace: 0, Unreturnable: 0, in_play: 0, fault: 0},
        },
    };

    for (const serve of serves) {
        const side = bySide[serve.side];
        if (!side) continue;

        side.total += 1;
        if (DIRECTIONS.includes(serve.direction)) {
            side[serve.direction] += 1;
            const bucket = bySideDirection[serve.side][serve.direction];
            if (serve.outcome === "Ace") bucket.Ace += 1;
            else if (serve.outcome === "Unreturnable") bucket.Unreturnable += 1;
            else if (serve.outcome === "in_play") bucket.in_play += 1;
            else if (serve.isFault) bucket.fault += 1;
        }
    }

    return {bySide, bySideDirection};
}

export function getDirectionShare(sideStats, direction) {
    const total = sideStats?.total ?? 0;
    const count = sideStats?.[direction] ?? 0;
    return {
        count,
        total,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
}

export function getOutcomeShares(outcomes) {
    const total = Object.values(outcomes ?? {}).reduce((n, v) => n + v, 0);
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
        total,
        Ace: {count: outcomes?.Ace ?? 0, pct: pct(outcomes?.Ace ?? 0)},
        Unreturnable: {count: outcomes?.Unreturnable ?? 0, pct: pct(outcomes?.Unreturnable ?? 0)},
        in_play: {count: outcomes?.in_play ?? 0, pct: pct(outcomes?.in_play ?? 0)},
        fault: {count: outcomes?.fault ?? 0, pct: pct(outcomes?.fault ?? 0)},
    };
}

export const SERVE_DIRECTIONS = DIRECTIONS;

export function formatDirection(direction) {
    if (direction === "T") return "T";
    if (!direction) return "Unknown";
    return direction.charAt(0).toUpperCase() + direction.slice(1);
}
