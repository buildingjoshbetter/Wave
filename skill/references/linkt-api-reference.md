# Linkt.ai API Quick Reference

## SDK
TypeScript: `@linkt/sdk`
```javascript
import Linkt from '@linkt/sdk';
const client = new Linkt({ apiKey: process.env.LINKT_API_KEY });
```

## Key Methods

### ICP (Ideal Customer Profile)
```javascript
// Create
const icp = await client.icp.create({
  name: 'Profile Name',
  description: 'Description of monitoring interests',
  entity_targets: [{ description: 'Company Name', entity_type: 'company' }],
});
// icp.id -> "icp_xyz789"
```

### Tasks (Monitoring Configuration)
```javascript
// Create monitoring task
const task = await client.task.create({
  icp_id: 'icp_xyz789',
  flow_name: 'signal',
  task_config: {
    type: 'signal-topic',
    topic_criteria: 'Natural language description...',
    signal_types: [{ type: 'funding', display: 'Funding', description: '' }],
    monitoring_frequency: 'daily',
    industry_filters: ['artificial_intelligence'],
    geographic_filters: ['United States'],
  },
});

// Execute task
const exec = await client.task.execute(task.id);
```

### Signals
```javascript
// List (paginated)
const response = await client.signal.list({
  icp_id: 'icp_xyz789',
  page: 1,
  page_size: 50,
  created_after: '2026-02-13T00:00:00Z',
});
// response.signals[], response.total

// Retrieve single
const signal = await client.signal.retrieve('sig_abc123');
```

### Entities
```javascript
const entities = await client.entity.list({
  icp_id: 'icp_xyz789',
  page: 1,
  page_size: 20,
});
// entities[].id, entities[].data.name
```

### Schedules
```javascript
const schedule = await client.schedule.create({
  task_id: 'task_id',
  frequency: 'daily',
});
```

## Signal Response Format
```json
{
  "id": "sig_abc123",
  "created_at": "2026-02-13T14:30:00Z",
  "icp_id": "icp_xyz789",
  "entity_ids": ["ent_001"],
  "summary": "Human-readable signal description",
  "signal_type": "product_launch",
  "score": 0.87,
  "strength": "high",
  "references": ["https://source-url.com/article"]
}
```

## Available Signal Types
funding, leadership_change, layoff, product_launch, partnership,
acquisition, expansion, award, pivot, regulatory, rfp,
contract_renewal, hiring_surge, infrastructure, compliance,
job_posting, other

## Error Handling
- SDK auto-retries: 3 attempts for 429, 408, 409, 500+
- Exponential backoff with jitter
- Timeout: 30 seconds per request
- Error types: APIConnectionError, RateLimitError, InternalServerError

## Entity Response Format
```json
{
  "id": "ent_001",
  "entity_type": "company",
  "data": { "name": "Anthropic" },
  "status": "new",
  "icp_id": "icp_xyz789"
}
```
