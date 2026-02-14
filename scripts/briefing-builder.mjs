#!/usr/bin/env node
// briefing-builder.mjs - Aggregate 24h signals into structured briefing
// Usage: node briefing-builder.mjs --icp-id <id>

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'wave.db');
const db = new Database(DB_PATH, { readonly: true });

const icpIdIdx = process.argv.indexOf('--icp-id');
let icpId = process.argv.find(a => a.startsWith('--icp-id='))?.split('=')[1]
  || (icpIdIdx !== -1 ? process.argv[icpIdIdx + 1] : undefined);

if (!icpId) {
  // Auto-resolve from SQLite user_profile
  try {
    const profile = db.prepare('SELECT icp_id FROM user_profile WHERE id = 1').get();
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
      message: `Could not read user profile: ${err.message}`
    }));
    process.exit(1);
  }
}

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// Fetch all signals from last 24 hours
const signals = db.prepare(`
  SELECT * FROM signals_seen
  WHERE icp_id = ? AND received_at >= ?
  ORDER BY COALESCE(our_score, linkt_score) DESC
`).all(icpId, since);

// Categorize
const high = signals.filter(s => (s.our_score || s.linkt_score) >= 0.8);
const worth = signals.filter(s => {
  const score = s.our_score || s.linkt_score;
  return score >= 0.5 && score < 0.8;
});
const filtered = signals.filter(s => (s.our_score || s.linkt_score) < 0.5);

// Detect patterns (2+ signals about same entity in 7 days)
// Group by individual entity in JS since SQLite lacks JSON array unnesting
const patternRows = db.prepare(`
  SELECT signal_id, entity_names, signal_type
  FROM signals_seen
  WHERE icp_id = ? AND received_at >= datetime('now', '-7 days')
`).all(icpId);

const entityMap = {};
for (const row of patternRows) {
  let names;
  try { names = JSON.parse(row.entity_names || '[]'); } catch { names = []; }
  for (const name of names) {
    if (!entityMap[name]) entityMap[name] = { types: new Set(), count: 0 };
    entityMap[name].types.add(row.signal_type);
    entityMap[name].count++;
  }
}
const patterns = Object.entries(entityMap)
  .filter(([, v]) => v.count >= 2)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([entity, v]) => ({ entity, count: v.count, types: [...v.types] }));

console.log(JSON.stringify({
  date: new Date().toISOString().split('T')[0],
  total: signals.length,
  high_priority: high.map(s => ({
    id: s.signal_id, type: s.signal_type, summary: s.summary,
    score: s.our_score || s.linkt_score, entities: JSON.parse(s.entity_names || '[]'),
  })),
  worth_knowing: worth.map(s => ({
    id: s.signal_id, type: s.signal_type, summary: s.summary,
    score: s.our_score || s.linkt_score, entities: JSON.parse(s.entity_names || '[]'),
  })),
  filtered_out: filtered.length,
  filtered_sample: filtered.slice(0, 5).map(s => ({
    type: s.signal_type, summary: (s.summary || '').slice(0, 80),
  })),
  patterns,
}));
