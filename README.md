# Operator — AI Computer-Use Agent

> Built for the Emergent AI challenge · May 2026

**[▶ Demo Video](https://drive.google.com/file/d/1gHmBLa8c4SFOHDKgUvMxDZ00cniwVBDH/view?usp=sharing)** · 

---

![App screenshot](samples/Screenshot%202026-05-09%20235633.png)

An AI agent that controls a real Linux desktop in the browser. Type a task → watch the agent take screenshots, click, type, and browse — live.

---

## Features

- **Streaming chat** with inline tool-call cards (screenshot thumbnails, bash output, click details)
- **Live remote desktop** via noVNC iframe — Vercel Sandbox ephemeral VM
- **Structured event pipeline** — every tool call captured: `id`, `timestamp`, `type`, `payload`, `status` (pending/complete/error/aborted), `duration`
- **Collapsible debug panel** — real-time event timeline + per-action-type counts
- **Expanded tool detail panel** — click any tool card in chat to see full details in the right panel
- **Session management** — create, switch, delete sessions; history persisted to `localStorage`
- **Resizable panels** — drag the divider between chat and desktop
- **Mobile support** — Chat / Desktop tab switcher on small screens

---

## Architecture

```
Browser
├── Left panel (38%)  ── Chat messages + inline tool cards + debug panel
└── Right panel (62%) ── noVNC iframe (live desktop) + expanded tool detail

Next.js App Router
├── /api/chat         ── streamText with computer + bash tools (maxSteps: 10)
└── /api/kill-desktop ── cleans up sandbox VM on session end

Event pipeline
  useChat (AI SDK) → useEventStore → AgentEvent[] → DebugPanel + ExpandedToolDetail

State management
  useSessions  (localStorage) ── sessions list, sandboxId per session
  useEventStore (derived)     ── events[], countByType, agentStatus
```

---

## Technical Standards Met

| Area | Implementation |
|------|---------------|
| **TypeScript** | No `any`. Discriminated union `AgentEvent = ComputerAgentEvent \| BashAgentEvent` with fully-typed payloads per action |
| **React performance** | `VncViewer` wrapped in `React.memo` with custom comparator — zero re-renders on chat updates |
| **Event store** | `id`, `timestamp`, `type`, `payload`, `status`, `duration` on every event; derived `countByType` and `agentStatus` |
| **Streaming** | Server-side `maxSteps: 10` keeps tool loops internal; screenshot base64 always redacted before API round-trips to stay within token limits |
| **Concurrency** | `beforeunload`/`pagehide` beacon kills the sandbox VM; each session tracks its own `sandboxId` |
| **Error handling** | Tool lifecycle: initiated → executing → completed/failed/aborted; toast notifications on API errors |

---

## Tech Stack

| | |
|--|--|
| **Framework** | Next.js 15.2 (App Router, React 19) |
| **AI** | Groq `llama-3.1-8b-instant` via `@ai-sdk/openai` (OpenAI-compat endpoint) |
| **AI SDK** | `ai` v4 — `streamText`, `useChat`, `tool()` with Zod schemas |
| **Sandbox** | Vercel Sandbox — ephemeral Linux VMs (Xvnc, openbox, Chrome, websockify, noVNC) |
| **Styling** | Tailwind CSS v4, shadcn/ui, motion/react |
| **Layout** | `react-resizable-panels` |

> **Note on AI provider:** The challenge originally references Anthropic Claude. We switched to Groq (`llama-3.1-8b-instant`) due to Anthropic credit exhaustion. Groq provides an OpenAI-compatible API so the AI SDK integration is identical. The `computer` and `bash` tool schemas, event pipeline, and all other architecture are provider-agnostic.

---

## Running Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env.local`:
```
GROQ_API_KEY=gsk_...           # https://console.groq.com
VERCEL_TOKEN=vcp_...           # https://vercel.com/account/tokens
SANDBOX_SNAPSHOT_ID=snap_...   # see step 3
```

### 3. Create the sandbox snapshot (one-time, ~10 min)
Builds a Linux VM image with Chrome, VNC, and all desktop tools pre-installed:
```bash
npx tsx lib/sandbox/create-snapshot.ts
```
Copy the printed `snap_xxx` ID into `.env.local`.

### 4. Start the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Decisions & Trade-offs

- **Groq over Anthropic** — identical AI SDK integration, massively higher free-tier rate limits (6M TPM vs 12K TPM), avoiding blocked credits.
- **Server-side `maxSteps`** — keeps all tool-loop round-trips server-internal so the browser only receives one streaming response per user message, reducing complexity and latency.
- **Screenshot redaction** — base64 images are stripped from the message history before each API call; only the most recent live screenshot is sent, keeping requests under the token limit.
- **Event store derived from messages** — `useEventStore` derives structured `AgentEvent[]` from `useChat` messages rather than maintaining a separate parallel state, avoiding sync issues.

