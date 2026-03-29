"use client";
import Header from "../components/header.jsx";
import TennisCourt from "../components/TennisCourt.jsx";
import DropdownMenu from "../../components/ui/dropdown-menu";
import {useState, useEffect} from 'react';

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "../../components/ui/combobox"


export default function MatchSimulatorPage() {

    const [players, setPlayers] = useState([]);

    useEffect(() => {
        fetch('/getAllPlayers')
            .then((res) => res.json())
            .then((data) => setPlayers(data.players))
    }, []);
    return (
        <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
            <Header/>
            <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
                <div
                    className="w-full gap-5 max-w-[520px] rounded-2xl border border-zinc-200/90 flex justify-center items-center bg-white p-4 shadow-sm sm:p-6">
                    <Combobox>
                        <ComboboxInput placeholder="Select Player One"/>
                        <ComboboxContent>
                            <ComboboxEmpty>No players found</ComboboxEmpty>
                        </ComboboxContent>
                    </Combobox>
                    <Combobox>
                        <ComboboxInput placeholder="Select Player Two"/>
                        <ComboboxContent>
                            <ComboboxList>
                                {players.map((player) => (
                                    <ComboboxItem key={player} value={player}>
                                        {player}
                                    </ComboboxItem>
                                ))}
                                <ComboboxEmpty>No players found</ComboboxEmpty>
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {/*<TennisCourt surface="clay" fitViewport/>*/}
                </div>
            </main>
        </div>
    );
}
