#!/usr/bin/env node
// health-check.mjs - Validate and self-heal the Wave pipeline
// Usage: node health-check.mjs [--repair] [--quiet]
// --repair: attempt automatic fixes (default: report only)
// --quiet: only output final JSON summary

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'wave.db');
const LINKT_CLIENT = join(__dirname, 'linkt-client.mjs');

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

const REPAIR = args['repair'] === 'true';

const results = {
  timestamp: new Date().toISOString(),
  overall: 'healthy',
  checks: [],
  repairs: [],
};

function addCheck(name, status, message, details = {}) {
  results.checks.push({ name, status, message, ...details });
  if (status === 'fail') results.overall = 'broken';
  else if (status === 'warn' && results.overall !== 'broken') results.overall = 'degraded';
}

function addRepair(name, action, success, message) {
  results.repairs.push({ name, action, success, message });
}

function runLinkt(cmdArgs, timeout = 30_000) {
  return execFileSync('node', [LINKT_CLIENT, ...cmdArgs], {
    encoding: 'utf-8',
    timeout,
    env: process.env,
  });
}

// ── Check 1: LINKT_API_KEY ──────────────────────────────────
function checkApiKey() {
  const key = process.env.LINKT_API_KEY;
  if (!key) {
    addCheck('api_key', 'fail', 'LINKT_API_KEY is not set in environment', {
      resolution: 'Add LINKT_API_KEY to openclaw.json under skills.entries.wave.env'
    });
    return false;
  }
  if (!key.startsWith('sk-')) {
    addCheck('api_key', 'warn', 'LINKT_API_KEY does not start with "sk-" -- may be invalid', {
      resolution: 'Verify the API key at https://app.linkt.ai/settings/api-keys'
    });
    return true;
  }
  addCheck('api_key', 'pass', 'LINKT_API_KEY is set');
  return true;
}

// ── Check 2: Database and profile ───────────────────────────
function checkDatabase() {
  if (!existsSync(DB_PATH)) {
    addCheck('database', 'fail', `Database not found at ${DB_PATH}`, {
      resolution: 'Run: node scripts/feedback-store.mjs init'
    });
    if (REPAIR) {
      try {
        mkdirSync(dirname(DB_PATH), { recursive: true });
        execFileSync('node', [join(__dirname, 'feedback-store.mjs'), 'init'], {
          encoding: 'utf-8', timeout: 10_000, env: process.env,
        });
        addRepair('database', 'init', true, 'Database initialized');
      } catch (err) {
        addRepair('database', 'init', false, `Init failed: ${err.message}`);
        return { exists: false, profile: null };
      }
    } else {
      return { exists: false, profile: null };
    }
  }

  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch (err) {
    addCheck('database', 'fail', `Cannot open database: ${err.message}`);
    return { exists: false, profile: null };
  }

  addCheck('database', 'pass', 'Database exists and is readable');

  let profile;
  try {
    profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  } catch (err) {
    addCheck('profile_table', 'fail', `user_profile table error: ${err.message}`);
    db.close();
    return { exists: true, profile: null };
  }

  if (!profile) {
    addCheck('profile', 'fail', 'No user profile found. Onboarding not completed.', {
      resolution: 'Send "set up wave" in Telegram to start onboarding'
    });
    db.close();
    return { exists: true, profile: null };
  }

  if (!profile.icp_id) {
    addCheck('profile_icp', 'fail', 'Profile exists but icp_id is null', {
      resolution: 'Re-run onboarding: set up wave'
    });
    db.close();
    return { exists: true, profile };
  }

  addCheck('profile', 'pass', `Profile: icp=${profile.icp_id}, task=${profile.task_id || 'null'}`);

  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM signals_seen').get();
    const recent = db.prepare("SELECT COUNT(*) as c FROM signals_seen WHERE received_at >= datetime('now', '-24 hours')").get();
    const realSignals = db.prepare("SELECT COUNT(*) as c FROM signals_seen WHERE signal_id NOT LIKE 'sig_seed_%' AND signal_id NOT LIKE 'sig_demo_%'").get();
    addCheck('signals', 'info', `Signals: ${total.c} total, ${realSignals.c} real, ${recent.c} last 24h`);
  } catch (_) { /* non-critical */ }

  db.close();
  return { exists: true, profile };
}

// ── Check 3: Validate ICP against Linkt API ─────────────────
function checkIcpValid(icpId) {
  if (!icpId) return false;
  try {
    const output = runLinkt(['get-icp', '--icp-id', icpId]);
    const icp = JSON.parse(output);
    if (icp.error) {
      addCheck('icp_valid', 'fail', `ICP ${icpId} error: ${icp.error}`, {
        resolution: 'ICP was deleted. Will attempt auto-repair.'
      });
      return false;
    }
    addCheck('icp_valid', 'pass', `ICP valid: "${icp.name || icpId}"`);
    return true;
  } catch (err) {
    const msg = err.stderr?.toString() || err.message || '';
    if (msg.includes('404') || msg.includes('NotFoundError') || msg.includes('not found')
        || msg.includes('400') || msg.includes('Invalid ICP ID') || msg.includes('BadRequestError')) {
      addCheck('icp_valid', 'fail', `ICP ${icpId} is invalid or deleted`, {
        resolution: 'Will attempt auto-repair by finding a valid ICP'
      });
      return false;
    }
    addCheck('icp_valid', 'warn', `Cannot validate ICP: ${msg.slice(0, 200)}`);
    return true; // assume valid on network error
  }
}

