#!/usr/bin/env node
// demo-mode.mjs - Self-contained demo signal injector for Wave
// Usage: node demo-mode.mjs --step <N>
// Steps: 0=reset+seed-all, 1=briefing-trigger, 2=chain, 3=pattern, 4=warroom

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'wave.db');

// ── Argv Parsing ─────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[i + 1] : 'true';
    args[key] = val;
    if (val !== 'true') i++;
  }
}

// ── Embedded Demo Signals ────────────────────────────────────────────

const SEED_SIGNALS = [
  {
    signal_id: 'sig_seed_001', icp_id: 'demo', signal_type: 'expansion',
    entity_ids: '["ent_anthropic"]', entity_names: '["Anthropic"]',
    summary: 'Anthropic signs 50,000 sq ft office lease in downtown Austin',
    linkt_score: 0.72, strength: 'medium',
    references_json: '["https://example.com/anthropic-austin"]',
    status: 'sent', days_ago: 6,
  },
  {
    signal_id: 'sig_seed_002', icp_id: 'demo', signal_type: 'hiring_surge',
    entity_ids: '["ent_anthropic"]', entity_names: '["Anthropic"]',
    summary: 'Anthropic posts 30+ engineering roles with Austin, TX location',
    linkt_score: 0.68, strength: 'medium',
    references_json: '["https://example.com/anthropic-hiring"]',
    status: 'sent', days_ago: 5,
  },
  {
    signal_id: 'sig_seed_003', icp_id: 'demo', signal_type: 'partnership',
    entity_ids: '["ent_anthropic"]', entity_names: '["Anthropic"]',
    summary: 'Anthropic partners with Oracle for dedicated cloud infrastructure',
    linkt_score: 0.75, strength: 'medium',
    references_json: '["https://example.com/anthropic-oracle"]',
    status: 'sent', days_ago: 3,
  },
];

const CHAIN_SIGNAL = {
  signal_id: 'sig_demo_chain_001', icp_id: 'demo', signal_type: 'product_launch',
  entity_ids: '["ent_cursor"]', entity_names: '["Cursor"]',
  summary: 'Cursor announces Cursor for Enterprise with SOC2 compliance, SSO, and private cloud deployment options. Targets regulated industries including fintech and healthcare.',
  linkt_score: 0.82, strength: 'high',
  references_json: '["https://cursor.com/blog/enterprise"]',
};

const PATTERN_SIGNAL = {
  signal_id: 'sig_demo_pattern_001', icp_id: 'demo', signal_type: 'hiring_surge',
  entity_ids: '["ent_anthropic"]', entity_names: '["Anthropic"]',
  summary: 'Anthropic posts 15 new infrastructure engineer roles in Austin, TX. Focus areas include distributed systems, GPU cluster management, and data center operations.',
  linkt_score: 0.71, strength: 'medium',
  references_json: '["https://anthropic.com/careers"]',
};

const WARROOM_SIGNAL = {
  signal_id: 'sig_demo_warroom_001', icp_id: 'demo', signal_type: 'acquisition',
  entity_ids: '["ent_openai", "ent_windsurf"]', entity_names: '["OpenAI", "Windsurf"]',
  summary: 'OpenAI acquires Windsurf (Codeium) for $3B, signaling aggressive move into developer tools market. Deal includes Windsurf\'s 15M user base and enterprise code completion platform.',
  linkt_score: 0.95, strength: 'high',
  references_json: '["https://bloomberg.com/news/openai-windsurf-acquisition"]',
};

const BRIEFING_WORTH = [
  {
    signal_id: 'sig_demo_wk_001', icp_id: 'demo', signal_type: 'partnership',
    entity_ids: '["ent_mistral", "ent_sap"]', entity_names: '["Mistral", "SAP"]',
    summary: 'Mistral partners with SAP for enterprise AI integration',
    linkt_score: 0.71, strength: 'medium',
    references_json: '[]', status: 'held',
  },
  {
    signal_id: 'sig_demo_wk_002', icp_id: 'demo', signal_type: 'hiring_surge',
    entity_ids: '["ent_deepmind"]', entity_names: '["Google DeepMind"]',
    summary: 'Google DeepMind posts 30+ research roles across US offices',
    linkt_score: 0.65, strength: 'medium',
    references_json: '[]', status: 'held',
  },
  {
    signal_id: 'sig_demo_wk_003', icp_id: 'demo', signal_type: 'funding',
    entity_ids: '["ent_replit"]', entity_names: '["Replit"]',
    summary: 'Replit raises $50M extension at $1.5B valuation',
    linkt_score: 0.62, strength: 'medium',
    references_json: '[]', status: 'held',
  },
];

