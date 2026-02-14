# Signal Chain Reaction - Deep Dive Protocol

## Overview
When a user requests "Tell Me More" on a signal, follow this protocol
to produce a comprehensive analysis.

## Step 1: Check Cache
Before launching browser automation, check for cached responses:
- Look in `{baseDir}/data/demo-cache/dive_{signal_id}.json`
- If cache hit exists, return it directly (used for demo reliability)
- If no cache, proceed with live research

## Step 2: Source Analysis
For each URL in signal.references_json:
1. Use browser tool: `{ action: "open", url: "<reference_url>" }`
2. Use browser tool: `{ action: "snapshot", mode: "aria" }`
3. Extract: headline, date, author, key facts, quoted figures
4. If the page is paywalled or blocked, note it and skip

## Step 3: Company Research
If the entity is a company:
1. Visit `https://<company>.com/careers` -- count open positions,
   note departments hiring heavily
2. Visit `https://github.com/<company>` -- check recent repo activity,
   new public projects, contributor count
3. Optional: Visit LinkedIn company page (skip if login wall appears)

## Step 4: Cross-Reference
1. Compare findings with user's profile (from session memory or SQLite)
2. Identify: direct competitive threats, partnership opportunities, market shifts
3. Check `signals_seen` DB for recent signals about the same entity

## Step 5: Synthesize
Produce a 500-800 word analysis covering:
- **WHAT HAPPENED** (facts from sources)
- **WHY IT MATTERS** (market context)
- **WHAT IT MEANS FOR YOU** (personalized to user's interests)
- **CONFIDENCE**: High/Medium/Low based on source quality and corroboration
- **RECOMMENDED ACTION**: One specific next step

## Formatting
- Use Markdown for Telegram: **bold**, *italic*, [links](url)
- Do NOT use HTML tags (<b>, <i>, <a>) — they render as raw text in OpenClaw
- Include source links at the bottom
- Add buttons: [ Save this ] [ Rate 1-10 ]

## Failure Handling
- If browser returns error or shows login/paywall: note the limitation,
  move to next source
- If all sources fail: provide analysis from signal data alone with
  a Google News search link as fallback
- Never retry a blocked URL repeatedly
- Partial information with clear caveats is better than no response

## URL Safety
- Only visit URLs with `https://` protocol
- Never visit `file://`, `javascript:`, `data:` URLs
- Never visit private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Space requests 2-3 seconds apart
- Limit to 5 URLs per deep dive
