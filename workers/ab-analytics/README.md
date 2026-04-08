# A/B analytics endpoint (Cloudflare Worker + D1)

## 1) Create D1 and apply schema

```bash
cd workers/ab-analytics
npx wrangler d1 create adacamp-ab-analytics
# вставьте database_id в wrangler.toml
npx wrangler d1 execute adacamp-ab-analytics --file=schema.sql
```

## 2) Deploy worker

```bash
cd workers/ab-analytics
npx wrangler deploy
```

## 3) Connect frontend

Add in runtime config:

```html
<script>
window.AC_NOTIFY_CONFIG = Object.assign(
  {
    leadEndpoint: "https://.../api/lead",
    abEventEndpoint: "https://adacamp-ab-analytics.<subdomain>.workers.dev/api/ab-event"
  },
  window.AC_NOTIFY_CONFIG || {}
);
</script>
```

## 4) Read summary

```bash
curl "https://adacamp-ab-analytics.<subdomain>.workers.dev/api/ab-event/summary?test_id=hero_primary_block_v1"
```

Additional SQL examples are in `queries.sql`.
