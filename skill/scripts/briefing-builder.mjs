#!/usr/bin/env node
// briefing-builder.mjs - Aggregate 24h signals into structured briefing
// Usage: node briefing-builder.mjs --icp-id <id>

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'signal-radar.db');
const db = new Database(DB_PATH, { readonly: true });

const icpId = process.argv.find(a => a.startsWith('--icp-id'))?.split('=')[1]
  || process.argv[process.argv.indexOf('--icp-id') + 1];

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
const patterns = db.prepare(`
  SELECT entity_names, COUNT(*) as count,
    GROUP_CONCAT(DISTINCT signal_type) as types,
    GROUP_CONCAT(signal_id) as signal_ids
  FROM signals_seen
  WHERE icp_id = ? AND received_at >= datetime('now', '-7 days')
  GROUP BY entity_names
  HAVING count >= 2
  ORDER BY count DESC
`).all(icpId);

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
  patterns: patterns.map(p => ({
    entity: p.entity_names, count: p.count, types: p.types.split(','),
  })),
}));
