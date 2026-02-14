# Configuration Reference

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKT_API_KEY` | Yes | Your Linkt.ai API key (starts with `sk-`) |
| `SIGNAL_RADAR_WEBHOOK_URL` | No | Webhook URL for future real-time delivery |

## OpenClaw Config (`openclaw.json`)

```json
{
  "skills": {
    "entries": {
      "signal-radar": {
        "enabled": true,
        "env": {
          "LINKT_API_KEY": "sk-your-key"
        }
      }
    }
  }
}
```

## Signal Evaluation Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| Forward immediately | >= 0.8 | Send to user with context |
| War room trigger | >= 0.85 | Spawn 3-agent debate |
| Investigate | 0.5 - 0.8 | Check feedback history first |
| Filter out | < 0.5 | Hold for briefing only |

Thresholds adjust automatically based on user feedback.

## Notification Timing

| Setting | Default | Description |
|---------|---------|-------------|
| Poll interval | 30 minutes | How often to check Linkt for new signals |
| Morning briefing | 8:00 AM | Daily intelligence synthesis |
| Quiet hours start | 10:00 PM | Stop sending notifications |
| Quiet hours end | 7:00 AM | Resume notifications |
| Min gap between signals | 5 minutes | Debounce for rapid signals |
| Daily notification limit | 15 | Max individual notifications per day |

## SQLite Database

Location: `~/.openclaw/skills/signal-radar/data/signal-radar.db`

Tables:
- `signals_seen` -- All received signals with dedup
- `feedback` -- User feedback (positive/negative/save)
- `user_profile` -- Single-row user configuration
- `signal_patterns` -- Detected signal clusters

## Customization

All customization happens via natural language:
- "stop sending me [type]" -- Mute a signal type
- "change briefing time to 7am" -- Adjust briefing schedule
- "disable quiet hours" -- Send signals 24/7
- "add [company] to my watchlist" -- Expand monitoring
