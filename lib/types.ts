// ─── Computer tool payloads ───────────────────────────────────────────────

export type ScreenshotPayload = { type: "screenshot" };

export type ClickPayload = {
  type: "left_click" | "right_click" | "double_click";
  coordinate: [number, number];
};

export type MouseMovePayload = {
  type: "mouse_move";
  coordinate: [number, number];
};

export type TypePayload = { type: "type"; text: string };

export type KeyPayload = { type: "key"; key: string };

export type ScrollPayload = {
  type: "scroll";
  coordinate: [number, number];
  scroll_direction: "up" | "down";
  scroll_amount: number;
};

export type WaitPayload = { type: "wait"; duration?: number };

export type DragPayload = {
  type: "left_click_drag";
  startCoordinate: [number, number];
  coordinate: [number, number];
};

export type ComputerPayload =
  | ScreenshotPayload
  | ClickPayload
  | MouseMovePayload
  | TypePayload
  | KeyPayload
  | ScrollPayload
  | WaitPayload
  | DragPayload;

// ─── Event status ─────────────────────────────────────────────────────────

export type EventStatus = "pending" | "complete" | "error" | "aborted";

// ─── Agent events (discriminated by `tool`) ───────────────────────────────

interface BaseAgentEvent {
  id: string;
  toolCallId: string;
  timestamp: number;
  status: EventStatus;
  duration?: number;
}

export interface ComputerAgentEvent extends BaseAgentEvent {
  tool: "computer";
  payload: ComputerPayload;
  result?: string | { type: "image"; data: string };
}

export interface BashAgentEvent extends BaseAgentEvent {
  tool: "bash";
  payload: { command: string };
  result?: string;
}

export type AgentEvent = ComputerAgentEvent | BashAgentEvent;

// ─── Agent status ─────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "thinking" | "executing";

// ─── Derived state from the event store ───────────────────────────────────

export interface EventStoreDerivedState {
  events: AgentEvent[];
  countByType: Record<string, number>;
  agentStatus: AgentStatus;
}

// ─── Chat sessions ────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sandboxId: string | null;
}
