# Linkt.ai API Quick Reference

## SDK
TypeScript: `@linkt/sdk`
```javascript
import Linkt from '@linkt/sdk';
const client = new Linkt({ apiKey: process.env.LINKT_API_KEY });
```

## Endpoints

### ICP (Ideal Customer Profile)
- `POST /v1/icp` — Create (required: `name`, `description`, `entity_targets`)
- `GET /v1/icp` — List all ICPs
- `GET /v1/icp/{id}` — Retrieve single ICP
- `PUT /v1/icp/{id}` — Update (optional: `name`, `description`, `entity_targets`)
- `DELETE /v1/icp/{id}` — Delete ICP

```javascript
const icp = await client.icp.create({
  name: 'Profile Name',
  description: 'Description of monitoring interests',
  entity_targets: [{ description: 'Company Name', entity_type: 'company' }],
});

const updated = await client.icp.update(icp.id, { name: 'New Name' });
```

### Tasks (Monitoring Configuration)
- `POST /v1/task` — Create task
- `GET /v1/task` — List tasks
- `GET /v1/task/{id}` — Retrieve task
- `PUT /v1/task/{id}` — Update task
- `DELETE /v1/task/{id}` — Delete task
- `POST /v1/task/{id}/execute` — Execute task

```javascript
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

const exec = await client.task.execute(task.id);
const updated = await client.task.update(task.id, { ...data });
```

### Signals
- `GET /v1/signal` — List signals (paginated)
- `GET /v1/signal/{id}` — Retrieve single signal

**Query params for list:**
| Param | Type | Description |
|-------|------|-------------|
| `icp_id` | string | Filter by ICP |
| `entity_id` | string | Filter by entity |
| `signal_type` | string | Filter by type |
| `strength` | string | Filter by strength |
| `search_term` | string | Text search |
| `days` | integer (1-90) | Lookback period (default: 30) |
| `page` | integer | Page number |
| `page_size` | integer | Results per page |
| `sort_by` | string | Sort field |
| `order` | string | Sort order (asc/desc) |

**Note:** There is NO `created_after` parameter. Use `days` instead.

```javascript
const response = await client.signal.list({
  icp_id: 'icp_xyz789',
  page: 1,
  page_size: 50,
  days: 7,
});
// response.signals[], response.total
```

### Sheets
- `POST /v1/sheet` — Create sheet
- `GET /v1/sheet` — List sheets
- `GET /v1/sheet/{id}` — Retrieve sheet
- `PUT /v1/sheet/{id}` — Update sheet
- `DELETE /v1/sheet/{id}` — Delete sheet

### Schedules
- `POST /v1/schedule` — Create (required: `name`, `task_id`, `icp_id`, `cron_expression`; optional: `description`, `parameters`)
- `GET /v1/schedule` — List schedules
- `GET /v1/schedule/{id}` — Retrieve schedule
- `PATCH /v1/schedule/{id}` — Update schedule
- `DELETE /v1/schedule/{id}` — Delete schedule

**Note:** There is NO `frequency` parameter. Use `cron_expression` instead.

```javascript
const schedule = await client.schedule.create({
  name: 'Daily Monitor',
  task_id: 'task_id',
  icp_id: 'icp_id',
  cron_expression: '0 8 * * *',
});
```

### Runs
- `GET /v1/run` — List runs
- `POST /v1/run` — Create run
- `GET /v1/run/{id}` — Retrieve run
- `DELETE /v1/run/{id}` — Delete run
- `POST /v1/run/{id}/cancel` — Cancel run
- `GET /v1/run/{id}/queue` — Get run queue

### Entities
```javascript
const entities = await client.entity.list({
  icp_id: 'icp_xyz789',
  page: 1,
  page_size: 20,
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
