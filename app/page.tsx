"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { ABORTED } from "@/lib/utils";
import { getDesktopURL } from "@/lib/sandbox/utils";
import { useSessions, loadSessionMessages, saveSessionMessages } from "@/lib/use-sessions";
import { useEventStore } from "@/lib/use-event-store";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { VncViewer } from "@/components/vnc-viewer";
import { DebugPanel } from "@/components/debug-panel";
import { SessionSidebar } from "@/components/session-sidebar";
import { ExpandedToolDetail } from "@/components/expanded-tool-detail";
import { PreviewMessage } from "@/components/message";
import { Input } from "@/components/input";

import { PromptSuggestions } from "@/components/prompt-suggestions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { AgentEvent } from "@/lib/types";

export default function Chat() {
  const [containerRef, endRef] = useScrollToBottom();

  // ── Session management ───────────────────────────────────────────────────
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSession,
  } = useSessions();

  // ── VNC state ────────────────────────────────────────────────────────────
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDesktopError, setIsDesktopError] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AgentEvent | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "desktop">("chat");

  // ── Chat ─────────────────────────────────────────────────────────────────
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: activeSessionId,
    body: { sandboxId: activeSession?.sandboxId },
    maxSteps: 30,
    onError: (err) => {
      const msg = err?.message ?? "Please try again later.";
      const isCredits = msg.toLowerCase().includes("credit") || msg.toLowerCase().includes("balance");
      toast.error(isCredits ? "API credit limit reached" : "Agent error", {
        description: isCredits
          ? "Your API account has insufficient credits. Add credits to continue."
          : msg.slice(0, 120),
        richColors: true,
        position: "top-center",
        duration: 8000,
      });
    },
  });

  // ── Event store (derived) ─────────────────────────────────────────────────
  const { events, countByType, agentStatus } = useEventStore(messages, status);
  const isLoading = status !== "ready";

  // ── Stop helper ───────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    stopGeneration();
    const lastMessage = messages.at(-1);
    const lastPart = lastMessage?.parts?.at(-1);
    if (lastMessage?.role === "assistant" && lastPart?.type === "tool-invocation") {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastPart,
              toolInvocation: {
                ...lastPart.toolInvocation,
                state: "result",
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  }, [messages, setMessages, stopGeneration]);

  // ── Desktop helpers ───────────────────────────────────────────────────────
  const startDesktop = useCallback(
    async (existingSandboxId?: string | null) => {
      setIsInitializing(true);
      setIsDesktopError(false);
      try {
        const { streamUrl: url, id } = await getDesktopURL(existingSandboxId ?? undefined);
        setStreamUrl(url);
        updateSession(activeSessionId, { sandboxId: id, updatedAt: Date.now() });
      } catch (err) {
        setIsDesktopError(true);
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error("Desktop failed to start", {
          description: msg.length > 120 ? msg.slice(0, 120) + "…" : msg,
          duration: 8000,
        });
      } finally {
        setIsInitializing(false);
      }
    },
    [activeSessionId, updateSession]
  );

  const onRefresh = useCallback(() => startDesktop(null), [startDesktop]);

  // ── Init on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    startDesktop(activeSession?.sandboxId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Kill desktop on page close ────────────────────────────────────────────
  const sandboxId = activeSession?.sandboxId;
  useEffect(() => {
    if (!sandboxId) return;
    const kill = () =>
      navigator.sendBeacon(`/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`);
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const evt = isIOS || isSafari ? "pagehide" : "beforeunload";
    window.addEventListener(evt, kill);
    return () => { window.removeEventListener(evt, kill); kill(); };
  }, [sandboxId]);

  // ── Auto-save messages (debounced) ────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSessionMessages(activeSessionId, messages), 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [messages, activeSessionId]);

  // ── Auto-title session ────────────────────────────────────────────────────
  useEffect(() => {
    const firstUser = messages.find((m) => m.role === "user");
    if (!firstUser) return;
    const content = typeof firstUser.content === "string" ? firstUser.content : "";
    const title = content.slice(0, 40) || "New session";
    if (activeSession?.title !== title) {
      updateSession(activeSessionId, { title, updatedAt: Date.now() });
    }
  }, [messages, activeSessionId, activeSession?.title, updateSession]);

  // ── Session switching ─────────────────────────────────────────────────────
  const switchSession = useCallback(
    async (id: string) => {
      if (id === activeSessionId) return;
      saveSessionMessages(activeSessionId, messages);
      setActiveSessionId(id);
      setMessages(loadSessionMessages(id));
      setSelectedToolCallId(null);
      setSelectedEvent(null);
      setIsDesktopError(false);
      const target = sessions.find((s) => s.id === id);
      await startDesktop(target?.sandboxId);
    },
    [activeSessionId, messages, sessions, setActiveSessionId, setMessages, startDesktop]
  );

  const handleCreateSession = useCallback(async () => {
    saveSessionMessages(activeSessionId, messages);
    createSession();
    setMessages([]);
    setSelectedToolCallId(null);
    setSelectedEvent(null);
    setIsDesktopError(false);
    await startDesktop(null);
  }, [activeSessionId, messages, createSession, setMessages, startDesktop]);

  // ── Tool call selection ───────────────────────────────────────────────────
  const handleToolCallClick = useCallback(
    (toolCallId: string) => {
      setSelectedToolCallId((prev) => (prev === toolCallId ? null : toolCallId));
      setSelectedEvent(events.find((e) => e.toolCallId === toolCallId) ?? null);
    },
    [events]
  );

  // Keep selectedEvent fresh when its result arrives
  useEffect(() => {
    if (!selectedToolCallId) return;
    setSelectedEvent(events.find((e) => e.toolCallId === selectedToolCallId) ?? null);
  }, [events, selectedToolCallId]);

  // ── Render ────────────────────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 -mt-4">
            {/* Brand mark */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold tracking-tight">AI</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-900">Operator</p>
                <p className="text-xs text-zinc-400 mt-0.5">AI computer-use agent</p>
              </div>
            </div>
            <PromptSuggestions
              disabled={isInitializing}
              submitPrompt={(prompt) => append({ role: "user", content: prompt })}
            />
          </div>
        ) : (
          messages.map((message, i) => (
            <PreviewMessage
              key={message.id}
              message={message}
              isLoading={isLoading}
              status={status}
              isLatestMessage={i === messages.length - 1}
              selectedToolCallId={selectedToolCallId}
              onToolCallClick={handleToolCallClick}
            />
          ))
        )}
        <div ref={endRef} className="pb-2" />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3">
        <form onSubmit={handleSubmit}>
          <Input
            handleInputChange={handleInputChange}
            input={input}
            isInitializing={isInitializing}
            isLoading={isLoading}
            status={status}
            stop={stop}
          />
        </form>
        <p className="mt-2 text-center text-[10px] text-zinc-300 select-none">
          {isInitializing ? "Connecting to sandbox…" : "Groq llama-3.1-8b · Vercel Sandbox"}
        </p>
      </div>

      {/* Debug panel */}
      <DebugPanel
        events={events}
        countByType={countByType}
        agentStatus={agentStatus}
        isOpen={isDebugOpen}
        onToggle={() => setIsDebugOpen((v) => !v)}
      />
    </div>
  );

  const vncPanel = (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex-1 min-h-0">
        <VncViewer
          streamUrl={streamUrl}
          isInitializing={isInitializing}
          isError={isDesktopError}
          onRefresh={onRefresh}
        />
      </div>
      {selectedEvent && (
        <div className="h-72 shrink-0 border-t border-white/10">
          <ExpandedToolDetail
            event={selectedEvent}
            onClose={() => { setSelectedToolCallId(null); setSelectedEvent(null); }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-zinc-950">
      {/* ── Global top bar ────────────────────────────────────────────── */}
      <header className="shrink-0 h-11 bg-zinc-950 border-b border-white/[0.06] flex items-center justify-between px-3 z-20">
        {/* Left: sidebar toggle + brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Toggle sessions"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="6.25" width="8" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="10.5" width="10" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
              <span className="text-zinc-900 text-[9px] font-black tracking-tighter">OP</span>
            </div>
            <span className="text-white/80 text-xs font-semibold tracking-tight hidden sm:block">Operator</span>
          </div>
        </div>

        {/* Center: session name */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <span className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">
            {sessions.find((s) => s.id === activeSessionId)?.title ?? "New session"}
          </span>
        </div>

        {/* Right: agent status pill */}
        <div className="flex items-center gap-2">
          {/* Mobile tab switcher */}
          <div className="flex xl:hidden items-center gap-0.5 bg-white/10 rounded-md p-0.5">
            <button
              onClick={() => setMobileTab("chat")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mobileTab === "chat" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >Chat</button>
            <button
              onClick={() => setMobileTab("desktop")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mobileTab === "desktop" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >Desktop</button>
          </div>

          <div className={`hidden xl:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            agentStatus === "executing" ? "bg-green-500/20 text-green-400" :
            agentStatus === "thinking"  ? "bg-amber-500/20 text-amber-400" :
                                          "bg-white/10 text-zinc-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              agentStatus === "executing" ? "bg-green-400 animate-pulse" :
              agentStatus === "thinking"  ? "bg-amber-400 animate-pulse" :
                                            "bg-zinc-600"
            }`} />
            {agentStatus}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Session sidebar */}
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
          onSelect={switchSession}
          onCreate={handleCreateSession}
          onDelete={deleteSession}
        />

        {/* ── Desktop two-panel layout ─────────────────────────────────── */}
        <div className="hidden xl:flex flex-1 min-w-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={38} minSize={24} className="flex flex-col">
              {/* Chat panel header */}
              <div className="shrink-0 h-10 px-4 flex items-center justify-between bg-white border-b border-zinc-100">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Chat</span>
                <span className="text-[10px] text-zinc-300 font-mono">{messages.length} msgs</span>
              </div>
              {chatPanel}
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={62} minSize={30}>
              {vncPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* ── Mobile single-panel layout ───────────────────────────────── */}
        <div className="xl:hidden flex-1 min-w-0">
          {mobileTab === "chat" ? chatPanel : vncPanel}
        </div>
      </div>
    </div>
  );
}
