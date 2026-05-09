# Operator — AI Computer-Use Agent

![Operator screenshot](samples/Screenshot%202026-05-09%20235633.png)

An AI agent that controls a real browser desktop. Send a message, watch it click, type, and browse — live.

---

## What We Built

A full-stack computer-use agent with:

- **Streaming AI chat** — Groq `llama-3.1-8b-instant` via the AI SDK, server-side multi-step tool loops (`maxSteps: 10`)
- **Live remote desktop** — Vercel Sandbox (ephemeral Linux VM) streamed to the browser via noVNC/WebSocket
- **Structured event pipeline** — every tool call captured with `id`, `timestamp`, `type`, `payload`, `status`, `duration`
- **Interactive tool visualizations** — screenshot thumbnails, bash output, and click details inline in chat; click any to expand in the right panel
- **Session management** — create, switch, and delete sessions; full message history persisted to `localStorage`
- **Collapsible debug panel** — event timeline + per-type counts, useful for inspecting agent behavior
- **Mobile support** — tab switcher (Chat / Desktop) for small screens

---

## Architecture

```
Browser
 ├── Left panel (38%) ─── Chat + tool cards + debug panel
 └── Right panel (62%) ── noVNC iframe + expanded tool detail

Next.js App Router (server)
 ├── /api/chat    ── streamText (Groq, maxSteps: 10, computer + bash tools)
 └── /api/kill-desktop ── tears down sandbox on session end

Event pipeline
 messages (useChat) → useEventStore → AgentEvent[] → DebugPanel + ExpandedToolDetail

State
 useSessions (localStorage) ── session list, sandboxId per session
 useEventStore (derived)    ── events[], countByType, agentStatus
```

---

## Technical Focus

| Area | Approach |
|------|----------|
| **TypeScript** | No `any`. Discriminated union `AgentEvent = ComputerAgentEvent \| BashAgentEvent` with full payload typing |
| **React performance** | `VncViewer` wrapped in `memo` — never re-renders on chat updates |
| **State** | Centralized derived event store; screenshot base64 always redacted before API round-trips |
| **Streaming** | Server-side `maxSteps` keeps tool loops server-internal; client sees a single streaming response |
| **Concurrency** | Sandbox lifecycle tied to session; `beforeunload` / `pagehide` cleans up VMs |

---

## Tech Stack

- **Next.js 15** (App Router, React 19)
- **AI SDK** (`ai`, `@ai-sdk/openai`) — streaming, tool calls
- **Groq** (`llama-3.1-8b-instant`) — fast inference, large free-tier TPM
- **Vercel Sandbox** — ephemeral Linux VMs with snapshot restore
- **Tailwind CSS v4** + shadcn/ui components
- **react-resizable-panels** — drag-to-resize layout
- **motion/react** — animated message entries and tool cards
- **Zod** — tool parameter schemas

---

## Running Locally

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   ```
   GROQ_API_KEY=...
   VERCEL_TOKEN=...
   SANDBOX_SNAPSHOT_ID=...   # create with: npx tsx lib/sandbox/create-snapshot.ts
   ```

3. Start:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).
```

## Deploy Your Own

You can deploy your own version to Vercel by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=AI+SDK+Computer+Use+Demo&repository-name=ai-sdk-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-computer-use&demo-title=AI+SDK+Computer+Use+Demo&demo-url=https%3A%2F%2Fai-sdk-computer-use.vercel.app%2F&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Anthropic+Claude+Sonnet+4.5+computer+use+capabilities+with+Vercel+Sandboxes&env=ANTHROPIC_API_KEY,SANDBOX_SNAPSHOT_ID)

## Running Locally

### Prerequisites

- Node.js 18+
- A [Vercel](https://vercel.com) account (for Sandbox access)
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Vercel credentials

Install the [Vercel CLI](https://vercel.com/docs/cli) and link your project:

```bash
pnpm install -g vercel
vercel link
vercel env pull
```

This creates a `.env.local` file with `VERCEL_OIDC_TOKEN` for Sandbox authentication.

Alternatively, set `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID` manually in your `.env.local`.

### 3. Create a sandbox snapshot

The snapshot pre-installs the desktop environment (Xvnc, Chrome, openbox, noVNC, xdotool, ImageMagick) so sandboxes boot in seconds.

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

This takes ~10 minutes. When done, it outputs a snapshot ID. Add it to your `.env.local`:

```
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxx
```

### 4. Add your Anthropic API key

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the computer use agent.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `SANDBOX_SNAPSHOT_ID` | Yes | Vercel Sandbox snapshot with the desktop environment |
| `VERCEL_OIDC_TOKEN` | Yes* | Auto-set by `vercel env pull` for Sandbox auth |
| `VERCEL_TOKEN` | Alt* | Alternative to OIDC — a Vercel personal access token |
| `VERCEL_TEAM_ID` | Alt* | Required with `VERCEL_TOKEN` |
| `VERCEL_PROJECT_ID` | Alt* | Required with `VERCEL_TOKEN` |

\* Either `VERCEL_OIDC_TOKEN` (via `vercel env pull`) or the `VERCEL_TOKEN` + team/project IDs are required for Sandbox authentication.
