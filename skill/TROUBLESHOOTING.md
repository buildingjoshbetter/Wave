# Wave Troubleshooting Guide

Read this file when a user reports issues or when a script returns an error.

## Quick Fix (Try This First)

Run the health check with auto-repair:
```
node {baseDir}/scripts/health-check.mjs --repair
```

Parse the JSON output. If `overall` is `"healthy"`, the issue is resolved.
If repairs were attempted, tell the user what was fixed.

## Common Symptoms

### "I'm not getting any signals"

**Possible causes (check in order):**

1. **No user profile** — Onboarding was never completed.
   - Diagnostic: `node {baseDir}/scripts/feedback-store.mjs get-profile`
   - If empty/error: Tell user to run "set up wave" to start onboarding.

2. **Dead ICP ID** — The ICP was deleted or rebuilt in Linkt.
   - Diagnostic: `node {baseDir}/scripts/health-check.mjs`
   - Look for `icp_valid: fail` in the output.
   - Fix: `node {baseDir}/scripts/health-check.mjs --repair` (auto-finds valid ICP).

3. **Missing API key** — `LINKT_API_KEY` not available.
   - Diagnostic: Check `icp_valid` or `api_key` in health check output.
   - Fix: Verify the key is set in `openclaw.json` under `skills.entries.wave.env`.

4. **No active schedule** — Signals are not being polled automatically.
   - Diagnostic: `node {baseDir}/scripts/linkt-client.mjs list-schedules --icp-id <id>`
   - Fix: Create a schedule during onboarding (step 7 of /radar-setup).

5. **Signals exist but scored too low** — All signals fell below the 0.5 threshold.
   - Diagnostic: `node {baseDir}/scripts/briefing-builder.mjs`
   - Check `filtered_out` count. If high, signals exist but were filtered.
   - Fix: Adjust user interests or lower threshold in feedback patterns.

### "signal-poll returns 0 new signals"

1. **Signals already seen** — Dedup is working correctly, all signals were previously stored.
   - Diagnostic: Check `total_fetched` vs `new_signals` in the output.
   - If `total_fetched > 0` but `new_signals = 0`, all signals were already in SQLite.

2. **ICP has no signals** — Linkt hasn't generated signals for this profile yet.
   - Diagnostic: `node {baseDir}/scripts/linkt-client.mjs list-signals --icp-id <id> --since 7d`
   - If empty: The task may need more time, or the ICP criteria are too narrow.
   - Fix: Check task status with `node {baseDir}/scripts/linkt-client.mjs get-task --task-id <id>`

3. **Wrong ICP in profile** — Profile points to an ICP that has no data.
   - Fix: `node {baseDir}/scripts/health-check.mjs --repair`

### "linkt_fetch_failed" error

1. **Invalid API key** — Key is wrong, expired, or not set.
   - Fix: Get a valid key from https://app.linkt.ai/settings/api-keys
   - Set it in openclaw.json: `skills.entries.wave.env.LINKT_API_KEY`

2. **ICP ID is invalid** — The ICP was deleted from Linkt.
   - Fix: `node {baseDir}/scripts/health-check.mjs --repair`

3. **Network error** — Linkt API is temporarily unreachable.
   - Tell user: "Signal check temporarily unavailable. I'll retry shortly."

### "profile_read_failed" or "no_icp_id" error

The SQLite database is missing or corrupt, or onboarding was never completed.

1. Check if database exists: Look for `{baseDir}/data/wave.db`
2. If missing: `node {baseDir}/scripts/feedback-store.mjs init`
3. If exists but no profile: User needs to complete onboarding ("set up wave").

### "Cron is running but nothing happens"

1. **Stale ICP in cron message** — Old cron messages had hardcoded ICP IDs that no longer exist.
   - Fix: Cron messages should NOT contain ICP IDs. Scripts auto-resolve from SQLite.
   - Correct cron message: `"Execute: node scripts/signal-poll.mjs --since 30m"`
   - The script reads ICP from SQLite `user_profile` table automatically.

2. **Cron fires in isolated sessions** — Cron sessions cannot access previous session memory.
   - This is why all persistent data MUST be in SQLite, not session memory.
   - Verify profile is saved: `node {baseDir}/scripts/feedback-store.mjs get-profile`

## Diagnostic Commands Reference

| Command | Purpose |
|---------|---------|
| `node {baseDir}/scripts/health-check.mjs` | Full pipeline validation (report only) |
| `node {baseDir}/scripts/health-check.mjs --repair` | Validate and auto-fix issues |
| `node {baseDir}/scripts/feedback-store.mjs get-profile` | Read saved user profile from SQLite |
| `node {baseDir}/scripts/feedback-store.mjs init` | Initialize SQLite database |
| `node {baseDir}/scripts/signal-poll.mjs --since 1d` | Poll for signals (auto-reads ICP from SQLite) |
| `node {baseDir}/scripts/briefing-builder.mjs` | Build briefing (auto-reads ICP from SQLite) |
| `node {baseDir}/scripts/linkt-client.mjs list-icps` | List all ICPs in the Linkt account |
| `node {baseDir}/scripts/linkt-client.mjs list-signals --icp-id <id> --since 7d` | Check if signals exist in Linkt |
| `node {baseDir}/scripts/linkt-client.mjs get-task --task-id <id>` | Check task status |
| `node {baseDir}/scripts/linkt-client.mjs list-schedules --icp-id <id>` | Check active schedules |
| `node {baseDir}/scripts/feedback-store.mjs stats` | Signal accuracy statistics |

## Self-Healing Architecture

Wave scripts are designed to self-heal:

1. **Auto-resolve ICP**: `signal-poll.mjs` and `briefing-builder.mjs` read ICP from SQLite when not provided as a CLI argument. Cron jobs never need hardcoded IDs.

2. **Health check with repair**: `health-check.mjs --repair` validates the entire pipeline and fixes what it can — finds valid ICPs, initializes missing databases, updates stale profile data.

3. **Structured error output**: All scripts output JSON with `error`, `message`, and `resolution` fields. Parse these to give the user actionable guidance.

4. **Graceful degradation**: If one check fails, the health check continues with remaining checks and reports all issues at once.
