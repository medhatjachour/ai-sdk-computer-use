"use client";

import { Camera, Terminal, X } from "lucide-react";
import type { AgentEvent, ComputerAgentEvent } from "@/lib/types";

interface ExpandedToolDetailProps {
  event: AgentEvent | null;
  onClose: () => void;
}

export function ExpandedToolDetail({ event, onClose }: ExpandedToolDetailProps) {
  if (!event) return null;

  const isScreenshot = event.tool === "computer" && event.payload.type === "screenshot";
  const isBash = event.tool === "bash";
  const actionLabel = event.tool === "computer" ? event.payload.type : "bash";

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          {isBash ? (
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span className="text-xs font-mono font-medium text-zinc-300">{actionLabel}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            event.status === "complete" ? "bg-emerald-500/20 text-emerald-400" :
            event.status === "pending"  ? "bg-amber-500/20 text-amber-400" :
            event.status === "error"    ? "bg-red-500/20 text-red-400" :
                                          "bg-zinc-700 text-zinc-400"
          }`}>
            {event.status}
          </span>
          {event.duration !== undefined && (
            <span className="text-[10px] text-zinc-600 font-mono">{event.duration}ms</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isScreenshot && <ScreenshotDetail result={event.result} />}
        {isBash && <BashDetail payload={event.payload as { command: string }} result={event.result as string | undefined} />}
        {event.tool === "computer" && !isScreenshot && (
          <ComputerActionDetail payload={event.payload as ComputerAgentEvent["payload"]} />
        )}
      </div>
    </div>
  );
}

function ScreenshotDetail({ result }: { result?: ComputerAgentEvent["result"] }) {
  if (typeof result === "object" && result !== null && "type" in result && result.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/png;base64,${result.data}`}
        alt="Screenshot"
        className="w-full rounded-lg border border-white/10"
      />
    );
  }
  return (
    <div className="w-full aspect-[4/3] bg-zinc-800 rounded-lg animate-pulse flex items-center justify-center">
      <Camera className="w-8 h-8 text-zinc-700" />
    </div>
  );
}

function BashDetail({ payload, result }: { payload: { command: string }; result?: string }) {
  const hasOutput = result && typeof result === "string" && result !== "[screenshot redacted]" && result.trim();
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Command</p>
        <pre className="text-xs bg-black/50 text-emerald-300 font-mono p-3 rounded-lg border border-white/[0.06] overflow-x-auto whitespace-pre-wrap">
          <span className="text-zinc-600 select-none">$ </span>{payload.command}
        </pre>
      </div>
      {hasOutput && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Output</p>
          <pre className="text-xs bg-black/50 text-zinc-300 font-mono p-3 rounded-lg border border-white/[0.06] overflow-auto max-h-48 whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

function ComputerActionDetail({ payload }: { payload: ComputerAgentEvent["payload"] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Payload</p>
      <pre className="text-xs bg-black/50 text-zinc-400 font-mono p-3 rounded-lg border border-white/[0.06] overflow-x-auto">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}


