-- Wave Demo Seed Data
-- Run against the skill's SQLite DB before demo
-- These represent signals that "arrived" over the past 10 days

-- Seed pattern signals for Anthropic (supports pattern detection demo)
INSERT OR IGNORE INTO signals_seen
  (signal_id, icp_id, signal_type, entity_ids, entity_names, summary,
   linkt_score, strength, references_json, status, created_at, received_at)
VALUES
  ('sig_seed_001', 'demo', 'expansion',
   '["ent_anthropic"]', '["Anthropic"]',
   'Anthropic signs 50,000 sq ft office lease in downtown Austin',
   0.72, 'medium', '["https://example.com/anthropic-austin"]',
   'sent', datetime('now', '-10 days'), datetime('now', '-10 days')),

  ('sig_seed_002', 'demo', 'hiring_surge',
   '["ent_anthropic"]', '["Anthropic"]',
   'Anthropic posts 30+ engineering roles with Austin, TX location',
   0.68, 'medium', '["https://example.com/anthropic-hiring"]',
   'sent', datetime('now', '-7 days'), datetime('now', '-7 days')),

  ('sig_seed_003', 'demo', 'partnership',
   '["ent_anthropic"]', '["Anthropic"]',
   'Anthropic partners with Oracle for dedicated cloud infrastructure',
   0.75, 'medium', '["https://example.com/anthropic-oracle"]',
   'sent', datetime('now', '-3 days'), datetime('now', '-3 days'));

-- Ensure quiet hours don't suppress demo notifications
-- (VPS timezone may differ from venue timezone)
INSERT OR REPLACE INTO user_profile (id, icp_id, quiet_hours_enabled)
VALUES (1, 'demo', 0);
