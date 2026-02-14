#!/usr/bin/env node
// feedback-store.mjs - SQLite operations for Signal Radar
// Commands: init, record, record-seen, check-relevance, stats, patterns

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'signal-radar.db');

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// ── Schema Init ──────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS signals_seen (
    signal_id TEXT PRIMARY KEY, icp_id TEXT NOT NULL, signal_type TEXT NOT NULL,
    entity_ids TEXT DEFAULT '[]', entity_names TEXT DEFAULT '[]', summary TEXT,
    linkt_score REAL NOT NULL DEFAULT 0.0, our_score REAL, strength TEXT,
    references_json TEXT DEFAULT '[]', status TEXT DEFAULT 'new',
    sent_at TEXT, created_at TEXT NOT NULL,
    received_at TEXT DEFAULT (datetime('now')), briefing_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_ss_icp ON signals_seen(icp_id);
CREATE INDEX IF NOT EXISTS idx_ss_status ON signals_seen(status);
CREATE INDEX IF NOT EXISTS idx_ss_created ON signals_seen(created_at);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT, signal_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL, signal_type TEXT, entity_names TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fb_type ON feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_fb_stype ON feedback(signal_type);

CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1), telegram_chat_id TEXT,
    icp_id TEXT, task_id TEXT, schedule_id TEXT,
    interests_raw TEXT, interests_json TEXT,
    negative_filters TEXT DEFAULT '[]',
    quiet_hours_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS signal_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL, signal_ids TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5, interpretation TEXT,
    first_signal_at TEXT NOT NULL, last_signal_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
`;

db.exec(SCHEMA);

// ── Shared Utility ───────────────────────────────────────────────
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Commands ─────────────────────────────────────────────────────
const commands = {
  init() {
    console.log(JSON.stringify({ status: 'ok', db: DB_PATH }));
  },

  record(args) {
    const signalId = args['signal-id'];
    const feedbackType = args['feedback'];
    const signal = db.prepare('SELECT signal_type, entity_names FROM signals_seen WHERE signal_id = ?').get(signalId);
    db.prepare('INSERT INTO feedback (signal_id, feedback_type, signal_type, entity_names) VALUES (?, ?, ?, ?)')
      .run(signalId, feedbackType, signal?.signal_type, signal?.entity_names);
    console.log(JSON.stringify({ status: 'recorded', signal_id: signalId, feedback: feedbackType }));
  },

  'record-seen'(args) {
    const data = JSON.parse(args['data']);
    const stmt = db.prepare(`INSERT OR IGNORE INTO signals_seen
      (signal_id, icp_id, signal_type, entity_ids, entity_names, summary, linkt_score, strength, references_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insert = db.transaction((signals) => {
      for (const s of (Array.isArray(data) ? data : [data])) {
        stmt.run(s.id, s.icp_id, s.signal_type, JSON.stringify(s.entity_ids || []),
          JSON.stringify(s.entity_names || []), s.summary, s.score || 0, s.strength,
          JSON.stringify(s.references || []), s.created_at);
      }
    });
    insert(Array.isArray(data) ? data : [data]);
    console.log(JSON.stringify({ status: 'ok', count: Array.isArray(data) ? data.length : 1 }));
  },

  'check-relevance'(args) {
    const signalType = args['signal-type'];
    const entity = args['entity'] || '';
    const typeStats = db.prepare(
      `SELECT feedback_type, COUNT(*) as c FROM feedback WHERE signal_type = ? GROUP BY feedback_type`
    ).all(signalType);
    const pos = typeStats.find(s => s.feedback_type === 'positive')?.c || 0;
    const neg = typeStats.find(s => s.feedback_type === 'negative')?.c || 0;
    const total = pos + neg;
    let relevance = total === 0 ? 0.5 : pos / total;

    if (entity) {
      const eStats = db.prepare(
        `SELECT feedback_type, COUNT(*) as c FROM feedback WHERE entity_names LIKE ? GROUP BY feedback_type`
      ).all(`%${entity}%`);
      const ePos = eStats.find(s => s.feedback_type === 'positive')?.c || 0;
      const eNeg = eStats.find(s => s.feedback_type === 'negative')?.c || 0;
      const eTotal = ePos + eNeg;
      if (eTotal > 0) {
        relevance = relevance * 0.4 + (ePos / eTotal) * 0.6;
      }
    }
    console.log(JSON.stringify({ relevance: Math.round(relevance * 100) / 100, feedback_count: total }));
  },

  stats() {
    const total = db.prepare('SELECT COUNT(*) as c FROM signals_seen').get().c;
    const sent = db.prepare("SELECT COUNT(*) as c FROM signals_seen WHERE status = 'sent'").get().c;
    const fbStats = db.prepare('SELECT feedback_type, COUNT(*) as c FROM feedback GROUP BY feedback_type').all();
    const topTypes = db.prepare(`
      SELECT signal_type, COUNT(*) as c FROM feedback WHERE feedback_type = 'positive'
      GROUP BY signal_type ORDER BY c DESC LIMIT 5
    `).all();
    console.log(JSON.stringify({ total_signals: total, sent_to_user: sent, feedback: fbStats, top_positive_types: topTypes }));
  },

  patterns() {
    const patterns = db.prepare(`
      SELECT entity_names, COUNT(*) as count, GROUP_CONCAT(DISTINCT signal_type) as types,
        GROUP_CONCAT(signal_id) as ids, MIN(created_at) as first, MAX(created_at) as last
      FROM signals_seen WHERE received_at >= datetime('now', '-7 days')
      GROUP BY entity_names HAVING count >= 2 ORDER BY count DESC
    `).all();
    console.log(JSON.stringify(patterns.map(p => ({
      entity: p.entity_names, count: p.count, types: p.types.split(','),
      signal_ids: p.ids.split(','), first_at: p.first, last_at: p.last,
    }))));
  },
};

// ── Dispatch ─────────────────────────────────────────────────────
const cmd = process.argv[2];
if (!commands[cmd]) {
  console.error(JSON.stringify({ error: `Unknown: ${cmd}`, available: Object.keys(commands) }));
  process.exit(1);
}
const rawArgs = process.argv.slice(3);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[i + 1] : 'true';
    args[key] = val;
    if (val !== 'true') i++;
  }
}
commands[cmd](args);
