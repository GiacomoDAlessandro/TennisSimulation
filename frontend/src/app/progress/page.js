"use client";

import {useEffect, useMemo, useState} from "react";
import Header from "../components/header";
import {API_BASE} from "../../lib/api";
import {
    METRIC_OPTIONS,
    MIN_TREND_MATCHES,
    ROUND_FILTERS,
    SURFACE_COLORS,
    comparePeriods,
    defaultPeriodWindows,
    filterPoints,
    metricsByMatch,
    parseMatchDate,
    trendForSeries,
    withRollingAverage,
} from "../lib/serveProgress";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "../../components/ui/combobox";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const CACHE_KEY = "tennis-all-players";
const SURFACES = ["All", "Hard", "Clay", "Grass"];

function formatAxisDate(iso) {
    if (!iso) return "";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${m}/${d}/${y.slice(2)}`;
}

function formatPct(rate) {
    if (rate == null || !Number.isFinite(rate)) return "—";
    return `${(rate * 100).toFixed(1)}%`;
}

function formatP(p) {
    if (p == null || !Number.isFinite(p)) return "—";
    if (p < 0.001) return "< 0.001";
    return p.toFixed(3);
}

function ChartTooltip({active, payload, metric}) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    const suffix = metric === "breaks" ? "" : "%";
    return (
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
            <div className="font-medium text-zinc-900">{row.date}</div>
            <div className="mt-0.5 text-zinc-500">
                {[row.tournament, row.round].filter(Boolean).join(" ")}
                {row.surface ? ` · ${row.surface}` : ""}
            </div>
            {payload.map((p) => (
                <div key={p.dataKey} className="mt-1 tabular-nums text-zinc-800">
                    {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
                    {p.value == null ? "" : suffix}
                </div>
            ))}
        </div>
    );
}

function DateField({label, value, onChange}) {
    return (
        <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600">
            {label}
            <input
                type="date"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-full rounded-none border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
            />
        </label>
    );
}

export default function ProgressPage() {
    const [players, setPlayers] = useState([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const [player, setPlayer] = useState(null);
    const [query, setQuery] = useState("");
    const [surface, setSurface] = useState("All");
    const [roundGroup, setRoundGroup] = useState("all");
    const [metric, setMetric] = useState("serveWonPct");
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadedName, setLoadedName] = useState(null);
    const [fromA, setFromA] = useState("");
    const [toA, setToA] = useState("");
    const [fromB, setFromB] = useState("");
    const [toB, setToB] = useState("");
    const [showTrend, setShowTrend] = useState(false);
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => {
        try {
            const cached = window.sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length) {
                    setPlayers(parsed);
                    setPlayersLoading(false);
                }
            }
        } catch {
            /* ignore */
        }
        fetch(`${API_BASE}/getAllPlayers`)
            .then((res) => res.json())
            .then((data) => {
                const next = data.players ?? [];
                setPlayers(next);
                window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
            })
            .catch(() => setPlayers([]))
            .finally(() => setPlayersLoading(false));
    }, []);

    const playerOptions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return players;
        return players.filter((name) => String(name).toLowerCase().startsWith(q));
    }, [players, query]);

    async function loadProgress() {
        if (!player) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (surface && surface !== "All") params.set("surface", surface);
            const qs = params.toString() ? `?${params}` : "";
            const res = await fetch(
                `${API_BASE}/getPlayerServesBulk/${encodeURIComponent(player)}${qs}`
            );
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const data = await res.json();
            setPoints(data.points ?? []);
            setLoadedName(player);
        } catch (err) {
            setError(err.message || "Failed to load");
            setPoints([]);
        } finally {
            setLoading(false);
        }
    }

    function enableCompare(on) {
        setShowCompare(on);
        if (!on) return;
        if (fromA || toA || fromB || toB) return;
        const dates = points.map((p) => parseMatchDate(p.match_id, p.date));
        const windows = defaultPeriodWindows(dates);
        setFromA(windows.fromA);
        setToA(windows.toA);
        setFromB(windows.fromB);
        setToB(windows.toB);
    }

    const metricMeta = METRIC_OPTIONS.find((m) => m.value === metric) || METRIC_OPTIONS[0];
    const roundMeta = ROUND_FILTERS.find((r) => r.value === roundGroup) || ROUND_FILTERS[0];

    const filteredPoints = useMemo(
        () => filterPoints(points, {roundGroup}),
        [points, roundGroup]
    );

    const matchSeries = useMemo(() => metricsByMatch(filteredPoints), [filteredPoints]);

    const comparison = useMemo(
        () =>
            showCompare
                ? comparePeriods(
                      filteredPoints,
                      metric,
                      {from: fromA, to: toA},
                      {from: fromB, to: toB}
                  )
                : null,
        [showCompare, filteredPoints, metric, fromA, toA, fromB, toB]
    );

    const trend = useMemo(() => trendForSeries(matchSeries, metric), [matchSeries, metric]);
    const trendOk = matchSeries.length >= MIN_TREND_MATCHES;

    const chartData = useMemo(() => {
        let rows = withRollingAverage(matchSeries, metric);
        if (showTrend && trend.kind === "linear" && trend.series) {
            const byId = new Map(trend.series.map((r) => [r.matchId, r.trendY]));
            rows = rows.map((r) => ({...r, trendY: byId.get(r.matchId) ?? null}));
        }
        return rows;
    }, [matchSeries, metric, showTrend, trend]);

    const yDomain = metric === "breaks" ? [0, "auto"] : metricMeta.yDomain;

    return (
        <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
            <Header />
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                    <h1 className="text-xl font-semibold tracking-tight">Improvement tracker</h1>

                    <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Combobox
                            items={playerOptions}
                            value={player}
                            onValueChange={setPlayer}
                            onInputValueChange={setQuery}
                        >
                            <ComboboxInput
                                placeholder={playersLoading ? "Loading players..." : "Select player"}
                                disabled={playersLoading}
                            />
                            <ComboboxContent>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                                <ComboboxEmpty>
                                    {playersLoading ? "Loading players..." : "No players found"}
                                </ComboboxEmpty>
                            </ComboboxContent>
                        </Combobox>

                        <Combobox items={SURFACES} value={surface} onValueChange={setSurface}>
                            <ComboboxInput placeholder="Surface" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <Combobox
                            items={ROUND_FILTERS.map((r) => r.label)}
                            value={roundMeta.label}
                            onValueChange={(label) => {
                                const next = ROUND_FILTERS.find((r) => r.label === label);
                                if (next) setRoundGroup(next.value);
                            }}
                        >
                            <ComboboxInput placeholder="Round" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <Combobox
                            items={METRIC_OPTIONS.map((m) => m.label)}
                            value={metricMeta.label}
                            onValueChange={(label) => {
                                const next = METRIC_OPTIONS.find((m) => m.label === label);
                                if (next) setMetric(next.value);
                            }}
                        >
                            <ComboboxInput placeholder="Metric" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <button
                            type="button"
                            disabled={!player || loading}
                            onClick={loadProgress}
                            className="h-8 w-full rounded-none border border-zinc-900 bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                        >
                            {loading ? "Loading…" : "Load timeline"}
                        </button>
                    </div>

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    {!loadedName && !loading ? (
                        <p className="py-16 text-center text-sm text-zinc-500">
                            Select a player and load a timeline.
                        </p>
                    ) : loading ? (
                        <p className="py-16 text-center text-sm text-zinc-500">Loading serve points…</p>
                    ) : chartData.length === 0 ? (
                        <p className="py-16 text-center text-sm text-zinc-500">
                            Not enough completed service games to plot.
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-700">
                                <span className="text-sm text-zinc-600">
                                    {loadedName} · {chartData.length} matches
                                </span>
                                <label className={`inline-flex items-center gap-1.5 ${trendOk ? "" : "text-zinc-400"}`}>
                                    <input
                                        type="checkbox"
                                        checked={showTrend && trendOk}
                                        disabled={!trendOk}
                                        onChange={(e) => setShowTrend(e.target.checked)}
                                    />
                                    Trend
                                </label>
                                <label className="inline-flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={showCompare}
                                        onChange={(e) => enableCompare(e.target.checked)}
                                    />
                                    Compare periods
                                </label>
                                {!trendOk ? (
                                    <span className="text-zinc-400">Need {MIN_TREND_MATCHES} matches to fit a trend</span>
                                ) : showTrend && trend.kind === "linear" ? (
                                    <span className="text-zinc-500">
                                        {trend.slopePerMonth >= 0 ? "+" : ""}
                                        {trend.slopePerMonth?.toFixed(2)}
                                        {metric === "breaks" ? " /month" : " pp/month"} · p = {formatP(trend.pValue)}
                                    </span>
                                ) : null}
                                <span className="ml-auto flex gap-3 text-zinc-500">
                                    {Object.entries(SURFACE_COLORS).map(([name, color]) => (
                                        <span key={name} className="inline-flex items-center gap-1">
                                            <span
                                                className="size-2 rounded-full"
                                                style={{backgroundColor: color}}
                                            />
                                            {name}
                                        </span>
                                    ))}
                                </span>
                            </div>

                            {showCompare ? (
                                <div className="flex flex-col gap-3">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <DateField label="Period A from" value={fromA} onChange={setFromA} />
                                        <DateField label="Period A to" value={toA} onChange={setToA} />
                                        <DateField label="Period B from" value={fromB} onChange={setFromB} />
                                        <DateField label="Period B to" value={toB} onChange={setToB} />
                                    </div>
                                    {comparison ? (
                                        <p className="text-xs leading-relaxed text-zinc-600">
                                            A:{" "}
                                            {metric === "breaks"
                                                ? `${comparison.a.meanBreaks?.toFixed(2) ?? "—"} / match`
                                                : formatPct(comparison.a.rate)}
                                            {comparison.ciA?.low != null
                                                ? ` (${formatPct(comparison.ciA.low)}–${formatPct(comparison.ciA.high)})`
                                                : ""}
                                            {" · "}n={comparison.a.n}
                                            {" · "}B:{" "}
                                            {metric === "breaks"
                                                ? `${comparison.b.meanBreaks?.toFixed(2) ?? "—"} / match`
                                                : formatPct(comparison.b.rate)}
                                            {comparison.ciB?.low != null
                                                ? ` (${formatPct(comparison.ciB.low)}–${formatPct(comparison.ciB.high)})`
                                                : ""}
                                            {" · "}n={comparison.b.n}
                                            {" · "}Δ{" "}
                                            {comparison.delta == null
                                                ? "—"
                                                : metric === "breaks"
                                                  ? `${comparison.delta >= 0 ? "+" : ""}${comparison.delta.toFixed(2)}`
                                                  : `${comparison.delta >= 0 ? "+" : ""}${(comparison.delta * 100).toFixed(1)} pp`}
                                            {metric === "breaks"
                                                ? ""
                                                : ` · p = ${formatP(comparison.test.pValue)} (${
                                                      comparison.test.pValue != null && comparison.test.pValue < 0.05
                                                          ? "rate changed"
                                                          : "inconclusive"
                                                  })`}
                                            {comparison.underpowered ? " · small sample" : ""}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="h-[360px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatAxisDate}
                                            tick={{fontSize: 11, fill: "#71717a"}}
                                            minTickGap={28}
                                        />
                                        <YAxis
                                            domain={yDomain}
                                            tick={{fontSize: 11, fill: "#71717a"}}
                                            width={40}
                                        />
                                        <Tooltip content={<ChartTooltip metric={metric} />} />
                                        <Legend />
                                        <Line
                                            type="linear"
                                            dataKey={metric}
                                            name="Match"
                                            stroke="#a1a1aa"
                                            strokeWidth={1}
                                            strokeDasharray="2 4"
                                            dot={(props) => {
                                                const {cx, cy, payload, index} = props;
                                                if (cx == null || cy == null) return null;
                                                return (
                                                    <circle
                                                        key={`dot-${index}`}
                                                        cx={cx}
                                                        cy={cy}
                                                        r={3}
                                                        fill={SURFACE_COLORS[payload.surface] || "#18181b"}
                                                    />
                                                );
                                            }}
                                            activeDot={{r: 5}}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="rolling"
                                            name="10-match avg"
                                            stroke="#18181b"
                                            strokeWidth={2.5}
                                            dot={false}
                                        />
                                        {showTrend && trendOk ? (
                                            <Line
                                                type="linear"
                                                dataKey="trendY"
                                                name="Trend"
                                                stroke="#2563eb"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        ) : null}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
