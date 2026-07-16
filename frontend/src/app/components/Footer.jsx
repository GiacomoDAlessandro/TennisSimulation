export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/GiacomoDAlessandro/TennisSimulation"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-zinc-900"
          >
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://www.linkedin.com/in/giacomo--dalessandro/"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-zinc-900"
          >
            Giacomo D&apos;Alessandro
          </a>
        </div>
        <p className="text-[10px] text-zinc-400">For education purposes only</p>
      </div>
    </footer>
  );
}
