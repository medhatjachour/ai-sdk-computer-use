"use client";

import { memo } from "react";
import { AlertCircle, Monitor, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface VncViewerProps {
  streamUrl: string | null;
  isInitializing: boolean;
  isError: boolean;
  onRefresh: () => void;
}

function VncViewerInner({ streamUrl, isInitializing, isError, onRefresh }: VncViewerProps) {
  if (streamUrl) {
    return (
      <div className="relative w-full h-full bg-zinc-950">
        <iframe
          src={streamUrl}
          className="w-full h-full"
          allow="autoplay"
          title="Desktop VNC"
        />
        <button
          onClick={onRefresh}
          disabled={isInitializing}
          className={cn(
            "absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Start new desktop"
        >
          <RefreshCw className={cn("w-3 h-3", isInitializing && "animate-spin")} />
          {isInitializing ? "Creating…" : "New desktop"}
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-zinc-950 text-zinc-400">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-zinc-300">Desktop unavailable</p>
          <p className="text-xs text-zinc-500 max-w-[240px] text-center">
            Check that <code className="text-zinc-400">VERCEL_TOKEN</code> and{" "}
            <code className="text-zinc-400">SANDBOX_SNAPSHOT_ID</code> are set in{" "}
            <code className="text-zinc-400">.env.local</code>
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-950 text-zinc-500">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800">
        <Monitor className="w-5 h-5 text-zinc-400" />
        {isInitializing && (
          <span className="absolute inset-0 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {isInitializing ? "Starting desktop environment…" : "Loading stream…"}
      </p>
    </div>
  );
}

export const VncViewer = memo(
  VncViewerInner,
  (prev, next) =>
    prev.streamUrl === next.streamUrl &&
    prev.isInitializing === next.isInitializing &&
    prev.isError === next.isError
);
