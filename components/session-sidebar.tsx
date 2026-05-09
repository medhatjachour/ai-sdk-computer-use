"use client";

import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SessionSidebarProps {
  sessions: Session[];
  activeSessionId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onToggle,
  onSelect,
  onCreate,
  onDelete,
}: SessionSidebarProps) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div
      className={cn(
        "flex flex-col bg-zinc-950 border-r border-white/[0.06] shrink-0 transition-all duration-200 overflow-hidden",
        isOpen ? "w-52" : "w-11"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-white/[0.06] h-11",
        isOpen ? "px-3 justify-between" : "justify-center"
      )}>
        {isOpen && (
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Sessions</span>
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
          title={isOpen ? "Collapse" : "Expand sessions"}
        >
          {isOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* New session button */}
      <button
        onClick={onCreate}
        className={cn(
          "flex items-center gap-2 border-b border-white/[0.06] py-2.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors",
          isOpen ? "px-3" : "justify-center px-2"
        )}
        title="New session"
      >
        <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
        {isOpen && <span className="text-xs">New session</span>}
      </button>

      {/* Session list */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto py-1">
          {sorted.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={onSelect}
              onDelete={onDelete}
              canDelete={sessions.length > 1}
            />
          ))}
        </div>
      )}

      {/* Collapsed: icon strip */}
      {!isOpen && (
        <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
          {sorted.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              title={session.title}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors",
                session.id === activeSessionId
                  ? "bg-white text-zinc-900"
                  : "bg-white/10 text-zinc-500 hover:bg-white/20 hover:text-zinc-300"
              )}
            >
              {session.title.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionItem({
  session, isActive, onSelect, onDelete, canDelete,
}: {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(session.id)}
      className={cn(
        "group relative flex flex-col px-3 py-2 cursor-pointer transition-colors",
        isActive ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-r-full" />
      )}
      <p className={cn(
        "text-xs font-medium truncate leading-tight",
        isActive ? "text-white" : "text-zinc-400"
      )}>
        {session.title}
      </p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{relativeTime(session.updatedAt)}</p>

      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${session.title}"?`)) onDelete(session.id);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:text-red-400 text-zinc-600 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
