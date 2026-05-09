"use client";

import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import type { AgentStatus, EventStoreDerivedState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventRow } from "./event-row";

interface DebugPanelProps extends EventStoreDerivedState {
  isOpen: boolean;
  onToggle: () => void;
}

const STATUS_CONFIG: Record<AgentStatus, { dot: string; text: string }> = {
  idle:      { dot: "bg-zinc-400",                  text: "text-zinc-500" },
  thinking:  { dot: "bg-amber-400 animate-pulse",   text: "text-amber-600" },
  executing: { dot: "bg-emerald-400 animate-pulse", text: "text-emerald-600" },
};

const TYPE_COLORS: Record<string, string> = {
  screenshot:   "bg-blue-50 text-blue-600",
  left_click:   "bg-violet-50 text-violet-600",
  right_click:  "bg-violet-50 text-violet-600",
  double_click: "bg-violet-50 text-violet-600",
  type:         "bg-indigo-50 text-indigo-600",
  key:          "bg-indigo-50 text-indigo-600",
  scroll:       "bg-zinc-100 text-zinc-600",
  mouse_move:   "bg-zinc-100 text-zinc-600",
  wait:         "bg-zinc-100 text-zinc-600",
  bash:         "bg-emerald-50 text-emerald-700",
};

export function DebugPanel({
  events,
  countByType,
  agentStatus,
  isOpen,
  onToggle,
}: DebugPanelProps) {
  const { dot, text } = STATUS_CONFIG[agentStatus];

  return (
    <div className="shrink-0 border-t border-zinc-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Events</span>
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
            <span className={cn("text-[10px] font-medium", text)}>{agentStatus}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">{events.length}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        ) : (
          <ChevronUp className="w-3 h-3 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div className="max-h-52 overflow-y-auto border-t border-zinc-100">
          {/* Count chips */}
          {Object.keys(countByType).length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-zinc-50">
              {Object.entries(countByType).map(([type, count]) => (
                <span
                  key={type}
                  className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium", TYPE_COLORS[type] ?? "bg-zinc-100 text-zinc-600")}
                >
                  {type} · {count}
                </span>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="px-4 py-2 space-y-0.5">
            {events.length === 0 ? (
              <p className="text-[10px] text-zinc-400 py-1">No events yet</p>
            ) : (
              [...events].reverse().map((event) => (
                <EventRow key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

