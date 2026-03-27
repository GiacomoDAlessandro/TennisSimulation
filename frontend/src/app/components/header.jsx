export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
        <span className="text-base font-semibold tracking-tight text-zinc-900">
          Tennis Visualizer
        </span>
      </div>
    </header>
  );
}
