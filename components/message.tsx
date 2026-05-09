"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";
import {
  Camera, CheckCircle, CircleSlash, Clock, Expand,
  Keyboard, KeyRound, Loader2, MousePointer,
  MousePointerClick, ScrollText, Square, Terminal, XCircle,
} from "lucide-react";
import { ABORTED, cn } from "@/lib/utils";

// ── Status derivation ─────────────────────────────────────────────────────

type CardStatus = "pending" | "complete" | "aborted" | "stopped" | "error";

function deriveCardStatus(
  state: string,
  result: unknown,
  isLatestMessage: boolean,
  chatStatus: string
): CardStatus {
  if (state === "call")
    return isLatestMessage && chatStatus !== "ready" ? "pending" : "stopped";
  if (result === ABORTED) return "aborted";
  if (typeof result === "object" && result !== null && "error" in result) return "error";
  return "complete";
}

const STATUS_CONFIG: Record<
  CardStatus,
  { accent: string; dot: string; label: string; Icon: React.ElementType; iconClass: string }
> = {
  pending:  { accent: "border-l-amber-400",  dot: "bg-amber-400 animate-pulse", label: "running",  Icon: Loader2,     iconClass: "animate-spin text-amber-400" },
  complete: { accent: "border-l-emerald-500", dot: "bg-emerald-400",            label: "done",     Icon: CheckCircle, iconClass: "text-emerald-500" },
  error:    { accent: "border-l-red-500",     dot: "bg-red-400",                label: "error",    Icon: XCircle,     iconClass: "text-red-400" },
  aborted:  { accent: "border-l-zinc-300",    dot: "bg-zinc-400",               label: "aborted",  Icon: CircleSlash, iconClass: "text-zinc-400" },
  stopped:  { accent: "border-l-orange-400",  dot: "bg-orange-400",             label: "stopped",  Icon: Square,      iconClass: "text-orange-400" },
};

// ── Action metadata ───────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  screenshot:      { label: "Screenshot",    Icon: Camera,            color: "text-blue-500 bg-blue-50" },
  left_click:      { label: "Left click",    Icon: MousePointer,      color: "text-violet-500 bg-violet-50" },
  right_click:     { label: "Right click",   Icon: MousePointerClick, color: "text-violet-500 bg-violet-50" },
  double_click:    { label: "Double click",  Icon: MousePointerClick, color: "text-violet-500 bg-violet-50" },
  mouse_move:      { label: "Mouse move",    Icon: MousePointer,      color: "text-zinc-500 bg-zinc-100" },
  type:            { label: "Type",          Icon: Keyboard,          color: "text-indigo-500 bg-indigo-50" },
  key:             { label: "Key press",     Icon: KeyRound,          color: "text-indigo-500 bg-indigo-50" },
  wait:            { label: "Wait",          Icon: Clock,             color: "text-zinc-500 bg-zinc-100" },
  scroll:          { label: "Scroll",        Icon: ScrollText,        color: "text-zinc-500 bg-zinc-100" },
  left_click_drag: { label: "Drag",          Icon: MousePointer,      color: "text-violet-500 bg-violet-50" },
};

function getActionDetail(action: string, args: Record<string, unknown>): string {
  const coord = args.coordinate as [number, number] | undefined;
  const text  = args.text as string | undefined;
  const key   = args.key as string | undefined;
  const dur   = args.duration as number | undefined;
  const dir   = args.scroll_direction as string | undefined;
  const amt   = args.scroll_amount as number | undefined;
  switch (action) {
    case "left_click":
    case "right_click":
    case "double_click":
    case "mouse_move":
    case "left_click_drag": return coord ? `(${coord[0]}, ${coord[1]})` : "";
    case "type":            return text ? `"${text.slice(0, 32)}${text.length > 32 ? "…" : ""}"` : "";
    case "key":             return key ?? "";
    case "wait":            return dur ? `${dur}s` : "";
    case "scroll":          return dir && amt ? `${dir} ×${amt}` : "";
    default:                return "";
  }
}

