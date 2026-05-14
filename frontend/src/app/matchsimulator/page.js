"use client";
import Header from "../components/header";
import TennisCourt from "../components/TennisCourt";
import {useState, useEffect, useMemo} from "react";
import OnePlayerBox from "../components/onePlayerBox";
import TwoPlayerBox from "../components/TwoPlayerBox";
import { API_BASE } from "../../lib/api";
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
    matchValue,
    onMatchChange,
    matchComboKey,
    filtersNode,
    pointTypeFilter,
    serveOutcomeFilter,
    pressureFilter,
}) {
    return (
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
            <SelectionCombobox
                comboKey={matchComboKey}
                items={matchOptions}
                value={matchValue}
                onValueChange={onMatchChange}
                placeholder="Select a match"
                className="mb-2 w-full min-w-0"
                emptyText="No matches found on this surface"
            />
            {matchValue ? filtersNode : null}
            <TennisCourt
                surface={surface}
                playerName={name}
                matchId={matchValue?.value}
                courtScale={0.62}
                pointTypeFilter={pointTypeFilter}
                serveOutcomeFilter={serveOutcomeFilter}
                pressureFilter={pressureFilter}
            />
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
    const [selectedOnePlayerMatch, setSelectedOnePlayerMatch] = useState(null);
    const [selectedTwoPlayerMatchOne, setSelectedTwoPlayerMatchOne] = useState(null);
    const [selectedTwoPlayerMatchTwo, setSelectedTwoPlayerMatchTwo] = useState(null);
    const [selectedPointType, setSelectedPointType] = useState("serve");
    const [selectedServeOutcome, setSelectedServeOutcome] = useState("all");
    const [selectedPressureFilter, setSelectedPressureFilter] = useState("all");

    async function fetchPlayerMatches(playerName, surface, matchNum) {
        const encName = encodeURIComponent(playerName);
        const qs =
            surface != null && surface !== ""
                ? `?surface=${encodeURIComponent(surface)}`
                : "";
        const res = await fetch(
            `${API_BASE}/getPlayerMatches/${encName}${qs}`
        );
        const data = await res.json();
        const matches = Array.isArray(data?.matches) ? data.matches : [];
        if (matchNum === "One") {
            setSelectedMatchOne(matches);
        } else if (matchNum === "Two") {
            setSelectedMatchTwo(matches);
        }
    }


    useEffect(() => {
        const saved = sessionStorage.getItem("devState");
        if (!saved) return;
        const s = JSON.parse(saved);
        setClicked(s.clicked);
        setOnePlayer(s.onePlayer);
        setTennisCourt(s.tennisCourt);
        setSelectedNameOne(s.selectedNameOne);
        setSelectedSurfaceOne(s.selectedSurfaceOne);
        if (s.selectedNameOne) {
            fetchPlayerMatches(s.selectedNameOne, s.selectedSurfaceOne, "One");
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

        fetch(`%${API_BASE}/getAllPlayers`)
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
        setSelectedOnePlayerMatch(null);
    }, [selectedMatchOne]);

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
        setSelectedOnePlayerMatch(null);
        setSelectedTwoPlayerMatchOne(null);
        setSelectedTwoPlayerMatchTwo(null);
        resetFilters();
    };

    const sharedFiltersNode = (
        <FilterControls
            selectedPointTypeOption={selectedPointTypeOption}
            selectedServeOutcomeOption={selectedServeOutcomeOption}
            selectedPressureOption={selectedPressureOption}
            onPointTypeChange={onPointTypeChange}
            onServeOutcomeChange={(val) => setSelectedServeOutcome(val.value)}
            onPressureChange={(val) => setSelectedPressureFilter(val.value)}
            showServeOutcome={showServeOutcome}
            className="mb-2"
        />
    );

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
                                    setSelectedOnePlayerMatch(null);
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
                                setSelectedTwoPlayerMatchOne(null);
                                setSelectedTwoPlayerMatchTwo(null);
                                resetFilters();
                                setTennisCourt(true);
                            }}
                        />
                    )}

                    {(twoPlayers && tennisCourt) && (
                        <div className="pt-6 grid w-full gap-5 md:grid-cols-2">
                            <PlayerPanel
                                name={selectedNameOne}
                                surface={selectedSurfaceOne}
                                matchOptions={matchOptionsOne}
                                matchValue={selectedTwoPlayerMatchOne}
                                onMatchChange={setSelectedTwoPlayerMatchOne}
                                matchComboKey={`${selectedNameOne}-${selectedSurfaceOne}-compare`}
                                filtersNode={sharedFiltersNode}
                                pointTypeFilter={selectedPointType}
                                serveOutcomeFilter={selectedServeOutcome}
                                pressureFilter={selectedPressureFilter}
                            />
                            <PlayerPanel
                                name={selectedNameTwo}
                                surface={selectedSurfaceTwo}
                                matchOptions={matchOptionsTwo}
                                matchValue={selectedTwoPlayerMatchTwo}
                                onMatchChange={setSelectedTwoPlayerMatchTwo}
                                matchComboKey={`${selectedNameTwo}-${selectedSurfaceTwo}-compare`}
                                filtersNode={sharedFiltersNode}
                                pointTypeFilter={selectedPointType}
                                serveOutcomeFilter={selectedServeOutcome}
                                pressureFilter={selectedPressureFilter}
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
                            <SelectionCombobox
                                comboKey={`${selectedNameOne}-${selectedSurfaceOne}`}
                                items={matchOptionsOne}
                                value={selectedOnePlayerMatch}
                                onValueChange={setSelectedOnePlayerMatch}
                                placeholder="Select a match"
                                className="w-full min-w-0"
                                emptyText="No matches found on this surface"
                            />
                            {selectedOnePlayerMatch && (
                                <FilterControls
                                    selectedPointTypeOption={selectedPointTypeOption}
                                    selectedServeOutcomeOption={selectedServeOutcomeOption}
                                    selectedPressureOption={selectedPressureOption}
                                    onPointTypeChange={onPointTypeChange}
                                    onServeOutcomeChange={(val) => setSelectedServeOutcome(val.value)}
                                    onPressureChange={(val) => setSelectedPressureFilter(val.value)}
                                    showServeOutcome={showServeOutcome}
                                />
                            )}
                            <div
                                className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                                    <a
                                        href={getTennisAbstractPlayerUrl(selectedNameOne)}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="hover:text-zinc-900"
                                    >
                                        {selectedNameOne}
                                    </a>
                                </h3>
                                <TennisCourt
                                    surface={selectedSurfaceOne}
                                    playerName={selectedNameOne}
                                    matchId={selectedOnePlayerMatch?.value}
                                    courtScale={0.62}
                                    pointTypeFilter={selectedPointType}
                                    serveOutcomeFilter={selectedServeOutcome}
                                    pressureFilter={selectedPressureFilter}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
