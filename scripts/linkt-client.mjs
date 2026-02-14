#!/usr/bin/env node
// linkt-client.mjs - Linkt.ai SDK wrapper for Wave
// Usage: node linkt-client.mjs <command> [--flags]

import Linkt from '@linkt/sdk';

const client = new Linkt({
  apiKey: process.env.LINKT_API_KEY,
  maxRetries: 3,
  timeout: 30_000,
});

const commands = {
  // ── ICP Creation ──────────────────────────────────────────────────
  async 'create-icp'(args) {
    const data = JSON.parse(args.data);
    const response = await client.icp.create({
      name: data.name || 'Wave Profile',
      description: data.description,
      entity_targets: (data.companies || []).map(c => ({
        description: c,
        entity_type: 'company',
      })),
      mode: 'monitoring',
    });
    console.log(JSON.stringify({ icp_id: response.id }));
  },

  // ── Task Creation (Signal Topic Monitoring) ───────────────────────
  async 'create-task'(args) {
    const topicCriteria = args['topic'] || args['topic-criteria'];
    const taskConfig = {
      type: 'signal-topic',
      topic_criteria: topicCriteria,
      signal_types: (args['signal-types'] || 'funding,product_launch,acquisition,leadership_change,hiring_surge,partnership,expansion')
        .split(',')
        .map(t => {
          const type = t.trim();
          const descriptions = {
            funding: 'Investment rounds, grants, capital raises, and debt financing',
            product_launch: 'New products, features, major updates, and platform expansions',
            acquisition: 'Mergers, acquisitions, and asset purchases',
            leadership_change: 'CEO, executive, and board-level personnel changes',
            hiring_surge: 'Unusual hiring activity, large hiring announcements, department buildouts',
            partnership: 'Strategic alliances, integrations, and co-marketing agreements',
            expansion: 'Geographic expansion, new office openings, new market entry',
            layoff: 'Workforce reductions, restructuring, and hiring freezes',
            award: 'Industry recognition, certifications, and analyst rankings',
            pivot: 'Business model changes and strategic direction shifts',
            regulatory: 'Compliance issues, legal matters, and regulatory actions',
            rfp: 'RFP issuance, vendor evaluations, and procurement processes',
            contract_renewal: 'Contract renewals, renegotiations, and vendor switches',
            infrastructure: 'Infrastructure changes, cloud migrations, and platform modernization',
            compliance: 'Compliance pressures, certifications, and audit requirements',
            job_posting: 'Individual job postings and senior position openings',
            other: 'Other significant business events',
          };
          return { type, display: type, description: descriptions[type] || `Monitor for ${type} events` };
        }),
      monitoring_frequency: args['frequency'] || 'daily',
      industry_filters: args['industries'] ? args['industries'].split(',') : [],
      geographic_filters: args['geo'] ? args['geo'].split(',') : [],
      company_size_filters: args['sizes'] ? args['sizes'].split(',') : [],
    };

    if (process.env.WAVE_WEBHOOK_URL) {
      taskConfig.webhook_url = process.env.WAVE_WEBHOOK_URL;
    }

    const response = await client.task.create({
      icp_id: args['icp-id'],
      flow_name: 'signal',
      name: args['name'] || 'Wave Signal Monitor',
      description: args['description'] || topicCriteria,
      deployment_name: args['deployment-name'] || 'main',
      task_config: taskConfig,
    });

    let execResponse;
    try {
      execResponse = await client.task.execute(response.id, {
        icp_id: args['icp-id'],
      });
    } catch (execErr) {
      // Task was created but execution failed — still return the task_id
      console.log(JSON.stringify({
        task_id: response.id,
        execution_error: execErr.message,
        status: 'task_created_execution_pending',
      }));
      return;
    }

    console.log(JSON.stringify({
      task_id: response.id,
      execution_id: execResponse.id || 'started',
      status: 'monitoring_active',
    }));
  },

  // ── ICP Update ────────────────────────────────────────────────────
  async 'update-icp'(args) {
    const data = JSON.parse(args.data);
    const updatePayload = {};
    if (data.name) updatePayload.name = data.name;
    if (data.description) updatePayload.description = data.description;
    if (data.companies) {
      updatePayload.entity_targets = data.companies.map(c => ({
        description: c,
        entity_type: 'company',
      }));
    }
    if (data.entity_targets) updatePayload.entity_targets = data.entity_targets;
    const response = await client.icp.update(args['icp-id'], updatePayload);
    console.log(JSON.stringify(response));
  },

  // ── Sheet Creation ─────────────────────────────────────────────────
  async 'create-sheet'(args) {
    const response = await client.sheet.create({
      icp_id: args['icp-id'],
      name: args['name'] || 'Wave Companies',
      description: args['description'] || 'Companies monitored by Wave',
      entity_type: args['entity-type'] || 'company',
    });
    console.log(JSON.stringify({ sheet_id: response.id }));
  },

  // ── Signal Listing (with pagination) ──────────────────────────────
  async 'list-signals'(args) {
    const allSignals = [];
    let page = 1;
    const pageSize = 50;
    const days = args['since'] ? parseDurationToDays(args['since']) : 30;

    while (true) {
      const response = await client.signal.list({
        icp_id: args['icp-id'],
        page,
        page_size: pageSize,
        days,
        ...(args['signal-type'] && { signal_type: args['signal-type'] }),
        ...(args['strength'] && { strength: args['strength'] }),
        ...(args['search-term'] && { search_term: args['search-term'] }),
        ...(args['sort-by'] && { sort_by: args['sort-by'] }),
        ...(args['order'] && { order: args['order'] }),
      });

      allSignals.push(...(response.signals || []));

      if (!response.signals || response.signals.length < pageSize || allSignals.length >= (response.total || Infinity)) {
        break;
      }
      page++;

      if (page > 5) break;
    }

    console.log(JSON.stringify({
      total: allSignals.length,
      signals: allSignals,
    }));
  },

  // ── Single Signal Retrieval ───────────────────────────────────────
  async 'get-signal'(args) {
    const response = await client.signal.retrieve(args['signal-id']);
    console.log(JSON.stringify(response));
  },

  // ── Entity Lookup ─────────────────────────────────────────────────
  async 'list-entities'(args) {
    const response = await client.entity.list({
      icp_id: args['icp-id'],
      page: parseInt(args['page'] || '1'),
      page_size: parseInt(args['page-size'] || '20'),
    });
    console.log(JSON.stringify(response));
  },

  // ── ICP Retrieval ────────────────────────────────────────────────
  async 'get-icp'(args) {
    const response = await client.icp.retrieve(args['icp-id']);
    console.log(JSON.stringify(response));
  },

  // ── ICP Listing ─────────────────────────────────────────────────
  async 'list-icps'(args) {
    const response = await client.icp.list({
      page: parseInt(args['page'] || '1'),
      page_size: parseInt(args['page-size'] || '20'),
    });
    console.log(JSON.stringify(response));
  },

  // ── Task Retrieval ──────────────────────────────────────────────
  async 'get-task'(args) {
    const response = await client.task.retrieve(args['task-id']);
    console.log(JSON.stringify(response));
  },

  // ── Schedule Listing ────────────────────────────────────────────
  async 'list-schedules'(args) {
    const response = await client.schedule.list({
      icp_id: args['icp-id'],
      page: parseInt(args['page'] || '1'),
      page_size: parseInt(args['page-size'] || '20'),
    });
    console.log(JSON.stringify(response));
  },

  // ── Schedule Creation ─────────────────────────────────────────────
  async 'create-schedule'(args) {
    const frequency = args['frequency'] || 'daily';
    const cronMap = {
      'daily': '0 8 * * *',
      'twice-daily': '0 8,20 * * *',
      'weekly': '0 8 * * 1',
      'hourly': '0 * * * *',
      'every-30m': '*/30 * * * *',
    };
    const cronExpr = args['cron'] || cronMap[frequency] || '0 8 * * *';

    const response = await client.schedule.create({
      name: args['name'] || 'Wave Signal Monitor Schedule',
      task_id: args['task-id'],
      icp_id: args['icp-id'],
      cron_expression: cronExpr,
    });
    console.log(JSON.stringify({ schedule_id: response.id }));
  },

  // ── Update Task ───────────────────────────────────────────────────
  async 'update-task'(args) {
    const data = JSON.parse(args['task-config'] || args.data || '{}');
    const response = await client.task.update(args['task-id'], data);
    console.log(JSON.stringify(response));
  },
};

