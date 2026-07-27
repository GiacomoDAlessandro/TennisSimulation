"use client";
import Header from "../components/header";
import TennisCourt from "../components/TennisCourt";
import {useState, useEffect, useMemo, useRef} from "react";
import OnePlayerBox from "../components/onePlayerBox";
import TwoPlayerBox from "../components/TwoPlayerBox";
import { API_BASE } from "../../lib/api";
import { flattenServesFromPoints } from "../lib/serveStats";
import {CaretDownIcon} from "@phosphor-icons/react";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList
} from "../../components/ui/combobox";

function formatMatchDisplay(match, viewerName) {
    const tournament =
        (match.tournament && String(match.tournament).trim()) || "Unknown tournament";
    const round = (match.round && String(match.round).trim()) || "";
    const p1 = match.player1;
    const p2 = match.player2;
    let opponent = null;
    if (p1 === viewerName) opponent = p2;
    else if (p2 === viewerName) opponent = p1;
    else opponent = p1 || p2;
    const head = [tournament, round].filter(Boolean).join(" ");
    return `${head} vs. ${opponent ?? "Unknown"}`;
}

function getTennisAbstractPlayerUrl(playerName) {
    const slug = String(playerName || "")
        .trim()
        .replace(/[\s-]+/g, "");
    return `https://www.tennisabstract.com/cgi-bin/player.cgi?p=${encodeURIComponent(slug)}`;
}

function buildMatchOptions(matches, viewerName) {
    if (!Array.isArray(matches)) return [];
    return matches.map((match) => ({
        label: formatMatchDisplay(match, viewerName),
        value: String(match.match_id),
    }));
}

const POINT_TYPE_OPTIONS = [
    {label: "Serve", value: "serve"},
    {label: "Return (coming soon)", value: "return"},
];

const SERVE_OUTCOME_OPTIONS = [
    {label: "All serves", value: "all"},
    {label: "Ace", value: "Ace"},
    {label: "Unreturnable", value: "Unreturnable"},
    {label: "In play", value: "in_play"},
    {label: "Fault / error", value: "fault"},
];

const PRESSURE_OPTIONS = [
    {label: "All points", value: "all"},
    {label: "Pressure points only", value: "pressure_only"},
    {label: "Non-pressure only", value: "non_pressure"},
];

const VIEW_MODE_OPTIONS = [
    {label: "Scatter", value: "scatter"},
    {label: "Heatmap", value: "heatmap"},
];

