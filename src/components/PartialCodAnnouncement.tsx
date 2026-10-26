import { useState } from "react";
import { Pause, Play } from "lucide-react";

const message = "Partial COD now live · Pay 70% online, 30% in cash on delivery · Full prepaid also available";

export function PartialCodAnnouncement() {
  const [paused, setPaused] = useState(false);

  return (
    <section aria-label="Payment announcement" className="cod-announcement flex min-h-11 items-center bg-purple-950 text-white" data-paused={paused}>
      <p className="sr-only">{message}</p>
      <div className="min-w-0 flex-1 overflow-hidden" aria-hidden="true">
        <div className="cod-announcement-track flex w-max items-center text-xs font-medium sm:text-sm">
          <span className="cod-announcement-copy shrink-0 px-6 py-3">{message}</span>
          <span className="cod-announcement-copy shrink-0 px-6 py-3">{message}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused(!paused)}
        aria-label={paused ? "Resume announcement" : "Pause announcement"}
        className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white motion-reduce:hidden"
      >
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
      </button>
    </section>
  );
}
