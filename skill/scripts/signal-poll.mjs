#!/usr/bin/env node
// signal-poll.mjs - Poll Linkt for new signals, dedup against SQLite, output JSON
// Usage: node signal-poll.mjs --icp-id <id> --since <duration>

import { execFileSync } from 'child_process';
import { mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'wave.db');
mkdirSync(dirname(DB_PATH), { recursive: true });
const LINKT_CLIENT = join(__dirname, 'linkt-client.mjs');

const args = {};
const rawArgs = process.argv.slice(2);
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[i + 1] : 'true';
    args[key] = val;
    if (val !== 'true') i++;
  }
}

let icpId = args['icp-id'];
const since = args['since'] || '1d';

if (!icpId) {
  // Auto-resolve from SQLite user_profile
  try {
    const profileDb = new Database(DB_PATH, { readonly: true });
    const profile = profileDb.prepare('SELECT icp_id FROM user_profile WHERE id = 1').get();
    profileDb.close();
    if (profile && profile.icp_id) {
      icpId = profile.icp_id;
    } else {
      console.error(JSON.stringify({
        error: 'no_icp_id',
        message: 'No --icp-id provided and no profile found in SQLite. Run onboarding first.',
        resolution: 'Tell the user to run: set up wave'
      }));
      process.exit(1);
    }
  } catch (err) {
    console.error(JSON.stringify({
      error: 'profile_read_failed',
      message: `Could not read user profile: ${err.message}`,
      resolution: 'Check that wave.db exists and is not corrupted'
    }));
    process.exit(1);
  }
}

// 1. Fetch signals from Linkt
let linktResult;
try {
  const output = execFileSync('node', [LINKT_CLIENT, 'list-signals', '--icp-id', icpId, '--since', since], {
    encoding: 'utf-8',
    timeout: 60_000,
    env: process.env,
  });
  linktResult = JSON.parse(output);
} catch (err) {
  console.error(JSON.stringify({ error: 'linkt_fetch_failed', details: err.message }));
  process.exit(1);
}

// 2. Dedup against SQLite
const db = new Database(DB_PATH, { readonly: false });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

const checkStmt = db.prepare('SELECT signal_id FROM signals_seen WHERE signal_id = ?');
const insertStmt = db.prepare(`INSERT OR IGNORE INTO signals_seen
  (signal_id, icp_id, signal_type, entity_ids, entity_names, summary, linkt_score, strength, references_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const newSignals = [];
const insertBatch = db.transaction((signals) => {
  for (const s of signals) {
    const existing = checkStmt.get(s.id);
    if (!existing) {
      insertStmt.run(s.id, icpId, s.signal_type, JSON.stringify(s.entity_ids || []),
        JSON.stringify(s.entity_names || []), s.summary, s.score || 0, s.strength,
        JSON.stringify(s.references || []), s.created_at);
      newSignals.push(s);
    }
  }
});

insertBatch(linktResult.signals || []);

console.log(JSON.stringify({
  total_fetched: (linktResult.signals || []).length,
  new_signals: newSignals.length,
  signals: newSignals,
}));
