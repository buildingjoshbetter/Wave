<p align="center">
  <img src="assets/wave-logo.svg" alt="Wave" width="120" />
</p>

<h1 align="center">Wave</h1>

<p align="center">
  <strong>Your personal intelligence agent.</strong><br>
  Real signals. Zero noise.
</p>

<p align="center">
  <a href="#installation">Install</a> · <a href="#what-it-does">What It Does</a> · <a href="#why">Why</a> · <a href="#demo">Demo</a>
</p>

---

## What It Does

Wave is an [OpenClaw](https://openclaw.ai) skill that monitors the companies, industries, and topics you care about -- and only texts you when something actually matters.

No app to download. No dashboard to check. Just a Telegram chat with an AI analyst that learns what you care about and gets smarter every day.

You describe your world in plain English. Wave monitors it 24/7 via [Linkt.ai](https://linkt.ai)'s signal engine. When something happens that matters to *you* -- a competitor launches a product, a company you're watching starts hiring aggressively, a regulatory change hits your industry -- Wave doesn't just forward a headline. It investigates, analyzes, and tells you *why it matters to your specific situation*.

### Features

- **Chain reactions** -- When a signal arrives, Wave doesn't stop at the headline. It visits the source, checks careers pages, scans GitHub repos, cross-references with your profile, and delivers a 500-800 word competitive intelligence brief. Automatically.
- **Pattern detection** -- Connects signals across days and weeks. "4 signals about Anthropic in 10 days: office lease + hiring surge + partnership + more hiring = major expansion incoming." You'd never catch that manually.
- **War room** -- Three AI agents debate high-impact signals from different angles. Analyst (factual), Skeptic (counterarguments), Strategist (what it means for *your* business). Real multi-agent consensus, not a single opinion.
- **Morning briefing** -- One daily synthesis instead of 15 individual pings. HIGH PRIORITY, WORTH KNOWING, and FILTERED OUT. Reply with a number for a deep dive on any item.
- **Natural refinement** -- "Stop sending me patent filings." "Add Linear to my watchlist." "How's my accuracy?" Just talk to it.
- **Learns from feedback** -- Every thumbs up or thumbs down adjusts the relevance model. It gets better the more you use it.
- **17+ signal types** -- Funding rounds, product launches, acquisitions, leadership changes, hiring surges, partnerships, regulatory changes, expansions, patents, and more.

## Installation

### Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- Telegram bot set up in OpenClaw (create one via [@BotFather](https://t.me/BotFather))
- [Linkt.ai](https://app.linkt.ai) API key (free tier available)

### Install from ClawHub

```bash
clawhub install signal-radar
```

### Manual Installation

1. Clone this repo:
```bash
git clone https://github.com/buildingjoshbetter/wave.git
```

2. Copy the skill into OpenClaw:
```bash
cp -r wave/skill ~/.openclaw/skills/signal-radar
cd ~/.openclaw/skills/signal-radar && npm install
```

3. Add your API key to `~/.openclaw/openclaw.json`:
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

4. Restart OpenClaw:
```bash
openclaw gateway restart
```

5. Open Telegram. Message your bot: "Set up my signal radar."

That's it. You're live.

## Demo

Tell Wave about yourself. It handles the rest.

```
You: I'm building a dev tools startup in Austin. I watch Cursor, Replit,
     and Anthropic closely. I care about product launches, funding,
     acquisitions, and anything in the AI coding space.

Wave: Got it. Here's what I extracted:

      Companies: Cursor, Replit, Anthropic
      Industries: Developer Tools, AI/ML
      Signal Types: product_launch, funding, acquisition, hiring_surge, partnership
      Focus: AI coding tools, Austin TX

      Does this look right?

      [ Looks good ]  [ Edit ]
```

Then signals start flowing:

```
Wave: SIGNAL: Cursor announces Enterprise tier
      Score: 82% | Type: product_launch

      Cursor just launched an enterprise offering with SOC2, SSO, and
      private cloud deployment. This directly targets the regulated
      industries (fintech, healthcare) that have been slow to adopt
      AI coding tools -- the same segment your startup competes in.

      [ Tell Me More ]  [ Not Relevant ]  [ Save ]
```

Ask for more and Wave goes deep:

```
You: [taps Tell Me More]

Wave: DEEP DIVE: Cursor Enterprise

      WHAT HAPPENED: Cursor launched enterprise features including...
      WHY IT MATTERS: The enterprise push signals Cursor is moving
      upmarket, directly into territory where...
      WHAT IT MEANS FOR YOU: As a dev tools startup, this narrows
      your window to...

      Confidence: HIGH (3 corroborating sources)
      Recommended action: Accelerate your enterprise roadmap.

      [ Save this ]  [ Rate 1-10 ]
```

High-impact signals trigger the war room:

```
Wave: WAR ROOM: OpenAI acquires Windsurf for $3B

      Analyst: Factual assessment -- $3B for 15M users represents...
      Skeptic: This could be defensive -- OpenAI's core business...
      Strategist: For YOUR startup, this means the IDE layer is
      consolidating fast. Your window to build is...

      Consensus: 3/3 agree this reshapes the competitive landscape.
      Final Score: 95% - CRITICAL
      Bottom Line: This changes your competitive map. Act this week.
```

## Why

I was spending 2 hours a day manually checking competitors.

Twitter. TechCrunch. LinkedIn. Hacker News. SEC filings. Job boards. GitHub trending. Product Hunt. Every morning, the same circuit. Most days, nothing relevant. But you can't *not* check, because the one day you skip is the day your competitor announces exactly the thing you were about to build.

The information is out there. It's just scattered across 50 sources, buried under noise, and completely undifferentiated. A funding round for a biotech startup and a funding round for your direct competitor look the same in a news feed. But one is noise and the other is a five-alarm fire.

I wanted an agent that understood *my* specific world -- my competitors, my industry, my interests -- and could filter the entire internet down to the 3-5 things I actually need to know today. Not a dashboard I have to check. Not a newsletter I have to read. Just a Telegram message that says "hey, this happened, here's why you should care, and here's what I'd do about it."

Wave is that agent. It monitors everything, filters aggressively, investigates automatically, and gets smarter the more you use it. The AI doesn't just forward -- it *analyzes*. It connects patterns across days and weeks that a human would miss. It debates high-impact signals from multiple angles before giving you a recommendation.

350 lines of code. 24 hours to build. One Telegram chat that watches your world for you.

## Built By

**[@Building_Josh](https://twitter.com/Building_Josh)**

Built at the AITX Hackathon because competitive intelligence shouldn't require a Bloomberg terminal.

## License

[MIT](LICENSE) -- Intelligence should be accessible to everyone.

---

<p align="center">
  <em>"The information is out there. You just need someone watching."</em>
</p>

<p align="center">
  <img src="assets/wave-logo.svg" alt="Wave" width="40" />
</p>
