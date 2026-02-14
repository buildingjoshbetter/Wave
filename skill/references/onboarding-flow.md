# Onboarding Conversation Flow

## Overview
This document defines the exact conversation flow for new user onboarding.
The agent reads this during `/radar-setup` to guide the interaction.

## Step 1: Welcome
When user sends `/start` or their first message, respond with:

**Welcome to Wave**

I monitor companies, industries, and topics you care about -- then send
you only what matters, with deep analysis and context.

To get started, tell me about yourself in a few sentences:
- What companies do you follow?
- What industries interest you?
- What kind of signals matter to you?

Just type naturally. For example:

*"I run a B2B SaaS startup in the fintech space. I watch Stripe, Plaid,
and Square closely. I care about funding rounds, product launches, and
any regulatory changes in payments."*

## Step 2: Extract Profile
From the user's paragraph, extract:

| Field | How to Extract |
|-------|---------------|
| Companies | Proper nouns identified as company names |
| Industries | Industry descriptions mapped to categories |
| Signal Types | Map to: funding, product_launch, acquisition, leadership_change, hiring_surge, partnership, expansion, regulatory, pivot |
| Geographic Focus | Country/region references, normalize to standard names |
| Topic Criteria | Pass enriched natural language description to Linkt |

Minimum requirement: at least 1 company OR 1 specific industry.
If insufficient, ask for more detail (see edge cases below).

## Step 3: Confirm Profile
Show the extracted profile for confirmation:

**Got it. Here's what I extracted:**

**Companies:** [list]
**Industries:** [list]
**Signal Types:** [list]
**Topics:** [derived topics]

**Morning Briefing:** Daily at 8:00 AM (your timezone)

Does this look right?

Buttons: [ Looks good ] [ Edit ]

## Step 4: On Confirm
1. Call `linkt-client.mjs create-icp` with extracted data
2. Call `linkt-client.mjs create-task` with signal topic config
3. Call `linkt-client.mjs create-schedule` for polling
4. Store ICP ID, task ID, schedule ID in SQLite `user_profile` table
5. Also cache in session memory for fast access
6. Respond with confirmation + what to expect

## Step 5: On Edit
Ask "What would you like to change?" and loop back to Step 3.
Allow one edit cycle, then confirm.

## Edge Cases

### Too Little Info
If user says something vague like "I like tech":
Ask for specifics -- companies, industries, and why they track them.

### Too Much Info
Extract the monitorable items and ignore the rest.
Note: career background helps personalize analysis but doesn't change monitoring.

### Misspelled Companies
Suggest corrections: "Did you mean Stripe (payments company)?"
Offer buttons: [ Yes, Stripe ] [ No, something else ]

### Individuals Instead of Companies
Map to their companies: "I'll track Tesla, SpaceX, X Corp for Elon Musk"

### Non-English
Respond in English, acknowledge the language, ask for company names.
