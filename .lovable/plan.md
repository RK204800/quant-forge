

## AI Strategy Advisor Chatbot

### Overview
Add a floating chatbot panel accessible from any page that acts as a technical analysis expert. It can interrogate the user's strategy data (trades, metrics, equity curves) and provide actionable improvement suggestions. Uses Lovable AI (Gemini) via an edge function.

### Architecture

```text
┌─────────────────────────────────┐
│  AppLayout                      │
│  ┌───────────┐  ┌─────────────┐ │
│  │ Sidebar   │  │ Main Content│ │
│  │           │  │             │ │
│  └───────────┘  └─────────────┘ │
│                    ┌──────────┐  │
│                    │ Chat FAB │  │  ← floating button (bottom-right)
│                    └──────────┘  │
│              ┌─────────────────┐ │
│              │ Chat Panel      │ │  ← slides up, resizable
│              │ - Messages      │ │
│              │ - Context chips │ │
│              │ - Input         │ │
│              └─────────────────┘ │
└─────────────────────────────────┘
```

### Backend: Edge Function `supabase/functions/strategy-advisor/index.ts`

- Receives: `{ messages, strategyContext }` where `strategyContext` is a structured summary of the current strategy's metrics, trade stats, and equity data
- System prompt: Expert technical analyst persona with instructions to analyze the provided data and suggest improvements (entry/exit timing, risk management, position sizing, parameter tuning, market regime awareness)
- Streams response via SSE using Lovable AI gateway (`google/gemini-3-flash-preview`)
- Handles 429/402 errors gracefully

### Frontend Components

**`src/components/chat/StrategyChatbot.tsx`** — Main chatbot component:
- Floating action button (bottom-right corner) with a chat icon
- Expandable chat panel with message history, markdown rendering, and streaming responses
- "Attach context" feature: user can attach current strategy data as context before asking
- Uses `react-markdown` for rendering AI responses
- Persists conversation in component state (resets on page navigation — no DB needed)

**`src/components/chat/ChatMessage.tsx`** — Individual message bubble with markdown support

**`src/lib/strategy-context.ts`** — Helper that serializes a Strategy object into a concise text summary for the AI:
- Key metrics (Sharpe, win rate, profit factor, max DD, expectancy)
- Trade distribution stats (avg win, avg loss, best/worst, streak info)
- Time-of-day and day-of-week performance patterns
- Monthly returns summary
- Parameter values if available
- Truncated to stay within token limits (~3000 tokens)

### Integration

- Add `<StrategyChatbot />` to `AppLayout.tsx` so it's available on every page
- The chatbot reads the current route; if on a strategy detail page, it auto-loads that strategy's context
- On other pages, users can still chat generally about trading concepts
- A "Load Strategy" button lets users pick a strategy to analyze from anywhere

### Config Changes

- `supabase/config.toml`: Add `[functions.strategy-advisor]` with `verify_jwt = false`

### Files to Create
- `supabase/functions/strategy-advisor/index.ts`
- `src/components/chat/StrategyChatbot.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/lib/strategy-context.ts`

### Files to Modify
- `src/components/layout/AppLayout.tsx` — add `<StrategyChatbot />`
- `supabase/config.toml` — register edge function

### Dependencies
- `react-markdown` for rendering AI responses

