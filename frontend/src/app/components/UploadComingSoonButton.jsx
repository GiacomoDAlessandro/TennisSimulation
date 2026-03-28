"use client";

import { useEffect, useState } from "react";

export default function UploadComingSoonButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-full rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
      >
        Upload My Matches
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-[280px] rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-soon-title"
          >
            <h2
              id="upload-soon-title"
              className="text-center text-base font-semibold text-zinc-900"
            >
              Coming soon
            </h2>
            <p className="mt-2 text-center text-xs leading-relaxed text-zinc-500">
              Uploading matches isn&apos;t ready yet.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 h-9 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
