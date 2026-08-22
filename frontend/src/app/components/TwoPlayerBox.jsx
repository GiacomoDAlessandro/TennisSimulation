import {useMemo, useState} from "react"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList
} from "../../components/ui/combobox";
import {filterPlayers} from "../lib/playerSearch";

export default function TwoPlayerBox({
                                         players,
                                         playerOne,
                                         setPlayerOne,
                                         queryOne,
                                         setQueryOne,
                                         surfaces,
                                         playerTwo,
                                         setPlayerTwo,
                                         queryTwo,
                                         setQueryTwo,
                                         playersLoading = false,
                                         onView
                                     }) {

    //Surfaces of each player
    const [surfaceOne, setSurfaceOne] = useState(null);
    const [surfaceTwo, setSurfaceTwo] = useState(null);

    //Warning
    const [warningOpen, setWarningOpen] = useState(false);

    const playerOneOptions = useMemo(
        () => filterPlayers(players, queryOne),
        [players, queryOne]
    );

    const playerTwoOptions = useMemo(
        () => filterPlayers(players, queryTwo),
        [players, queryTwo]
    );

    const handleView = () => {
        if (!playerOne || !playerTwo || !surfaceOne || !surfaceTwo) {
            setWarningOpen(true);
            return;
        }
        setWarningOpen(false);
        onView?.({
            playerOne,
            playerTwo,
            surfaceOne,
            surfaceTwo,
        });
    };


    return (
        <div className={"flex flex-col w-4/5 pt-6 gap-3"}>
            <header className={"font-semibold flex justify-center"}>
                Pick Two Players To Compare
            </header>
            <div className={"flex gap-3 w-full"}>
                {/*Player One + Surface One*/}
                <div className={"flex flex-col gap-3 flex-1 min-w-0"}>
                    <Combobox
                        items={playerOneOptions}
                        value={playerOne}
                        onValueChange={setPlayerOne}
                        onInputValueChange={setQueryOne}
                    >
                        <ComboboxInput
                            placeholder={playersLoading ? "Loading players..." : "Select Player One"}
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

                    <Combobox
                        items={surfaces}
                        onValueChange={setSurfaceOne}>
                        <ComboboxInput placeholder={"Select Surface One"}/>
                        <ComboboxContent>
                            <ComboboxList>
                                {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                        {item}

                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                            <ComboboxEmpty>Select a valid surface</ComboboxEmpty>
                        </ComboboxContent>
                    </Combobox>
                </div>

                {/*Player Two + Surface Two*/}
                <div className={"flex flex-col gap-3 flex-1 min-w-0"}>
                    <Combobox
                        items={playerTwoOptions}
                        value={playerTwo}
                        onValueChange={setPlayerTwo}
                        onInputValueChange={setQueryTwo}
                    >
                        <ComboboxInput
                            placeholder={playersLoading ? "Loading players..." : "Select Player Two"}
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

                    <Combobox
                        items={surfaces}
                        onValueChange={setSurfaceTwo}
                    >
                        <ComboboxInput placeholder={"Select Surface Two"}/>
                        <ComboboxContent>
                            <ComboboxList>
                                {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                        {item}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                            <ComboboxEmpty>Select a valid surface</ComboboxEmpty>
                        </ComboboxContent>
                    </Combobox>
                </div>
            </div>

            {/*View Tennis Court*/}
            <div className={"flex items-center justify-center flex-col"}>
                <button
                    className={"flex h-11 justify-center items-center w-25 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"}
                    onClick={handleView}>
                    View
                </button>
            </div>
            {warningOpen ? (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
                    onClick={() => setWarningOpen(false)}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-[290px] rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="player-warning-title"
                    >
                        <h2
                            id="player-warning-title"
                            className="text-center text-base font-semibold text-zinc-900"
                        >
                            Missing selections
                        </h2>
                        <p className="mt-2 text-center text-xs leading-relaxed text-zinc-500">
                            Select both a player and a surface first.
                        </p>
                        <button
                            type="button"
                            onClick={() => setWarningOpen(false)}
                            className="mt-4 h-9 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                        >
                            OK
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    )
}