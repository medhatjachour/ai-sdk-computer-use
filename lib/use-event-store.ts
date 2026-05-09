import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import type { AgentEvent, AgentStatus, ComputerPayload, EventStoreDerivedState } from "./types";
import { ABORTED } from "./utils";

function deriveAgentStatus(
  events: AgentEvent[],
  chatStatus: string
): AgentStatus {
  if (chatStatus === "ready") return "idle";
  const hasPending = events.some((e) => e.status === "pending");
  return hasPending ? "executing" : "thinking";
}

function buildCountByType(events: AgentEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, e) => {
    const key = e.tool === "computer" ? e.payload.type : "bash";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function useEventStore(
  messages: UIMessage[],
  chatStatus: string
): EventStoreDerivedState {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  // Tracks start time per toolCallId — never causes renders
  const startTimes = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setEvents((prev) => {
      const next = [...prev];
      let changed = false;

      for (const message of messages) {
        if (!message.parts) continue;
        for (const part of message.parts) {
          if (part.type !== "tool-invocation") continue;

          const { toolCallId, toolName, state, args } = part.toolInvocation;
          const existingIdx = next.findIndex((e) => e.toolCallId === toolCallId);

          if (state === "call" && existingIdx === -1) {
            // New pending event
            startTimes.current.set(toolCallId, Date.now());

            if (toolName === "computer") {
              next.push({
                id: toolCallId,
                toolCallId,
                timestamp: Date.now(),
                status: "pending",
                tool: "computer",
                payload: args as ComputerPayload,
              });
            } else if (toolName === "bash") {
              next.push({
                id: toolCallId,
                toolCallId,
                timestamp: Date.now(),
                status: "pending",
                tool: "bash",
                payload: { command: args.command as string },
              });
            }
            changed = true;
          }

          if (state === "result" && existingIdx !== -1) {
            const existing = next[existingIdx];
            const startTime = startTimes.current.get(toolCallId);
            const duration = startTime ? Date.now() - startTime : undefined;
            const rawResult: unknown = part.toolInvocation.result;
            const hasError =
              typeof rawResult === "object" &&
              rawResult !== null &&
              "error" in rawResult;
            const status =
              rawResult === ABORTED ? "aborted" : hasError ? "error" : "complete";

            next[existingIdx] = { ...existing, status, duration, result: rawResult } as AgentEvent;
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [messages]);

  const countByType = buildCountByType(events);
  const agentStatus = deriveAgentStatus(events, chatStatus);

  return { events, countByType, agentStatus };
}
