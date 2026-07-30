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

export default function OnePlayerBox({
                                         players,
                                         playerOne,
                                         setPlayerOne,
                                         queryOne,
                                         setQueryOne,
                                         surfaces,
                                         playersLoading = false,
                                         onView,
                                     }) {


    const [surface, setSurface] = useState(null);

    //Warning
    const [warningOpen, setWarningOpen] = useState(false);

    const playerOneOptions = useMemo(
        () => filterPlayers(players, queryOne),
        [players, queryOne]
    );

    const handleView = () => {
        if (!playerOne || !surface) {
            setWarningOpen(true);
            return;
        }
        setWarningOpen(false);
        onView?.(surface);
    };

    return (
        <div className={"flex flex-col gap-3 w-3/5 pt-6"}>
            <header className={"font-semibold justify-center flex"}>
                Choose A Player To View
            </header>
            <Combobox
                items={playerOneOptions}
                value={playerOne}
                onValueChange={setPlayerOne}
                onInputValueChange={setQueryOne}>

                <ComboboxInput
                    placeholder={playersLoading ? "Loading players..." : "Select Player"}
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
            {/*Surface*/}
            <Combobox
                items={surfaces}
                value={surface}
                onValueChange={setSurface}
            >
                <ComboboxInput placeholder={"Select Surface"}/>
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