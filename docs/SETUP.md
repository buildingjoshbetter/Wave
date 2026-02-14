# Setup Guide

## Prerequisites

1. **OpenClaw** installed and running on a VPS or local machine
   ```bash
   openclaw --version  # Should show v0.x.x+
   ```

2. **Telegram bot** created via [@BotFather](https://t.me/BotFather) and configured in OpenClaw

3. **Node.js** >= 22 (required by OpenClaw)

4. **Linkt.ai API key** from [app.linkt.ai](https://app.linkt.ai)

## Step-by-Step Installation

### 1. Clone the Repository

```bash
cd ~/.openclaw/skills/
git clone https://github.com/buildingjoshbetter/wave.git wave
cd wave/skill
```

Or copy just the skill directory:
```bash
git clone https://github.com/buildingjoshbetter/wave.git /tmp/wave
cp -r /tmp/wave/skill/ ~/.openclaw/skills/wave/
cd ~/.openclaw/skills/wave
```

### 2. Install Dependencies

```bash
npm install
```

If `better-sqlite3` fails to compile (requires build tools):
```bash
# Install build tools (Ubuntu/Debian)
sudo apt-get install -y build-essential python3

# Retry
npm install
```

Fallback: Use `sql.js` (pure JavaScript, no native compilation):
```bash
npm install sql.js
# Then update imports in scripts from 'better-sqlite3' to sql.js equivalent
```

### 3. Configure API Key

Add to OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "wave": {
        "enabled": true,
        "env": {
          "LINKT_API_KEY": "sk-your-linkt-api-key"
        }
      }
    }
  }
}
```

Or set as environment variable:
```bash
export LINKT_API_KEY="sk-your-linkt-api-key"
```

### 4. Restart OpenClaw

```bash
openclaw gateway restart
```

### 5. Verify

```bash
# Check skill is loaded
openclaw logs --follow | grep -i "wave"

# Initialize database
cd ~/.openclaw/skills/wave
node scripts/feedback-store.mjs init

# Verify tables
sqlite3 data/wave.db ".tables"
# Should show: feedback  signal_patterns  signals_seen  user_profile
```

### 6. Start Using

Open Telegram, message your bot:
> "Set up Wave"

The bot will guide you through onboarding.

## Cron Jobs (Optional)

The agent sets these up during onboarding, but you can pre-create them:

```bash
# Signal polling every 30 minutes
openclaw cron add \
  --name "signal-poll" \
  --cron "*/30 * * * *" \
  --tz "America/Chicago" \
  --session isolated \
  --message "Run signal polling per Wave skill instructions." \
  --announce --channel telegram --to "<CHAT_ID>"

# Morning briefing at 8am
openclaw cron add \
  --name "morning-briefing" \
  --cron "0 8 * * *" \
  --tz "America/Chicago" \
  --session isolated \
  --message "Generate morning briefing per Wave skill instructions." \
  --announce --channel telegram --to "<CHAT_ID>"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill not loading | Check `openclaw logs` for errors. Verify SKILL.md exists. |
| "Missing LINKT_API_KEY" | Add key to openclaw.json or export as env var |
| `better-sqlite3` build fails | Install build-essential + python3, or use sql.js |
| Bot not responding | Check `openclaw channel status telegram` |
| Cron not running | Verify with `openclaw cron list --verbose` |