function SelectionCombobox({
    items,
    value,
    onValueChange,
    placeholder,
    className = "w-full min-w-0",
    emptyText,
    comboKey,
}) {
    return (
        <Combobox key={comboKey} items={items} value={value} onValueChange={onValueChange}>
            <ComboboxInput placeholder={placeholder} className={className}/>
            <ComboboxContent>
                {emptyText ? <ComboboxEmpty>{emptyText}</ComboboxEmpty> : null}
                <ComboboxList>
                    {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

function MatchMultiSelect({
    items,
    selectedIds,
    onChange,
    placeholder = "Select matches",
    emptyText = "No matches found on this surface",
    className = "w-full min-w-0",
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e) => {
            if (!rootRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const displayLabel = useMemo(() => {
        if (!selectedIds.length) return "";
        if (selectedIds.length === 1) {
            return items.find((item) => item.value === selectedIds[0])?.label ?? "1 match";
        }
        return `${selectedIds.length} matches selected`;
    }, [items, selectedIds]);

    const allSelected = items.length > 0 && selectedIds.length === items.length;

    const toggleId = (id) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((x) => x !== id)
                : [...selectedIds, id]
        );
    };

    return (
        <div ref={rootRef} className={`relative ${className}`.trim()}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-xs transition-colors hover:bg-zinc-50"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={displayLabel ? "truncate" : "truncate text-zinc-500"}>
                    {displayLabel || placeholder}
                </span>
                <CaretDownIcon className="size-4 shrink-0 text-zinc-500"/>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                        <span className="text-xs text-zinc-500">
                            {selectedIds.length} of {items.length} selected
                        </span>
                        {items.length > 0 ? (
                            <button
                                type="button"
                                className="text-xs font-medium text-zinc-700 hover:text-zinc-900"
                                onClick={() =>
                                    onChange(allSelected ? [] : items.map((item) => item.value))
                                }
                            >
                                {allSelected ? "Clear all" : "Select all"}
                            </button>
                        ) : null}
                    </div>

                    {items.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-zinc-500">{emptyText}</p>
                    ) : (
                        <ul
                            className="max-h-48 overflow-y-auto py-1"
                            role="listbox"
                            aria-multiselectable="true"
                        >
                            {items.map((item) => {
                                const checked = selectedIds.includes(item.value);
                                return (
                                    <li key={item.value}>
                                        <label className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-zinc-50">
                                            <input
                                                type="checkbox"
                                                className="mt-0.5"
                                                checked={checked}
                                                onChange={() => toggleId(item.value)}
                                            />
                                            <span className="text-xs leading-snug text-zinc-700">
                                                {item.label}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function ModeToggle({options, value, onChange, ariaLabel}) {
    return (
        <div
            className="flex w-full flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1"
            role="group"
            aria-label={ariaLabel}
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            active
                                ? "bg-zinc-900 text-white shadow-sm"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function FilterControls({
    selectedPointTypeOption,
    selectedServeOutcomeOption,
    selectedPressureOption,
    onPointTypeChange,
    onServeOutcomeChange,
    onPressureChange,
    showServeOutcome,
    className = "",
}) {
    return (
        <div className={`grid w-full gap-2 ${className}`.trim()}>
            <SelectionCombobox
                items={POINT_TYPE_OPTIONS}
                value={selectedPointTypeOption}
                onValueChange={onPointTypeChange}
                placeholder="Point type"
            />
            {showServeOutcome ? (
                <SelectionCombobox
                    items={SERVE_OUTCOME_OPTIONS}
                    value={selectedServeOutcomeOption}
                    onValueChange={onServeOutcomeChange}
                    placeholder="Serve outcome"
                />
            ) : null}
            <SelectionCombobox
                items={PRESSURE_OPTIONS}
                value={selectedPressureOption}
                onValueChange={onPressureChange}
                placeholder="Pressure points"
            />
        </div>
    );
}

function PlayerPanel({
    name,
    surface,
    matchOptions,
    selectedMatchIds,
    onMatchIdsChange,
    filtersNode,
    pointTypeFilter,
    serveOutcomeFilter,
    pressureFilter,
    viewMode,
    showFiltersAboveCourt = false,
}) {
    const [bulkPoints, setBulkPoints] = useState([]);
    const [bulkMatchCount, setBulkMatchCount] = useState(0);
    const [bulkLoading, setBulkLoading] = useState(false);

    const hasSelection = selectedMatchIds.length > 0;
    const useBulkPoints = selectedMatchIds.length > 1;
    const singleSelectedMatchId =
        selectedMatchIds.length === 1 ? selectedMatchIds[0] : "";

    useEffect(() => {
        if (!name || selectedMatchIds.length <= 1) {
            setBulkPoints([]);
            setBulkMatchCount(0);
            setBulkLoading(false);
            return;
        }

        let cancelled = false;
        setBulkLoading(true);

        const encName = encodeURIComponent(name);
        const params = new URLSearchParams();
        if (surface) params.set("surface", surface);
        params.set("match_ids", selectedMatchIds.join(","));
        const qs = params.toString() ? `?${params.toString()}` : "";

        fetch(`${API_BASE}/getPlayerServesBulk/${encName}${qs}`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setBulkPoints(Array.isArray(data?.points) ? data.points : []);
                setBulkMatchCount(Number(data?.match_count) || 0);
            })
            .catch(() => {
                if (cancelled) return;
                setBulkPoints([]);
                setBulkMatchCount(0);
            })
            .finally(() => {
                if (!cancelled) setBulkLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [name, surface, selectedMatchIds]);

    const serveCount = useMemo(
        () => flattenServesFromPoints(bulkPoints).length,
        [bulkPoints]
    );

    return (
        <div className="flex w-full flex-col gap-3">
            <MatchMultiSelect
                items={matchOptions}
                selectedIds={selectedMatchIds}
                onChange={onMatchIdsChange}
                placeholder="Select matches"
                emptyText="No matches found on this surface"
            />

            {hasSelection && showFiltersAboveCourt ? filtersNode : null}

            {hasSelection && selectedMatchIds.length > 1 && (
                <p className="text-center text-xs text-zinc-500">
                    {bulkLoading
                        ? "Loading serves…"
                        : `${serveCount} serve${serveCount === 1 ? "" : "s"} across ${bulkMatchCount} match${bulkMatchCount === 1 ? "" : "es"}`}
                </p>
            )}

            <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                    <a
                        href={getTennisAbstractPlayerUrl(name)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-zinc-900"
                    >
                        {name}
                    </a>
                </h3>
                {hasSelection ? (
                    <TennisCourt
                        surface={surface}
                        playerName={name}
                        matchId={useBulkPoints ? "" : singleSelectedMatchId}
                        points={useBulkPoints ? bulkPoints : null}
                        courtScale={0.62}
                        viewMode={viewMode}
                        pointTypeFilter={pointTypeFilter}
                        serveOutcomeFilter={serveOutcomeFilter}
                        pressureFilter={pressureFilter}
                    />
                ) : (
                    <p className="py-8 text-center text-sm text-zinc-500">
                        Select a match to view serves.
                    </p>
                )}
            </div>

            {hasSelection && !showFiltersAboveCourt ? (
                <div className="w-full">{filtersNode}</div>
            ) : null}
        </div>
    );
}

export default function MatchSimulatorPage() {
    const [players, setPlayers] = useState([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const [playerOne, setPlayerOne] = useState(null);
    const [playerTwo, setPlayerTwo] = useState(null);
    const [queryOne, setQueryOne] = useState("");
    const [queryTwo, setQueryTwo] = useState("");
    const [clicked, setClicked] = useState(false);
    const [onePlayer, setOnePlayer] = useState(false);
    const [twoPlayers, setTwoPlayers] = useState(false);
    const [tennisCourt, setTennisCourt] = useState(false);
    const surfaces = ["clay", "hard", "grass"];
    const [selectedSurfaceOne, setSelectedSurfaceOne] = useState(null);
    const [selectedSurfaceTwo, setSelectedSurfaceTwo] = useState(null);
    const [selectedNameOne, setSelectedNameOne] = useState("");
    const [selectedNameTwo, setSelectedNameTwo] = useState("");
    const [selectedMatchOne, setSelectedMatchOne] = useState([]);
    const [selectedMatchTwo, setSelectedMatchTwo] = useState([]);
    const [selectedMatchIdsOne, setSelectedMatchIdsOne] = useState([]);
    const [selectedMatchIdsTwo, setSelectedMatchIdsTwo] = useState([]);
    const [selectedPointType, setSelectedPointType] = useState("serve");
    const [selectedServeOutcome, setSelectedServeOutcome] = useState("all");
    const [selectedPressureFilter, setSelectedPressureFilter] = useState("all");
    const [viewMode, setViewMode] = useState("scatter");

    async function fetchPlayerMatches(playerName, surface, matchNum) {
        if (!playerName) return;

        const encName = encodeURIComponent(playerName);
        const qs =
            surface != null && surface !== ""
                ? `?surface=${encodeURIComponent(surface)}`
                : "";

        try {
            const res = await fetch(
                `${API_BASE}/getPlayerMatches/${encName}${qs}`
            );
            if (!res.ok) {
                throw new Error(`getPlayerMatches failed (${res.status})`);
            }
            const data = await res.json();
            const matches = Array.isArray(data?.matches) ? data.matches : [];
            if (matchNum === "One") {
                setSelectedMatchOne(matches);
            } else if (matchNum === "Two") {
                setSelectedMatchTwo(matches);
            }
        } catch (err) {
            console.error("Failed to load player matches:", err);
            if (matchNum === "One") {
                setSelectedMatchOne([]);
            } else if (matchNum === "Two") {
                setSelectedMatchTwo([]);
            }
        }
    }

    useEffect(() => {
        const saved = sessionStorage.getItem("devState");
        if (!saved) return;

        try {
            const s = JSON.parse(saved);
            setClicked(s.clicked);
            setOnePlayer(s.onePlayer);
            setTennisCourt(s.tennisCourt);
            setSelectedNameOne(s.selectedNameOne);
            setSelectedSurfaceOne(s.selectedSurfaceOne);
            if (s.selectedNameOne) {
                void fetchPlayerMatches(s.selectedNameOne, s.selectedSurfaceOne, "One");
            }
        } catch (err) {
            console.error("Failed to restore session state:", err);
            sessionStorage.removeItem("devState");
        }
    }, []);

    useEffect(() => {
        const CACHE_KEY = "tennis_players_cache_v1";
        const cached = window.sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPlayers(parsed);
                    setPlayersLoading(false);
                }
            } catch {
            }
        }

        fetch(`${API_BASE}/getAllPlayers`)
            .then((res) => res.json())
            .then((data) => {
                const nextPlayers = data.players ?? [];
                setPlayers(nextPlayers);
                window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(nextPlayers));
            })
            .catch(() => setPlayers([]))
            .finally(() => setPlayersLoading(false));
    }, []);

    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;

        if (tennisCourt) {
            document.body.style.overflow = "auto";
            document.documentElement.style.overflow = "auto";
        } else {
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
        }

        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, [tennisCourt]);

    useEffect(() => {
        setSelectedMatchIdsOne([]);
    }, [selectedMatchOne]);

    useEffect(() => {
        setSelectedMatchIdsTwo([]);
    }, [selectedMatchTwo]);

    const matchOptionsOne = useMemo(
        () => buildMatchOptions(selectedMatchOne, selectedNameOne),
        [selectedMatchOne, selectedNameOne]
    );
    const matchOptionsTwo = useMemo(
        () => buildMatchOptions(selectedMatchTwo, selectedNameTwo),
        [selectedMatchTwo, selectedNameTwo]
    );

    const selectedPointTypeOption =
        POINT_TYPE_OPTIONS.find((o) => o.value === selectedPointType) ?? POINT_TYPE_OPTIONS[0];
    const selectedServeOutcomeOption =
        SERVE_OUTCOME_OPTIONS.find((o) => o.value === selectedServeOutcome) ?? SERVE_OUTCOME_OPTIONS[0];
    const selectedPressureOption =
        PRESSURE_OPTIONS.find((o) => o.value === selectedPressureFilter) ?? PRESSURE_OPTIONS[0];

    const showServeOutcome = selectedPointType === "serve";

    const onPointTypeChange = (val) => {
        setSelectedPointType(val.value);
        if (val.value !== "serve") setSelectedServeOutcome("all");
    };

    const resetFilters = () => {
        setSelectedPointType("serve");
        setSelectedServeOutcome("all");
        setSelectedPressureFilter("all");
        setViewMode("scatter");
    };

    const resetView = () => {
        setClicked(false);
        setOnePlayer(false);
        setTwoPlayers(false);
        setTennisCourt(false);
        setPlayerOne(null);
        setPlayerTwo(null);
        setQueryOne("");
        setQueryTwo("");
        setSelectedSurfaceOne(null);
        setSelectedSurfaceTwo(null);
        setSelectedNameOne("");
        setSelectedNameTwo("");
        setSelectedMatchOne([]);
        setSelectedMatchTwo([]);
        setSelectedMatchIdsOne([]);
        setSelectedMatchIdsTwo([]);
        resetFilters();
    };

    const sharedFiltersNode = (
        <div className="flex w-full flex-col gap-2">
            <ModeToggle
                options={VIEW_MODE_OPTIONS}
                value={viewMode}
                onChange={setViewMode}
                ariaLabel="Court view mode"
            />
            <FilterControls
                selectedPointTypeOption={selectedPointTypeOption}
                selectedServeOutcomeOption={selectedServeOutcomeOption}
                selectedPressureOption={selectedPressureOption}
                onPointTypeChange={onPointTypeChange}
                onServeOutcomeChange={(val) => setSelectedServeOutcome(val.value)}
                onPressureChange={(val) => setSelectedPressureFilter(val.value)}
                showServeOutcome={showServeOutcome}
            />
        </div>
    );

    const showSharedFilters =
        (onePlayer && selectedMatchIdsOne.length > 0) ||
        (twoPlayers && (selectedMatchIdsOne.length > 0 || selectedMatchIdsTwo.length > 0));

    return (
        <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
            <Header/>
            <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
                <div
                    className={`relative w-full flex-col min-h-[180px] gap-5 rounded-2xl border border-zinc-200/90 flex justify-center items-center bg-white p-4 shadow-sm sm:p-6 ${
                        twoPlayers && tennisCourt
                            ? "max-w-[1180px]"
                            : onePlayer && tennisCourt
                                ? "max-w-[640px]"
                                : "max-w-[520px]"
                    }`}>
                    {clicked && (
                        <button
                            type="button"
                            aria-label={
                                tennisCourt ? "Back to player selection" : "Back to main menu"
                            }
                            className="absolute left-4 top-3 flex h-4 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                            onClick={() => {
                                if (tennisCourt) {
                                    setTennisCourt(false);
                                    setSelectedMatchIdsOne([]);
                                    setSelectedMatchIdsTwo([]);
                                    return;
                                }
                                resetView();
                            }}>
                            <span className="text-sm leading-none">←</span>
                        </button>
                    )}
                    {!clicked && (
                        <div className="flex w-full flex-col items-center justify-center gap-5">
                            <h2 className="text-center text-xl font-semibold tracking-tight text-zinc-900">
                                Match simulator
                            </h2>
                            <div className="flex flex-wrap justify-center gap-3">
                                <button
                                    onClick={() => {
                                        setOnePlayer(true)
                                        setClicked(true)
                                    }}
                                    className="flex h-11 w-50 justify-center items-center rounded-lg bg-zinc-900 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800">
                                    View One Player
                                </button>
                                <button onClick={() => {
                                    setTwoPlayers(true)
                                    setClicked(true)
                                }}
                                        className="flex h-11 w-50 justify-center items-center rounded-lg bg-zinc-900 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800">
                                    Compare Players
                                </button>
                            </div>
                        </div>
                    )}
                    {twoPlayers && !tennisCourt && (
                        <TwoPlayerBox
                            players={players}
                            playerOne={playerOne}
                            playerTwo={playerTwo}
                            setPlayerTwo={setPlayerTwo}
                            setPlayerOne={setPlayerOne}
                            queryTwo={queryTwo}
                            setQueryTwo={setQueryTwo}
                            queryOne={queryOne}
                            setQueryOne={setQueryOne}
                            surfaces={surfaces}
                            playersLoading={playersLoading}
                            onView={({playerOne, playerTwo, surfaceOne, surfaceTwo}) => {
                                setSelectedNameOne(playerOne);
                                setSelectedNameTwo(playerTwo);
                                setSelectedSurfaceOne(surfaceOne);
                                setSelectedSurfaceTwo(surfaceTwo);
                                fetchPlayerMatches(playerOne, surfaceOne, "One");
                                fetchPlayerMatches(playerTwo, surfaceTwo, "Two");
                                setSelectedMatchIdsOne([]);
                                setSelectedMatchIdsTwo([]);
                                resetFilters();
                                setTennisCourt(true);
                            }}
                        />
                    )}

                    {(twoPlayers && tennisCourt) && (
                        <div className="pt-6 grid w-full gap-5 md:grid-cols-2">
                            {showSharedFilters && (
                                <div className="col-span-full">
                                    {sharedFiltersNode}
                                </div>
                            )}
                            <PlayerPanel
                                name={selectedNameOne}
                                surface={selectedSurfaceOne}
                                matchOptions={matchOptionsOne}
                                selectedMatchIds={selectedMatchIdsOne}
                                onMatchIdsChange={setSelectedMatchIdsOne}
                                filtersNode={null}
                                pointTypeFilter={selectedPointType}
                                serveOutcomeFilter={selectedServeOutcome}
                                pressureFilter={selectedPressureFilter}
                                viewMode={viewMode}
                            />
                            <PlayerPanel
                                name={selectedNameTwo}
                                surface={selectedSurfaceTwo}
                                matchOptions={matchOptionsTwo}
                                selectedMatchIds={selectedMatchIdsTwo}
                                onMatchIdsChange={setSelectedMatchIdsTwo}
                                filtersNode={null}
                                pointTypeFilter={selectedPointType}
                                serveOutcomeFilter={selectedServeOutcome}
                                pressureFilter={selectedPressureFilter}
                                viewMode={viewMode}
                            />
                        </div>
                    )}

                    {onePlayer && !tennisCourt && (
                        <OnePlayerBox
                            players={players}
                            playerOne={playerOne}
                            setPlayerOne={setPlayerOne}
                            queryOne={queryOne}
                            setQueryOne={setQueryOne}
                            surfaces={surfaces}
                            playersLoading={playersLoading}
                            onView={(surface) => {
                                setSelectedNameOne(playerOne);
                                setSelectedSurfaceOne(surface);
                                fetchPlayerMatches(playerOne, surface, "One");
                                setSelectedMatchIdsOne([]);
                                resetFilters();
                                setTennisCourt(true);
                                sessionStorage.setItem("devState", JSON.stringify({
                                    clicked: true,
                                    onePlayer: true,
                                    tennisCourt: true,
                                    selectedNameOne: playerOne,
                                    selectedSurfaceOne: surface,
                                }));
                            }}
                        />
                    )}
                    {onePlayer && tennisCourt && (
                        <div className="flex w-full max-w-[600px] flex-col gap-3 pt-10 pb-10">
                            <PlayerPanel
                                name={selectedNameOne}
                                surface={selectedSurfaceOne}
                                matchOptions={matchOptionsOne}
                                selectedMatchIds={selectedMatchIdsOne}
                                onMatchIdsChange={setSelectedMatchIdsOne}
                                filtersNode={sharedFiltersNode}
                                showFiltersAboveCourt
                                pointTypeFilter={selectedPointType}
                                serveOutcomeFilter={selectedServeOutcome}
                                pressureFilter={selectedPressureFilter}
                                viewMode={viewMode}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