const BRIEFING_FILTERED = [
  {
    signal_id: 'sig_demo_filt_001', icp_id: 'demo', signal_type: 'patent',
    entity_ids: '["ent_ibm"]', entity_names: '["IBM"]',
    summary: 'IBM files patent for quantum-resistant encryption method',
    linkt_score: 0.35, strength: 'low',
    references_json: '[]', status: 'filtered',
  },
  {
    signal_id: 'sig_demo_filt_002', icp_id: 'demo', signal_type: 'leadership_change',
    entity_ids: '["ent_salesforce"]', entity_names: '["Salesforce"]',
    summary: 'Salesforce appoints new VP of APAC sales',
    linkt_score: 0.28, strength: 'low',
    references_json: '[]', status: 'filtered',
  },
  {
    signal_id: 'sig_demo_filt_003', icp_id: 'demo', signal_type: 'regulatory',
    entity_ids: '["ent_eu"]', entity_names: '["EU Commission"]',
    summary: 'EU proposes updated digital services tax framework',
    linkt_score: 0.42, strength: 'low',
    references_json: '[]', status: 'filtered',
  },
];

// ── DB Helpers ───────────────────────────────────────────────────────

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function insertSignal(db, s, daysAgo) {
  const createdAt = daysAgo
    ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    : new Date().toISOString();
  const receivedAt = createdAt;
  db.prepare(`INSERT OR REPLACE INTO signals_seen
    (signal_id, icp_id, signal_type, entity_ids, entity_names, summary,
     linkt_score, strength, references_json, status, created_at, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(s.signal_id, s.icp_id, s.signal_type, s.entity_ids, s.entity_names,
      s.summary, s.linkt_score, s.strength, s.references_json,
      s.status || 'new', createdAt, receivedAt);
}

// ── Steps ────────────────────────────────────────────────────────────
// New order: 0=reset+seed-all → 1=briefing → 2=signal alert → 3=pattern → 4=warroom

const steps = {
  // Step 0: Clean slate + seed ALL demo data upfront
  // Seeds: background Anthropic signals (for pattern detection later),
  //        briefing-worth signals, briefing-filtered signals
  0() {
    const db = openDb();

    // Recovery: if a previous demo crashed between steps, restore the backed-up profile first
    try {
      const hasBackup = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_demo_profile_backup'").get();
      if (hasBackup) {
        const backup = db.prepare('SELECT data FROM _demo_profile_backup LIMIT 1').get();
        if (backup && backup.data) {
          const p = JSON.parse(backup.data);
          db.prepare(`UPDATE user_profile SET
            icp_id = ?, task_id = ?, schedule_id = ?,
            interests_raw = ?, interests_json = ?,
            user_name = ?, user_location = ?, user_timezone = ?,
            negative_filters = ?, quiet_hours_enabled = ?,
            telegram_chat_id = ?, updated_at = datetime('now')
            WHERE id = 1`).run(
            p.icp_id, p.task_id, p.schedule_id,
            p.interests_raw, p.interests_json,
            p.user_name, p.user_location, p.user_timezone,
            p.negative_filters, p.quiet_hours_enabled,
            p.telegram_chat_id
          );
          db.prepare('DROP TABLE IF EXISTS _demo_profile_backup').run();
        }
      }
    } catch (_) { /* no backup to restore */ }

    db.prepare("DELETE FROM signals_seen WHERE signal_id LIKE 'sig_demo_%' OR signal_id LIKE 'sig_seed_%'").run();
    db.prepare("DELETE FROM feedback WHERE signal_id LIKE 'sig_demo_%' OR signal_id LIKE 'sig_seed_%'").run();

    // Seed background Anthropic signals (for pattern detection in step 3)
    for (const s of SEED_SIGNALS) {
      insertSignal(db, s, s.days_ago);
    }

    // Seed briefing signals upfront (for morning briefing in step 1)
    for (const s of BRIEFING_WORTH) insertSignal(db, s);
    for (const s of BRIEFING_FILTERED) insertSignal(db, s);

    // Back up real profile before overwriting with demo ICP
    const existingProfile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    db.prepare('CREATE TABLE IF NOT EXISTS _demo_profile_backup (data TEXT)').run();
    db.prepare('DELETE FROM _demo_profile_backup').run();
    if (existingProfile) {
      db.prepare('INSERT INTO _demo_profile_backup (data) VALUES (?)').run(JSON.stringify(existingProfile));
      db.prepare(`UPDATE user_profile SET icp_id = 'demo' WHERE id = 1`).run();
    } else {
      db.prepare(`INSERT OR REPLACE INTO user_profile (id, icp_id, quiet_hours_enabled)
        VALUES (1, 'demo', 0)`).run();
    }

    db.close();
    console.log(JSON.stringify({
      step: 0, action: 'reset_and_seed_all',
      seeded_background: SEED_SIGNALS.length,
      seeded_briefing_worth: BRIEFING_WORTH.length,
      seeded_briefing_filtered: BRIEFING_FILTERED.length,
      message: 'Demo environment ready. All signals seeded.',
    }));
  },

  // Step 1: Trigger morning briefing (data already seeded in step 0)
  1() {
    console.log(JSON.stringify({
      step: 1, action: 'trigger_briefing',
      message: 'Briefing data ready. Run briefing-builder.mjs --icp-id demo to generate the morning briefing.',
    }));
  },

  // Step 2: Real-time signal alert — Cursor Enterprise (score 0.82)
  2() {
    const db = openDb();
    insertSignal(db, CHAIN_SIGNAL);
    db.close();
    console.log(JSON.stringify({
      step: 2, action: 'inject_signal',
      signal_id: CHAIN_SIGNAL.signal_id,
      signal_type: CHAIN_SIGNAL.signal_type,
      score: CHAIN_SIGNAL.linkt_score,
      entity: 'Cursor',
      summary: CHAIN_SIGNAL.summary,
    }));
  },

  // Step 3: Pattern detection — Anthropic hiring (score 0.71) + pattern query
  3() {
    const db = openDb();
    insertSignal(db, PATTERN_SIGNAL);

    const pattern = db.prepare(`
      SELECT entity_names, COUNT(*) as count, GROUP_CONCAT(DISTINCT signal_type) as types
      FROM signals_seen
      WHERE icp_id = 'demo' AND entity_names LIKE '%Anthropic%'
        AND received_at >= datetime('now', '-7 days')
      GROUP BY entity_names
    `).get();

    db.close();
    console.log(JSON.stringify({
      step: 3, action: 'inject_signal',
      signal_id: PATTERN_SIGNAL.signal_id,
      signal_type: PATTERN_SIGNAL.signal_type,
      score: PATTERN_SIGNAL.linkt_score,
      entity: 'Anthropic',
      summary: PATTERN_SIGNAL.summary,
      pattern_hint: pattern ? {
        entity: 'Anthropic',
        total_signals: pattern.count,
        types: pattern.types.split(','),
      } : null,
    }));
  },

  // Step 4: War room — OpenAI acquires Windsurf (score 0.95)
  4() {
    const db = openDb();
    insertSignal(db, WARROOM_SIGNAL);

    // Restore real profile from backup
    let profileRestored = false;
    try {
      const backup = db.prepare('SELECT data FROM _demo_profile_backup LIMIT 1').get();
      if (backup && backup.data) {
        const p = JSON.parse(backup.data);
        db.prepare(`UPDATE user_profile SET
          icp_id = ?, task_id = ?, schedule_id = ?,
          interests_raw = ?, interests_json = ?,
          user_name = ?, user_location = ?, user_timezone = ?,
          negative_filters = ?, quiet_hours_enabled = ?,
          telegram_chat_id = ?, updated_at = datetime('now')
          WHERE id = 1`).run(
          p.icp_id, p.task_id, p.schedule_id,
          p.interests_raw, p.interests_json,
          p.user_name, p.user_location, p.user_timezone,
          p.negative_filters, p.quiet_hours_enabled,
          p.telegram_chat_id
        );
        db.prepare('DROP TABLE IF EXISTS _demo_profile_backup').run();
        profileRestored = true;
      }
    } catch (_) { /* backup table might not exist */ }

    db.close();
    console.log(JSON.stringify({
      step: 4, action: 'inject_signal',
      signal_id: WARROOM_SIGNAL.signal_id,
      signal_type: WARROOM_SIGNAL.signal_type,
      score: WARROOM_SIGNAL.linkt_score,
      entity: 'OpenAI, Windsurf',
      summary: WARROOM_SIGNAL.summary,
      war_room: true,
      profile_restored: profileRestored,
    }));
  },
};

// ── Dispatch ─────────────────────────────────────────────────────────
const step = parseInt(args['step'] ?? '-1');
if (!steps[step]) {
  console.error(JSON.stringify({
    error: `Unknown step: ${step}`,
    available: Object.keys(steps).map(Number),
    usage: 'node demo-mode.mjs --step <0-4>',
  }));
  process.exit(1);
}

steps[step]();
