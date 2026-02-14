# Architecture

## System Overview

```
User (Telegram)
      |
      v
OpenClaw Gateway
      |
      v
Wave Skill (SKILL.md)
      |
      +---> Linkt.ai SDK (signal monitoring)
      |
      +---> SQLite (local state + feedback)
      |
      +---> Browser Tool (deep dive research)
      |
      +---> sessions_spawn (war room sub-agents)
```

## Data Flow

### Signal Ingestion
1. Cron job triggers every 30 minutes
2. `signal-poll.mjs` calls Linkt.ai `signal.list()` API
3. New signals are deduplicated against `signals_seen` table
4. Each new signal is evaluated by the agent for relevance

### Signal Evaluation
1. Agent reads signal data from `signal-poll.mjs` output
2. Cross-references with user profile (from SQLite)
3. Checks feedback history via `feedback-store.mjs check-relevance`
4. Applies threshold: forward (>= 0.8), investigate (0.5-0.8), or filter (< 0.5)

### Deep Dive
1. User taps "Tell Me More" button
2. Agent checks for cached response in `data/demo-cache/`
3. If no cache: uses browser tool to visit source URLs
4. Visits company careers page, GitHub, LinkedIn
5. Synthesizes 500-800 word analysis personalized to user

### War Room
1. Signal scores >= 0.85 triggers war room
2. Agent spawns 3 sub-agents via `sessions_spawn`
3. Each sub-agent analyzes from different perspective
4. Accepts 2/3 responses minimum (60-second timeout)
5. Parent agent synthesizes consensus

### Morning Briefing
1. Daily cron at configured time
2. `briefing-builder.mjs` queries last 24 hours of signals
3. Categorizes into HIGH / WORTH KNOWING / FILTERED
4. Checks for entity patterns (2+ signals, 7 days)
5. Agent formats and sends to Telegram

## Storage

All persistent data lives in SQLite (`data/wave.db`):
- WAL mode for concurrent read/write safety
- `busy_timeout = 5000` prevents lock contention
- Single-row `user_profile` table (v1 is single-user)
- `signal_id` PRIMARY KEY prevents duplicate processing

Session memory is used as a cache for the active chat session only.
Cron jobs read exclusively from SQLite (isolated sessions).

## Security

- API keys stored in OpenClaw config, never in code
- Signal summaries are HTML-escaped before Telegram delivery
- Signal text treated as external data, never as instructions
- Only HTTPS URLs visited by browser tool
- Sub-agents sandboxed (no session tools, no Telegram access)
- `dmPolicy: "pairing"` prevents unauthorized access