// ── Check 4: Auto-repair ICP ────────────────────────────────
function repairIcp() {
  if (!REPAIR) {
    addRepair('icp', 'skip', false, 'Run with --repair to auto-fix');
    return null;
  }
  try {
    const output = runLinkt(['list-icps']);
    const icpList = JSON.parse(output);
    const icps = icpList.icps || icpList.items || icpList.data || [];
    if (icps.length === 0) {
      addRepair('icp', 'find_replacement', false, 'No ICPs in Linkt account. Re-run onboarding.');
      return null;
    }

    // Pick the most recent ICP (first in list, sorted by created_at desc)
    const newIcp = icps[0];
    const newIcpId = newIcp.id;

    // Check it actually has signals or a task
    let hasSignals = false;
    try {
      const sigOutput = runLinkt(['list-signals', '--icp-id', newIcpId, '--since', '7d']);
      const sigs = JSON.parse(sigOutput);
      hasSignals = (sigs.total || sigs.signals?.length || 0) > 0;
    } catch (_) {}

    // If the first ICP has no signals, try to find one that does
    if (!hasSignals && icps.length > 1) {
      for (const icp of icps.slice(1)) {
        try {
          const sigOutput = runLinkt(['list-signals', '--icp-id', icp.id, '--since', '7d']);
          const sigs = JSON.parse(sigOutput);
          if ((sigs.total || sigs.signals?.length || 0) > 0) {
            // Found one with signals — use this instead
            const db = new Database(DB_PATH);
            db.pragma('journal_mode = WAL');
            db.prepare(`UPDATE user_profile SET icp_id = ?, updated_at = datetime('now') WHERE id = 1`).run(icp.id);
            db.close();
            addRepair('icp', 'update_profile', true, `Switched to ICP ${icp.id} ("${icp.name}") which has signals`);
            return icp.id;
          }
        } catch (_) {}
      }
    }

    // Update profile with the best ICP we found
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.prepare(`UPDATE user_profile SET icp_id = ?, updated_at = datetime('now') WHERE id = 1`).run(newIcpId);
    db.close();
    addRepair('icp', 'update_profile', true, `Updated profile to ICP ${newIcpId} ("${newIcp.name}")`);
    return newIcpId;
  } catch (err) {
    addRepair('icp', 'find_replacement', false, `Failed: ${err.message}`);
    return null;
  }
}

// ── Check 5: Validate task ──────────────────────────────────
function checkTaskValid(taskId) {
  if (!taskId) {
    addCheck('task_valid', 'warn', 'No task_id in profile');
    return false;
  }
  try {
    const output = runLinkt(['get-task', '--task-id', taskId]);
    const task = JSON.parse(output);
    if (task.error) {
      addCheck('task_valid', 'fail', `Task ${taskId}: ${task.error}`);
      return false;
    }
    addCheck('task_valid', 'pass', `Task valid: "${task.name || taskId}"`);
    return true;
  } catch (err) {
    const msg = err.stderr?.toString() || err.message || '';
    if (msg.includes('404') || msg.includes('400') || msg.includes('Invalid') || msg.includes('BadRequestError')) {
      addCheck('task_valid', 'fail', `Task ${taskId} is invalid or not found`);
      return false;
    }
    addCheck('task_valid', 'warn', `Cannot validate task: ${msg.slice(0, 150)}`);
    return true;
  }
}

// ── Check 6: Check for signals ──────────────────────────────
function checkSignals(icpId) {
  if (!icpId) return;
  try {
    const output = runLinkt(['list-signals', '--icp-id', icpId, '--since', '7d']);
    const sigs = JSON.parse(output);
    const count = sigs.total || sigs.signals?.length || 0;
    if (count === 0) {
      addCheck('linkt_signals', 'warn', 'No signals from Linkt in the last 7 days', {
        resolution: 'A signal run may need to be triggered, or the monitoring task needs more time'
      });
    } else {
      addCheck('linkt_signals', 'pass', `${count} signal(s) available from Linkt in the last 7 days`);
    }
  } catch (err) {
    addCheck('linkt_signals', 'warn', `Could not check signals: ${(err.message || '').slice(0, 100)}`);
  }
}

// ── Main ────────────────────────────────────────────────────
const hasKey = checkApiKey();
const { exists: dbExists, profile } = checkDatabase();

if (hasKey && dbExists && profile && profile.icp_id) {
  let activeIcpId = profile.icp_id;
  let icpValid = checkIcpValid(activeIcpId);

  if (!icpValid) {
    const newId = repairIcp();
    if (newId) {
      activeIcpId = newId;
      icpValid = checkIcpValid(newId);
      // If repair succeeded, downgrade overall from 'broken' to 'degraded'
      if (icpValid && results.overall === 'broken') {
        results.overall = 'degraded';
      }
    }
  }

  if (icpValid) {
    checkTaskValid(profile.task_id);
    checkSignals(activeIcpId);
  }
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.overall === 'broken' ? 1 : 0);
