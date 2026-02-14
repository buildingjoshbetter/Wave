# Wave

**Your personal intelligence agent. Real signals. Zero noise.**

Wave is an [OpenClaw](https://github.com/openclaw/openclaw) skill that monitors the companies, industries, and topics you care about -- and only texts you when something actually matters. Built on [Linkt.ai](https://linkt.ai)'s signal engine.

**No app to download. No dashboard to check. Just a Telegram chat with an AI analyst that gets smarter every day.**

## What It Does

- Tell the bot about yourself in plain English
- It monitors 17+ signal types: product launches, funding rounds, executive moves, regulatory changes, patents, hiring surges, and more
- Signals get analyzed, not just forwarded -- competitive context, source research, and relevance scoring
- Pattern detection across signals ("4 signals suggest Company X is preparing a major launch")
- Multi-agent war room debates on high-impact signals
- Daily morning intelligence briefings
- Learns from your feedback -- gets more accurate over time

## Quick Start

### Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- A Telegram bot (create one via [@BotFather](https://t.me/BotFather))
- A [Linkt.ai](https://app.linkt.ai) API key (free tier available)

### Install (60 seconds)

1. Clone the repo:
   ```bash
   git clone https://github.com/buildingjoshbetter/wave.git
   ```

2. Copy the skill into OpenClaw:
   ```bash
   cp -r wave/skill ~/.openclaw/skills/signal-radar
   ```

3. Install dependencies:
   ```bash
   cd ~/.openclaw/skills/signal-radar
   npm install
   ```

4. Add your Linkt.ai API key to OpenClaw config:
   ```bash
   nano ~/.openclaw/openclaw.json
   ```
   ```json
   {
     "skills": {
       "entries": {
         "signal-radar": {
           "enabled": true,
           "env": {
             "LINKT_API_KEY": "sk-your-linkt-api-key"
           }
         }
       }
     }
   }
   ```

5. Restart OpenClaw:
   ```bash
   openclaw gateway restart
   ```

6. Open Telegram and message your bot: "Set up my signal radar"

That's it. You're live.

## How It Works

1. You tell Wave about yourself -- it creates a monitoring profile on Linkt.ai
2. Linkt.ai monitors the web 24/7 for relevant signals
3. Wave polls for new signals every 30 minutes
4. Each signal is analyzed by the AI agent for relevance to YOUR interests
5. Only signals above your threshold get sent to Telegram
6. You give feedback -- Wave gets smarter over time

## Features

### Signal Chain Reactions
Doesn't just forward headlines. Investigates automatically -- visits source articles, checks careers pages, cross-references with your profile, and delivers a competitive intelligence brief.

### Pattern Detection
Connects signals across days and weeks to predict what's coming. "4 signals about Anthropic in 10 days: office lease + hiring surge + partnership + more hiring = major expansion incoming."

### War Room
Three AI agents debate high-impact signals from different angles:
- **Analyst** (Blue): factual assessment and market context
- **Skeptic** (Red): counterarguments and risks of overreaction
- **Strategist** (Green): what this means for YOUR business specifically

### Morning Briefing
One daily synthesis instead of 15 individual pings. HIGH PRIORITY, WORTH KNOWING, and FILTERED OUT -- reply with a number for a deep dive on any item.

### Natural Refinement
- "stop sending me patent filings" -- adjusts filters instantly
- "add Linear to my watchlist" -- updates monitoring
- "how's my accuracy?" -- shows feedback stats

## Configuration

Key settings (managed via natural language or SQLite):

| Setting | Default | Description |
|---------|---------|-------------|
| Signal threshold | 0.5 | Minimum relevance score to send |
| War room threshold | 0.85 | Score that triggers multi-agent debate |
| Morning briefing | 8:00 AM | Daily briefing time |
| Quiet hours | 10 PM - 7 AM | Signals queued, not sent |
| Poll interval | 30 minutes | How often to check for new signals |

## Project Structure

```
wave/
├── skill/                    # The OpenClaw skill (this is the product)
│   ├── SKILL.md              # Core skill definition
│   ├── package.json          # Node.js dependencies
│   ├── scripts/
│   │   ├── linkt-client.mjs  # Linkt.ai SDK wrapper
│   │   ├── signal-poll.mjs   # Background signal polling
│   │   ├── feedback-store.mjs# SQLite operations + escapeHtml
│   │   └── briefing-builder.mjs # Morning briefing synthesizer
│   └── references/
│       ├── onboarding-flow.md
│       ├── signal-processing.md
│       ├── war-room-prompts.md
│       └── linkt-api-reference.md
├── demo/                     # Demo tooling (not part of the core skill)
│   ├── demo-triggers.mjs
│   ├── seed-patterns.sql
│   └── demo-cache/
├── docs/                     # Additional documentation
│   ├── SETUP.md
│   ├── CONFIGURATION.md
│   └── ARCHITECTURE.md
├── README.md
├── LICENSE
├── .env.example
└── .gitignore
```

## Built With

- [OpenClaw](https://github.com/openclaw/openclaw) -- AI agent runtime
- [Linkt.ai](https://linkt.ai) -- Signal monitoring engine
- [Telegram](https://telegram.org) -- User interface
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) -- Local database

## Built By

[@building_josh](https://twitter.com/building_josh)

## License

MIT