// ── Duration to Days (integer 1-90) for Linkt API ────────────────────
function parseDurationToDays(str) {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 30;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm' || unit === 'h') return 1; // minimum 1 day
  if (unit === 'd') return Math.max(1, Math.min(90, val));
  return 30;
}

// ── Duration Parser (milliseconds, used by other scripts) ────────────
function parseDuration(str) {
  const match = str.match(/^(\d+)(h|d|m)$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  if (unit === 'm') return val * 60 * 1000;
  return val;
}

// ── CLI Argument Parsing & Dispatch ──────────────────────────────────
const command = process.argv[2];
if (!commands[command]) {
  console.error(JSON.stringify({
    error: `Unknown command: ${command}`,
    available: Object.keys(commands),
  }));
  process.exit(1);
}

const rawArgs = process.argv.slice(3);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    // Check if next token exists and is not a flag
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--')) {
      // Collect all tokens until the next --flag (handles long strings with spaces)
      const parts = [];
      while (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--')) {
        i++;
        parts.push(rawArgs[i]);
      }
      args[key] = parts.join(' ');
    } else {
      args[key] = 'true';
    }
  }
}

try {
  await commands[command](args);
} catch (err) {
  console.error(JSON.stringify({
    error: err.message,
    status: err.status || 'unknown',
    type: err.constructor.name,
  }));
  process.exit(1);
}
