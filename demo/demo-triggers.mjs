#!/usr/bin/env node

/**
 * Wave Demo Trigger Script
 *
 * Runs on Josh's laptop (not projected).
 * Hotkeys inject pre-cached signals into the same pipeline
 * that handles live Linkt.ai signals.
 *
 * Usage: node demo-triggers.mjs
 * Keys: 1=chain, 2=pattern, 3=warroom, 4=briefing, r=repeat, q=quit
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// CONFIG -- update these before demo day
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || `${process.env.HOME}/.openclaw/skills/wave/data/wave.db`;

// Load cached signals
const CACHE_DIR = join(__dirname, 'demo-cache');
const SIGNALS = {
  chain_reaction: loadSignal('signal_chain.json'),
  pattern:        loadSignal('signal_pattern.json'),
  war_room:       loadSignal('signal_warroom.json'),
  briefing:       loadSignal('briefing_payload.json'),
};

// Delays per signal (milliseconds) -- tune for realism
const DELAYS = {
  chain_reaction: 2500,
  pattern:        3000,
  war_room:       2000,
  briefing:       1500,
};

let lastKey = null;

function loadSignal(filename) {
  try {
    return JSON.parse(readFileSync(join(CACHE_DIR, filename), 'utf8'));
  } catch (e) {
    console.warn(`[WARN] Could not load ${filename}: ${e.message}`);
    return null;
  }
}

async function injectSignal(key, delayMs) {
  const signal = SIGNALS[key];
  if (!signal) {
    console.error(`[ERROR] No cached signal for key: ${key}`);
    return;
  }

  console.log(`[TRIGGER] ${key} -- injecting in ${delayMs}ms...`);

  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

  try {
    // Briefing is special: prompt agent to run /radar-briefing flow
    // (don't inject a signal -- the briefing aggregates existing signals from SQLite)
    if (key === 'briefing') {
      execSync(`openclaw message send --channel internal --target wave \
        --message 'Generate morning briefing per /radar-briefing instructions. ICP ID: demo.'`);
      console.log(`[OK] ${key} -- agent prompted to generate briefing`);
      lastKey = key;
      return;
    }

    // Overwrite timestamp to NOW
    const payload = { ...signal };
    if (payload.created_at) payload.created_at = new Date().toISOString();

    // 1. Insert into SQLite (same as what polling would do)
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.prepare(`INSERT OR REPLACE INTO signals_seen
      (signal_id, icp_id, signal_type, entity_ids, entity_names, summary,
       linkt_score, strength, references_json, status, created_at, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, datetime('now'))`)
      .run(payload.id, payload.icp_id || 'demo', payload.signal_type,
        JSON.stringify(payload.entity_ids || []),
        JSON.stringify(payload.entity_names || []),
        payload.summary, payload.score, payload.strength,
        JSON.stringify(payload.references || []), payload.created_at);
    db.close();

    // 2. Prompt the agent to process the new signal
    execSync(`openclaw message send --channel internal --target wave \
      --message 'New signal detected: ${payload.id}. Process it per skill instructions and send to user.'`);

    console.log(`[OK] ${key} injected into DB + agent prompted`);
  } catch (e) {
    console.error(`[FAIL] Error injecting ${key}: ${e.message}`);
  }

  lastKey = key;
}

// Setup hotkey listener
readline.emitKeypresses(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

console.log('\n=== WAVE DEMO TRIGGERS ===');
console.log('1 = Chain Reaction');
console.log('2 = Pattern Detection');
console.log('3 = War Room');
console.log('4 = Morning Briefing');
console.log('r = Repeat last trigger');
console.log('q = Quit');
console.log('==================================\n');

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') process.exit(0);

  switch (key.name) {
    case '1': injectSignal('chain_reaction', DELAYS.chain_reaction); break;
    case '2': injectSignal('pattern', DELAYS.pattern); break;
    case '3': injectSignal('war_room', DELAYS.war_room); break;
    case '4': injectSignal('briefing', DELAYS.briefing); break;
    case 'r':
      if (lastKey) {
        console.log(`[REPEAT] Re-triggering: ${lastKey}`);
        injectSignal(lastKey, 1000);
      } else {
        console.log('[REPEAT] Nothing to repeat yet.');
      }
      break;
    case 'q':
      console.log('[EXIT] Demo triggers shutting down.');
      process.exit(0);
    default:
      break;
  }
});

process.stdin.resume();
