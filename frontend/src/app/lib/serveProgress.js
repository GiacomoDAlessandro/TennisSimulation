import {compareTwoRates, linearTrend, wilsonInterval} from "./stats";

const MIN_SERVICE_GAMES = 3;
const ROLLING_WINDOW = 10;
const MIN_TREND_MATCHES = 8;

export const ROUND_FILTERS = [
    {value: "all", label: "All rounds"},
    {value: "r16plus", label: "R16+"},
    {value: "finals", label: "SF / F"},
];

const ROUND_SETS = {
    r16plus: new Set(["F", "SF", "QF", "R16"]),
    finals: new Set(["F", "SF"]),
};

export function parseMatchDate(matchId, fallbackDate) {
    if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(String(fallbackDate))) {
        return String(fallbackDate);
    }
    const prefix = String(matchId || "").slice(0, 8);
    if (prefix.length === 8 && /^\d{8}$/.test(prefix)) {
        return `${prefix.slice(0, 4)}-${prefix.slice(4, 6)}-${prefix.slice(6, 8)}`;
    }
    return null;
}

function slotEq(a, b) {
    return Number(a) === Number(b);
}

function isFaultFlag(hadFault) {
    return hadFault === true || hadFault === "true" || hadFault === 1;
}

function parseNumericScore(score) {
    const parts = String(score || "").split("-");
    if (parts.length !== 2) return null;
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return [a, b];
}

export function isTiebreakPoint(point) {
    const numeric = parseNumericScore(point?.score);
    if (!numeric) return false;
    const g1 = Number(point?.game1);
    const g2 = Number(point?.game2);
    return (g1 === 6 && g2 === 6) || (g1 === 3 && g2 === 3);
}

function pct(n, d) {
    if (!d) return null;
    return Math.round((n / d) * 1000) / 10;
}

export function metricsByMatch(points, {minServiceGames = MIN_SERVICE_GAMES} = {}) {
    if (!Array.isArray(points) || points.length === 0) return [];

    const byMatch = new Map();
    for (const point of points) {
        const matchId = point?.match_id;
        if (matchId == null) continue;
        if (!byMatch.has(matchId)) byMatch.set(matchId, []);
        byMatch.get(matchId).push(point);
    }

    const rows = [];
    for (const [matchId, matchPoints] of byMatch) {
        matchPoints.sort((a, b) => Number(a.point_number) - Number(b.point_number));

        const games = new Map();
        let servePoints = 0;
        let serveWon = 0;
        let firstServePoints = 0;
        let firstServeWon = 0;
        let secondServePoints = 0;
        let secondServeWon = 0;

        for (const point of matchPoints) {
            servePoints += 1;
            const won = slotEq(point.winner, point.server);
            if (won) serveWon += 1;

            if (isFaultFlag(point.had_fault)) {
                secondServePoints += 1;
                if (won) secondServeWon += 1;
            } else {
                firstServePoints += 1;
                if (won) firstServeWon += 1;
            }

            const gn = point.game_number;
            if (gn == null) continue;
            if (!games.has(gn)) games.set(gn, []);
            games.get(gn).push(point);
        }

        let serviceGames = 0;
        let breaks = 0;
        for (const group of games.values()) {
            if (group.some(isTiebreakPoint)) continue;
            serviceGames += 1;
            const last = group[group.length - 1];
            if (!slotEq(last.winner, last.server)) breaks += 1;
        }

        if (serviceGames < minServiceGames) continue;

        const sample = matchPoints[0] || {};
        rows.push({
            matchId: String(matchId),
            date: parseMatchDate(matchId, sample.date),
            surface: sample.surface || null,
            tournament: sample.tournament || null,
            round: sample.round || null,
            serveWonPct: pct(serveWon, servePoints),
            firstServeWonPct: pct(firstServeWon, firstServePoints),
            secondServeWonPct: pct(secondServeWon, secondServePoints),
            holdPct: pct(serviceGames - breaks, serviceGames),
            breaks,
            serviceGames,
            servePoints,
        });
    }

    rows.sort((a, b) => {
        const da = a.date || "";
        const db = b.date || "";
        if (da !== db) return da.localeCompare(db);
        return String(a.matchId).localeCompare(String(b.matchId));
    });

    return rows;
}

export function withRollingAverage(series, valueKey, windowSize = ROLLING_WINDOW) {
    if (!Array.isArray(series)) return [];
    return series.map((row, index) => {
        const start = Math.max(0, index - windowSize + 1);
        const slice = series.slice(start, index + 1);
        const values = slice.map((r) => r[valueKey]).filter((v) => v != null && Number.isFinite(v));
        const rolling =
            values.length > 0
                ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
                : null;
        return {...row, rolling};
    });
}

export const SURFACE_COLORS = {
    Hard: "#2563eb",
    Clay: "#c2410c",
    Grass: "#16a34a",
};

export const METRIC_OPTIONS = [
    {value: "serveWonPct", label: "Points won on serve %", yDomain: [40, 90], kind: "rate"},
    {value: "holdPct", label: "Hold %", yDomain: [40, 100], kind: "rate"},
    {value: "breaks", label: "Times broken", yDomain: [0, "auto"], kind: "count"},
];

