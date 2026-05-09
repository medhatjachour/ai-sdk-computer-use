"use client";

import {
  Camera, CheckCircle, CircleSlash, Clock,
  Keyboard, KeyRound, Loader2, MousePointer,
  MousePointerClick, ScrollText, Terminal, XCircle,
} from "lucide-react";
import type { AgentEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EventRowProps {
  event: AgentEvent;
}

const STATUS_DOT: Record<AgentEvent["status"], string> = {
  pending:  "bg-amber-400 animate-pulse",
  complete: "bg-emerald-400",
  error:    "bg-red-400",
  aborted:  "bg-zinc-500",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  screenshot:       Camera,
  left_click:       MousePointer,
  right_click:      MousePointerClick,
  double_click:     MousePointerClick,
  mouse_move:       MousePointer,
  type:             Keyboard,
  key:              KeyRound,
  scroll:           ScrollText,
  wait:             Clock,
  left_click_drag:  MousePointer,
  bash:             Terminal,
};

const STATUS_ICON: Record<AgentEvent["status"], React.ReactNode> = {
  pending:  <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />,
  complete: <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />,
  error:    <XCircle className="w-2.5 h-2.5 text-red-400" />,
  aborted:  <CircleSlash className="w-2.5 h-2.5 text-zinc-500" />,
};

export function EventRow({ event }: EventRowProps) {
  const actionType = event.tool === "computer" ? event.payload.type : "bash";
  const Icon = ACTION_ICONS[actionType] ?? Terminal;
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const dot = STATUS_DOT[event.status];

  return (
    <div className="flex items-center gap-2 py-0.5 group">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      <Icon className="w-3 h-3 shrink-0 text-zinc-500" />
      <span className="flex-1 truncate text-[11px] font-mono text-zinc-600">{actionType}</span>
      <span className="text-[10px] font-mono text-zinc-700 shrink-0">{time}</span>
      {event.duration !== undefined && (
        <span className="text-[10px] font-mono text-zinc-600 shrink-0">{event.duration}ms</span>
      )}
      {STATUS_ICON[event.status]}
    </div>
  );
}
