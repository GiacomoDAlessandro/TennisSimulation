import Header from "../components/header.jsx";
import TennisCourt from "../components/TennisCourt.jsx";

export default function MatchSimulatorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-[520px] rounded-2xl border border-zinc-200/90 flex justify-center items-center bg-white p-4 shadow-sm sm:p-6">
            <TennisCourt surface="grass" fitViewport />
        </div>
      </main>
    </div>
  );
}