export function shiftIsoDate(iso, months) {
    if (!iso) return null;
    const [y, m, d] = String(iso).split("-").map(Number);
    if (![y, m, d].every(Number.isFinite)) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCMonth(dt.getUTCMonth() + months);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

export function defaultPeriodWindows(dates) {
    const sorted = [...new Set((dates || []).filter(Boolean))].sort();
    if (!sorted.length) {
        return {fromA: "", toA: "", fromB: "", toB: ""};
    }
    const max = sorted[sorted.length - 1];
    const fromB = shiftIsoDate(max, -12);
    const fromA = shiftIsoDate(fromB, -12);
    let toA = "";
    if (fromB) {
        const dt = new Date(`${fromB}T00:00:00Z`);
        dt.setUTCDate(dt.getUTCDate() - 1);
        const yy = dt.getUTCFullYear();
        const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(dt.getUTCDate()).padStart(2, "0");
        toA = `${yy}-${mm}-${dd}`;
    }
    return {fromA: fromA || "", toA, fromB: fromB || "", toB: max};
}

export function filterPoints(points, {roundGroup = "all", from = null, to = null} = {}) {
    if (!Array.isArray(points)) return [];
    const allowed = ROUND_SETS[roundGroup] || null;
    return points.filter((point) => {
        const date = parseMatchDate(point.match_id, point.date);
        if (from && (!date || date < from)) return false;
        if (to && (!date || date > to)) return false;
        if (allowed) {
            const rnd = String(point.round || "").trim();
            if (!allowed.has(rnd)) return false;
        }
        return true;
    });
}

function serviceGameStats(matchPoints) {
    const games = new Map();
    for (const point of matchPoints) {
        const gn = point.game_number;
        if (gn == null) continue;
        if (!games.has(gn)) games.set(gn, []);
        games.get(gn).push(point);
    }
    let serviceGames = 0;
    let breaks = 0;
    for (const group of games.values()) {
        group.sort((a, b) => Number(a.point_number) - Number(b.point_number));
        if (group.some(isTiebreakPoint)) continue;
        serviceGames += 1;
        const last = group[group.length - 1];
        if (!slotEq(last.winner, last.server)) breaks += 1;
    }
    return {serviceGames, breaks, holds: serviceGames - breaks};
}

export function poolPeriod(points, metric) {
    if (!Array.isArray(points) || points.length === 0) {
        return {successes: 0, n: 0, rate: null, matchCount: 0, meanBreaks: null};
    }
    const byMatch = new Map();
    for (const point of points) {
        const matchId = point?.match_id;
        if (matchId == null) continue;
        if (!byMatch.has(matchId)) byMatch.set(matchId, []);
        byMatch.get(matchId).push(point);
    }

    if (metric === "breaks") {
        let totalBreaks = 0;
        let matchCount = 0;
        for (const matchPoints of byMatch.values()) {
            const {serviceGames, breaks} = serviceGameStats(matchPoints);
            if (serviceGames < MIN_SERVICE_GAMES) continue;
            totalBreaks += breaks;
            matchCount += 1;
        }
        return {
            successes: totalBreaks,
            n: matchCount,
            rate: matchCount ? totalBreaks / matchCount : null,
            matchCount,
            meanBreaks: matchCount ? totalBreaks / matchCount : null,
        };
    }

    if (metric === "holdPct") {
        let holds = 0;
        let games = 0;
        let matchCount = 0;
        for (const matchPoints of byMatch.values()) {
            const stats = serviceGameStats(matchPoints);
            if (stats.serviceGames < MIN_SERVICE_GAMES) continue;
            holds += stats.holds;
            games += stats.serviceGames;
            matchCount += 1;
        }
        return {
            successes: holds,
            n: games,
            rate: games ? holds / games : null,
            matchCount,
            meanBreaks: null,
        };
    }

    let successes = 0;
    let n = 0;
    for (const point of points) {
        n += 1;
        if (slotEq(point.winner, point.server)) successes += 1;
    }
    return {
        successes,
        n,
        rate: n ? successes / n : null,
        matchCount: byMatch.size,
        meanBreaks: null,
    };
}

export function comparePeriods(points, metric, periodA, periodB) {
    const ptsA = filterPoints(points, {...periodA});
    const ptsB = filterPoints(points, {...periodB});
    const a = poolPeriod(ptsA, metric);
    const b = poolPeriod(ptsB, metric);
    const ciA = metric === "breaks" ? null : wilsonInterval(a.successes, a.n);
    const ciB = metric === "breaks" ? null : wilsonInterval(b.successes, b.n);
    const test =
        metric === "breaks"
            ? {method: "none", pValue: null, z: null}
            : compareTwoRates(a.successes, a.n, b.successes, b.n);
    const delta =
        a.rate != null && b.rate != null ? b.rate - a.rate : null;
    const underpowered =
        a.matchCount < 8 ||
        b.matchCount < 8 ||
        (metric !== "breaks" && (a.n < 100 || b.n < 100));
    return {a, b, ciA, ciB, test, delta, underpowered};
}

export function withLinearTrend(series, valueKey) {
    const xs = [];
    const ys = [];
    if (!series.length) {
        return {series, slopePerMonth: null, pValue: null, r2: null, ok: false};
    }
    const t0 = Date.parse(`${series[0].date}T00:00:00Z`);
    for (const row of series) {
        const t = Date.parse(`${row.date}T00:00:00Z`);
        xs.push((t - t0) / 86400000);
        ys.push(row[valueKey]);
    }
    const fit = linearTrend(xs, ys);
    if (fit.slope == null) {
        return {series, slopePerMonth: null, pValue: fit.pValue, r2: fit.r2, ok: false};
    }
    const next = series.map((row, i) => ({
        ...row,
        trendY: fit.intercept + fit.slope * xs[i],
    }));
    return {
        series: next,
        slopePerMonth: fit.slope * 30.4375,
        pValue: fit.pValue,
        r2: fit.r2,
        ok: series.length >= MIN_TREND_MATCHES,
    };
}

export function trendForSeries(series, metric) {
    if (!series || series.length < MIN_TREND_MATCHES) {
        return {kind: "insufficient", n: series?.length ?? 0};
    }
    return {kind: "linear", ...withLinearTrend(series, metric)};
}

export {MIN_TREND_MATCHES};