// ── Duration tracker (measures pending → complete) ────────────────────────

function useDuration(status: CardStatus): string | null {
  const startRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    if (status === "pending") {
      startRef.current = Date.now();
      setDuration(null);
    } else if (startRef.current !== null && duration === null) {
      const ms = Date.now() - startRef.current;
      setDuration(ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
    }
  }, [status, duration]);

  return duration;
}

// ── Computer tool card ────────────────────────────────────────────────────

function ComputerToolCard({
  message, partIdx, args, state, result,
  isLatestMessage, chatStatus, selected, onClick,
}: {
  message: Message; partIdx: number; toolCallId: string;
  args: Record<string, unknown>; state: string; result: unknown;
  isLatestMessage: boolean; chatStatus: string; selected: boolean;
  onClick: () => void;
}) {
  const action = args.action as string;
  const cardStatus = deriveCardStatus(state, result, isLatestMessage, chatStatus);
  const { accent, dot, label, Icon: StatusIcon, iconClass } = STATUS_CONFIG[cardStatus];
  const meta = ACTION_META[action] ?? { label: action, Icon: MousePointer, color: "text-zinc-500 bg-zinc-100" };
  const detail = getActionDetail(action, args);
  const isScreenshot = action === "screenshot";
  const duration = useDuration(cardStatus);

  const imgData =
    state === "result" &&
    typeof result === "object" && result !== null &&
    "type" in result && (result as { type: string }).type === "image"
      ? (result as { type: string; data: string }).data
      : null;

  return (
    <motion.div
      key={`${message.id}-part-${partIdx}`}
      initial={{ y: 4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "mb-1.5 rounded-xl border-l-4 bg-white border border-zinc-100 shadow-sm transition-all duration-150 overflow-hidden select-none group",
        accent,
        selected ? "ring-2 ring-blue-200 border-blue-200 cursor-default" : "cursor-pointer hover:shadow-md hover:border-zinc-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={cn("flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", meta.color)}>
          <meta.Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-800">{meta.label}</span>
            {detail && <span className="text-xs text-zinc-400 font-mono truncate">{detail}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {duration && (
            <span className="text-[10px] text-zinc-400 font-mono">{duration}</span>
          )}
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
            <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
          </div>
          <StatusIcon className={cn("w-3.5 h-3.5", iconClass)} />
        </div>
      </div>

      {/* Screenshot preview */}
      {isScreenshot && (
        <div className="px-3 pb-3">
          {imgData ? (
            <div className="relative group/img rounded-lg overflow-hidden border border-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${imgData}`}
                alt="Screenshot"
                className="w-full block"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-150 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm">
                  <Expand className="w-3 h-3" />
                  <span>View full size</span>
                </div>
              </div>
            </div>
          ) : cardStatus === "pending" ? (
            <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 animate-pulse flex items-center justify-center">
              <Camera className="w-6 h-6 text-zinc-300" />
            </div>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

// ── Bash tool card ────────────────────────────────────────────────────────

function BashToolCard({
  message, partIdx, args, state, result,
  isLatestMessage, chatStatus, selected, onClick,
}: {
  message: Message; partIdx: number; toolCallId: string;
  args: Record<string, unknown>; state: string; result: unknown;
  isLatestMessage: boolean; chatStatus: string; selected: boolean;
  onClick: () => void;
}) {
  const command = args.command as string;
  const cardStatus = deriveCardStatus(state, result, isLatestMessage, chatStatus);
  const { accent, dot, label, Icon: StatusIcon, iconClass } = STATUS_CONFIG[cardStatus];
  const duration = useDuration(cardStatus);

  const outputText =
    typeof result === "string" && result !== ABORTED && result.trim() ? result : null;
  const outputLines = outputText?.split("\n").slice(0, 3) ?? [];

  return (
    <motion.div
      key={`${message.id}-part-${partIdx}`}
      initial={{ y: 4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "mb-1.5 rounded-xl border-l-4 bg-zinc-950 border border-zinc-800 shadow-sm transition-all duration-150 overflow-hidden select-none",
        accent,
        selected ? "ring-2 ring-blue-500/40 cursor-default" : "cursor-pointer hover:border-zinc-700"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <code className="text-xs font-mono text-zinc-200 truncate block">
            <span className="text-emerald-500 mr-1">$</span>
            {command.slice(0, 60)}{command.length > 60 ? "…" : ""}
          </code>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {duration && (
            <span className="text-[10px] text-zinc-500 font-mono">{duration}</span>
          )}
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
            <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
          </div>
          <StatusIcon className={cn("w-3.5 h-3.5", iconClass)} />
        </div>
      </div>

      {/* Output preview */}
      {outputLines.length > 0 && (
        <div className="px-3 pb-2.5">
          <div className="rounded-lg bg-black/60 border border-zinc-800 px-3 py-2">
            {outputLines.map((line, i) => (
              <p key={i} className="text-[11px] text-zinc-400 font-mono leading-relaxed truncate">
                {line || " "}
              </p>
            ))}
            {(outputText?.split("\n").length ?? 0) > 3 && (
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                +{(outputText?.split("\n").length ?? 0) - 3} more lines
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2 px-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-300"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// ── Main message component ────────────────────────────────────────────────

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  selectedToolCallId,
  onToolCallClick,
}: {
  message: Message;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  selectedToolCallId?: string | null;
  onToolCallClick?: (toolCallId: string) => void;
}) => {
  const isUser = message.role === "user";
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        key={`message-${message.id}`}
      >
        <div className={cn("flex flex-col gap-1", isUser ? "max-w-[82%] items-end" : "w-full")}>
          {message.parts?.map((part, i) => {
            if (part.type === "text") {
              const isEmpty = !part.text.trim();
              if (isEmpty && isUser) return null;

              return (
                <motion.div
                  key={`${message.id}-text-${i}`}
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "text-sm leading-relaxed",
                    isUser
                      ? "bg-zinc-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm"
                      : "text-zinc-700 py-0.5"
                  )}
                >
                  {isEmpty && isLatestMessage && isStreaming
                    ? <ThinkingDots />
                    : <Streamdown>{part.text}</Streamdown>
                  }
                </motion.div>
              );
            }

            if (part.type === "tool-invocation") {
              const { toolName, toolCallId, state, args } = part.toolInvocation;
              const result = state === "result" ? part.toolInvocation.result : undefined;
              const isSelected = selectedToolCallId === toolCallId;
              const handleClick = () => onToolCallClick?.(toolCallId);

              if (toolName === "computer") {
                return (
                  <ComputerToolCard
                    key={`${message.id}-part-${i}`}
                    message={message}
                    partIdx={i}
                    toolCallId={toolCallId}
                    args={args as Record<string, unknown>}
                    state={state}
                    result={result}
                    isLatestMessage={isLatestMessage}
                    chatStatus={status}
                    selected={isSelected}
                    onClick={handleClick}
                  />
                );
              }

              if (toolName === "bash") {
                return (
                  <BashToolCard
                    key={`${message.id}-part-${i}`}
                    message={message}
                    partIdx={i}
                    toolCallId={toolCallId}
                    args={args as Record<string, unknown>}
                    state={state}
                    result={result}
                    isLatestMessage={isLatestMessage}
                    chatStatus={status}
                    selected={isSelected}
                    onClick={handleClick}
                  />
                );
              }
            }

            return null;
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prev, next) => {
  if (prev.status !== next.status) return false;
  if (!equal(prev.message.parts, next.message.parts)) return false;
  if (prev.selectedToolCallId !== next.selectedToolCallId) return false;
  return true;
});



